import { useMemo, useState } from 'react'
import {
  Archive,
  ArchiveRestore,
  History,
  Pencil,
  Search,
  ShieldAlert,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react'
import type {
  AuditEntry,
  Competition,
  Player,
  PlayerAvailability,
  PlayerPosition,
  PlayerRegistration,
  Team,
} from '@/types/domain'
import {
  AVAILABILITY_LABELS,
  PLAYER_POSITIONS,
  jerseyLabel,
} from '@/types/domain'
import { repositories } from '@/services/repositories'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/features/auth/AuthContext'
import { useTeamScope } from '@/features/teams/TeamScopeContext'
import { canManageRoster } from '@/features/auth/permissions'
import { recordAudit } from '@/services/audit/record'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Field } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { SkeletonCard } from '@/components/ui/skeleton'
import { Table, TableWrap, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { PlayerAvatar } from '@/components/stats/player-avatar'
import { useToast } from '@/components/ui/toast'
import { formatDateTime } from '@/utils/format'

interface RosterData {
  team: Team
  players: Player[]
  competitions: Competition[]
  registrations: PlayerRegistration[]
}

interface PlayerForm {
  firstName: string
  lastName: string
  studentNumber: string
  campus: 'Durban' | 'Midlands'
  jerseyNumber: string
  position: string
  secondaryPosition: string
  availability: PlayerAvailability
  registrationIds: string[]
}

const EMPTY_FORM: PlayerForm = {
  firstName: '',
  lastName: '',
  studentNumber: '',
  campus: 'Durban',
  jerseyNumber: '',
  position: '',
  secondaryPosition: '',
  availability: 'active',
  registrationIds: [],
}

const AVAILABILITY_TONE: Record<PlayerAvailability, 'success' | 'warning' | 'danger' | 'neutral'> = {
  active: 'success',
  unavailable: 'warning',
  injured: 'danger',
  inactive: 'neutral',
}

async function loadRoster(teamId: string): Promise<RosterData | null> {
  const [team, players, competitions, registrations] = await Promise.all([
    repositories.teams.getById(teamId),
    repositories.players.listByTeam(teamId),
    repositories.competitions.list(),
    repositories.registrations.listByTeam(teamId),
  ])
  if (!team) return null
  return { team, players, competitions, registrations }
}

function newPlayerId(teamId: string): string {
  const prefix = teamId === 'team-men' ? 'men' : 'women'
  return `${prefix}-${Date.now().toString(36)}`
}

export function ManagerRosterEditor() {
  const { teamId, loading: scopeLoading } = useTeamScope()
  const { user } = useAuth()
  const { toast } = useToast()
  const { data, loading, reload } = useAsync<RosterData | null>(
    () => (teamId ? loadRoster(teamId) : Promise.resolve(null)),
    [teamId],
  )

  const [query, setQuery] = useState('')
  const [availabilityFilter, setAvailabilityFilter] = useState('all')
  const [positionFilter, setPositionFilter] = useState('all')
  const [editing, setEditing] = useState<Player | 'new' | null>(null)
  const [form, setForm] = useState<PlayerForm>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [historyOf, setHistoryOf] = useState<Player | null>(null)
  const [history, setHistory] = useState<AuditEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [actionBusy, setActionBusy] = useState(false)

  const canEdit = Boolean(user && teamId && canManageRoster(user, teamId))

  const filtered = useMemo(() => {
    if (!data) return []
    const term = query.trim().toLowerCase()
    return data.players
      .filter((player) => (showArchived ? true : !player.archivedAt))
      .filter((player) => {
        const matchesQuery =
          !term ||
          `${player.firstName} ${player.lastName}`.toLowerCase().includes(term) ||
          (player.studentNumber ?? '').includes(term)
        const matchesAvailability =
          availabilityFilter === 'all' || player.availability === availabilityFilter
        const matchesPosition =
          positionFilter === 'all' ||
          player.position === positionFilter ||
          player.secondaryPosition === positionFilter
        return matchesQuery && matchesAvailability && matchesPosition
      })
      .sort((a, b) => {
        const aJersey = a.jerseyNumber ?? 999
        const bJersey = b.jerseyNumber ?? 999
        return aJersey - bJersey || a.lastName.localeCompare(b.lastName)
      })
  }, [data, query, availabilityFilter, positionFilter, showArchived])

  if (scopeLoading || loading) {
    return (
      <div className="space-y-4">
        <SkeletonCard lines={2} />
        <SkeletonCard lines={8} />
      </div>
    )
  }

  if (!data) {
    return (
      <EmptyState
        title="No team selected"
        description="Choose a team from the sidebar to manage its roster."
        icon={Users}
      />
    )
  }

  const { team, players, competitions, registrations } = data
  const assignedJerseys = players.filter((player) => player.jerseyNumber !== null).length
  const assignedPositions = players.filter((player) => player.position !== null).length
  const injured = players.filter((player) => player.availability === 'injured').length

  const openNew = () => {
    setEditing('new')
    setForm({
      ...EMPTY_FORM,
      registrationIds: competitions
        .filter((competition) => competition.seasonId === 'season-2026')
        .map((competition) => competition.id),
    })
    setFormError(null)
  }

  const openEdit = (player: Player) => {
    setEditing(player)
    setForm({
      firstName: player.firstName,
      lastName: player.lastName,
      studentNumber: player.studentNumber ?? '',
      campus: player.campus === 'Midlands' ? 'Midlands' : 'Durban',
      jerseyNumber: player.jerseyNumber === null ? '' : String(player.jerseyNumber),
      position: player.position ?? '',
      secondaryPosition: player.secondaryPosition ?? '',
      availability: player.availability,
      registrationIds: registrations
        .filter(
          (entry) => entry.playerId === player.id && entry.status === 'registered',
        )
        .map((entry) => entry.competitionId),
    })
    setFormError(null)
  }

  const openHistory = async (player: Player) => {
    setHistoryOf(player)
    setHistoryLoading(true)
    setHistory(await repositories.audit.listByEntity('player', player.id))
    setHistoryLoading(false)
  }

  const patchForm = (patch: Partial<PlayerForm>) =>
    setForm((current) => ({ ...current, ...patch }))

  const save = async () => {
    if (!user || !teamId || !editing) return
    setFormError(null)

    const firstName = form.firstName.trim()
    const lastName = form.lastName.trim()
    if (!firstName || !lastName) {
      setFormError('First name and last name are required.')
      return
    }
    if (!form.studentNumber.trim()) {
      setFormError('Student number is required. It is stored privately and never shown publicly.')
      return
    }
    const jerseyNumber = form.jerseyNumber.trim() === '' ? null : Number(form.jerseyNumber)
    if (
      jerseyNumber !== null &&
      (!Number.isInteger(jerseyNumber) || jerseyNumber < 0 || jerseyNumber > 99)
    ) {
      setFormError('Jersey numbers must be whole numbers between 0 and 99, or left blank.')
      return
    }
    if (
      jerseyNumber !== null &&
      players.some(
        (player) =>
          player.id !== (editing === 'new' ? null : editing.id) &&
          player.jerseyNumber === jerseyNumber,
      )
    ) {
      setFormError(
        `Jersey ${jerseyLabel(jerseyNumber)} is already assigned in ${team.shortName}. Choose another number.`,
      )
      return
    }
    if (form.position === '' && form.secondaryPosition !== '') {
      setFormError('Assign a primary position before adding a secondary position.')
      return
    }
    if (form.position !== '' && form.position === form.secondaryPosition) {
      setFormError('Secondary position must be different from the primary position.')
      return
    }

    setSaving(true)
    try {
      const position = (form.position || null) as PlayerPosition | null
      const secondaryPosition = (form.secondaryPosition || null) as PlayerPosition | null
      let player: Player

      if (editing === 'new') {
        player = await repositories.players.create({
          id: newPlayerId(teamId),
          teamId,
          firstName,
          lastName,
          studentNumber: form.studentNumber.trim(),
          campus: form.campus,
          jerseyNumber,
          position,
          secondaryPosition,
          availability: form.availability,
          isActive: true,
          publicVisible: true,
          registeredCompetitionIds: form.registrationIds,
          joinedAt: new Date().toISOString(),
        })
        await recordAudit({
          user,
          entityType: 'player',
          entityId: player.id,
          action: 'create',
          summary: `Added ${firstName} ${lastName} to ${team.shortName}. Jersey ${jerseyLabel(jerseyNumber)}, position ${position ?? 'unassigned'}.`,
          after: { firstName, lastName, jerseyNumber, position, availability: form.availability },
        })
        toast({ title: 'Player added', description: `${firstName} ${lastName} is now on the ${team.shortName} roster.`, tone: 'success' })
      } else {
        const before = {
          firstName: editing.firstName,
          lastName: editing.lastName,
          jerseyNumber: editing.jerseyNumber,
          position: editing.position,
          secondaryPosition: editing.secondaryPosition ?? null,
          availability: editing.availability,
        }
        const updated = await repositories.players.update(editing.id, {
          firstName,
          lastName,
          studentNumber: form.studentNumber.trim(),
          campus: form.campus,
          jerseyNumber,
          position,
          secondaryPosition,
          availability: form.availability,
        })
        if (!updated) throw new Error('That player could not be found.')
        player = updated
        const changes: string[] = []
        if (editing.jerseyNumber !== jerseyNumber) {
          changes.push(`jersey ${jerseyLabel(editing.jerseyNumber)} → ${jerseyLabel(jerseyNumber)}`)
        }
        if (editing.position !== position) {
          changes.push(`primary position ${editing.position ?? 'unassigned'} → ${position ?? 'unassigned'}`)
        }
        if ((editing.secondaryPosition ?? null) !== secondaryPosition) {
          changes.push(`secondary position ${editing.secondaryPosition ?? 'none'} → ${secondaryPosition ?? 'none'}`)
        }
        if (editing.availability !== form.availability) {
          changes.push(`availability ${editing.availability} → ${form.availability}`)
        }
        if (editing.firstName !== firstName || editing.lastName !== lastName) {
          changes.push('name corrected')
        }
        await recordAudit({
          user,
          entityType: 'player',
          entityId: editing.id,
          action: 'update',
          summary: changes.length
            ? `Updated ${firstName} ${lastName}: ${changes.join('; ')}.`
            : `Verified ${firstName} ${lastName}’s official record.`,
          before,
          after: {
            firstName,
            lastName,
            jerseyNumber,
            position,
            secondaryPosition,
            availability: form.availability,
          },
        })
        toast({ title: 'Player updated', description: `${firstName} ${lastName}’s official record has been saved.`, tone: 'success' })
      }

      // Competition registration is part of the same official record.
      const registrationChanges: string[] = []
      for (const competition of competitions) {
        const desired = form.registrationIds.includes(competition.id)
        const existing = registrations.find(
          (entry) => entry.playerId === player.id && entry.competitionId === competition.id,
        )
        if (desired && (!existing || existing.status !== 'registered')) {
          await repositories.registrations.register({
            id: existing?.id ?? `reg-${player.id}-${competition.id}`,
            playerId: player.id,
            teamId,
            competitionId: competition.id,
            seasonId: competition.seasonId,
            status: 'registered',
            registeredAt: new Date().toISOString(),
            registeredByUserId: user.id,
          })
          registrationChanges.push(`registered for ${competition.shortName}`)
        } else if (!desired && existing && existing.status === 'registered') {
          await repositories.registrations.update(existing.id, {
            status: 'withdrawn',
          })
          registrationChanges.push(`withdrawn from ${competition.shortName}`)
        }
      }
      if (registrationChanges.length) {
        await recordAudit({
          user,
          entityType: 'registration',
          entityId: player.id,
          action: 'update',
          summary: `${player.firstName} ${player.lastName}: ${registrationChanges.join('; ')}.`,
        })
      }
      await repositories.players.update(player.id, {
        registeredCompetitionIds: form.registrationIds,
      })

      setEditing(null)
      await reload()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not save the player.')
    } finally {
      setSaving(false)
    }
  }

  /**
   * Archive keeps the record and its history but removes the player from the
   * active roster and the public site. Restore reverses it.
   */
  const setArchived = async (player: Player, archived: boolean) => {
    if (!user || !canEdit) return
    setActionBusy(true)
    setFormError(null)
    try {
      await repositories.players.update(player.id, {
        archivedAt: archived ? new Date().toISOString() : null,
        archivedByUserId: archived ? user.id : undefined,
        isActive: !archived,
        publicVisible: !archived,
        availability: archived ? 'inactive' : 'active',
      })
      await recordAudit({
        user,
        entityType: 'player',
        entityId: player.id,
        action: 'update',
        summary: archived
          ? `Archived ${player.firstName} ${player.lastName} from ${team.shortName}.`
          : `Restored ${player.firstName} ${player.lastName} to the active ${team.shortName} roster.`,
        before: { archivedAt: player.archivedAt ?? null, isActive: player.isActive },
        after: { archived, isActive: !archived },
      })
      toast({
        title: archived ? 'Player archived' : 'Player restored',
        description: archived
          ? `${player.firstName} ${player.lastName} is off the active roster and the public site.`
          : `${player.firstName} ${player.lastName} is active again.`,
        tone: 'success',
      })
      setEditing(null)
      await reload()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not update the player.')
    } finally {
      setActionBusy(false)
    }
  }

  const deletePlayer = async (player: Player) => {
    if (!user || !canEdit) return
    setActionBusy(true)
    setFormError(null)
    try {
      await repositories.players.remove(player.id)
      await recordAudit({
        user,
        entityType: 'player',
        entityId: player.id,
        action: 'delete',
        summary: `Permanently removed ${player.firstName} ${player.lastName} from ${team.shortName}.`,
        before: {
          firstName: player.firstName,
          lastName: player.lastName,
          jerseyNumber: player.jerseyNumber,
        },
      })
      toast({
        title: 'Player deleted',
        description: `${player.firstName} ${player.lastName} was removed from the register.`,
        tone: 'success',
      })
      setEditing(null)
      setConfirmDelete(false)
      await reload()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not delete the player.')
    } finally {
      setActionBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Squad"
        title={`${team.shortName} roster`}
        description={`${players.length} registered players. Jersey numbers and positions start unassigned and must be verified by a team manager. Student numbers and campuses are private and never appear on the public site.`}
        actions={
          canEdit ? (
            <Button onClick={openNew}>
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              Add player
            </Button>
          ) : null
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ['Jersey numbers assigned', `${assignedJerseys}/${players.length}`],
          ['Primary positions set', `${assignedPositions}/${players.length}`],
          ['Unavailable or injured', String(injured)],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardContent className="p-4">
              <p className="stat-num text-xl text-ink">{value}</p>
              <p className="mt-0.5 text-[11px] uppercase tracking-wider text-ink-faint">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="grid gap-2 sm:grid-cols-[1fr_170px_150px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name or private student number"
                className="pl-9"
                aria-label="Search roster"
              />
            </div>
            <Select
              value={availabilityFilter}
              onValueChange={setAvailabilityFilter}
              label="Filter by availability"
              options={[
                { value: 'all', label: 'All availability' },
                ...Object.entries(AVAILABILITY_LABELS).map(([value, label]) => ({ value, label })),
              ]}
            />
            <Select
              value={positionFilter}
              onValueChange={setPositionFilter}
              label="Filter by position"
              options={[
                { value: 'all', label: 'All positions' },
                ...PLAYER_POSITIONS.map((position) => ({ value: position, label: position })),
                { value: 'unassigned', label: 'Unassigned' },
              ]}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-ink-faint">
              {filtered.length} of {players.length} players shown. Private fields are visible only inside this manager workspace.
            </p>
            <label className="flex cursor-pointer items-center gap-2 text-[11px] text-ink-muted">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[rgb(var(--color-accent))]"
                checked={showArchived}
                onChange={(event) => setShowArchived(event.target.checked)}
              />
              Show archived
            </label>
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          title="No players match"
          description="Try a different search, availability or position filter."
          icon={Search}
        />
      ) : (
        <>
          <div className="hidden md:block">
            <TableWrap>
              <Table>
                <THead>
                  <TR>
                    <TH>Player</TH>
                    <TH>Student no.</TH>
                    <TH>Campus</TH>
                    <TH>Jersey</TH>
                    <TH>Position</TH>
                    <TH>Availability</TH>
                    <TH>Registered</TH>
                    <TH><span className="sr-only">Actions</span></TH>
                  </TR>
                </THead>
                <TBody>
                  {filtered.map((player) => {
                    const registered = registrations.filter(
                      (entry) => entry.playerId === player.id && entry.status === 'registered',
                    )
                    return (
                      <TR key={player.id}>
                        <TD>
                          <div className="flex items-center gap-2.5">
                            <PlayerAvatar player={player} size="sm" />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-ink">
                                {player.firstName} {player.lastName}
                              </p>
                              <p className="text-[11px] text-ink-faint">
                                {player.photoUrl ? 'Photo on file' : 'Awaiting media portrait'}
                              </p>
                            </div>
                          </div>
                        </TD>
                        <TD>
                          <span className="font-mono text-xs">{player.studentNumber || '—'}</span>
                        </TD>
                        <TD>{player.campus || '—'}</TD>
                        <TD>
                          <span className="font-semibold text-ink">{jerseyLabel(player.jerseyNumber)}</span>
                        </TD>
                        <TD>
                          {player.position ? (
                            <span className="font-medium text-ink">
                              {player.position}
                              {player.secondaryPosition ? (
                                <span className="text-ink-faint"> / {player.secondaryPosition}</span>
                              ) : null}
                            </span>
                          ) : (
                            <span className="text-ink-faint">Unassigned</span>
                          )}
                        </TD>
                        <TD>
                          <Badge tone={AVAILABILITY_TONE[player.availability]}>
                            {AVAILABILITY_LABELS[player.availability]}
                          </Badge>
                        </TD>
                        <TD>
                          <span className="text-xs">
                            {registered.length
                              ? registered
                                  .map(
                                    (entry) =>
                                      competitions.find(
                                        (competition) => competition.id === entry.competitionId,
                                      )?.shortName ?? entry.competitionId,
                                  )
                                  .join(', ')
                              : 'Not registered'}
                          </span>
                        </TD>
                        <TD>
                          <div className="flex items-center gap-1">
                            {canEdit ? (
                              <Button variant="ghost" size="sm" onClick={() => openEdit(player)}>
                                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                                Edit
                              </Button>
                            ) : null}
                            <Button variant="ghost" size="sm" onClick={() => void openHistory(player)}>
                              <History className="h-3.5 w-3.5" aria-hidden="true" />
                              History
                            </Button>
                          </div>
                        </TD>
                      </TR>
                    )
                  })}
                </TBody>
              </Table>
            </TableWrap>
          </div>

          <div className="grid gap-3 md:hidden">
            {filtered.map((player) => {
              const registered = registrations.filter(
                (entry) => entry.playerId === player.id && entry.status === 'registered',
              )
              return (
                <Card key={player.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <PlayerAvatar player={player} size="lg" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-ink">
                            {player.firstName} {player.lastName}
                          </p>
                          <Badge tone={AVAILABILITY_TONE[player.availability]}>
                            {AVAILABILITY_LABELS[player.availability]}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-ink-muted">
                          {jerseyLabel(player.jerseyNumber)} · {player.position ?? 'Position unassigned'}
                          {player.secondaryPosition ? ` / ${player.secondaryPosition}` : ''}
                        </p>
                        <p className="mt-1 font-mono text-[11px] text-ink-faint">
                          {player.studentNumber || 'No student number'} · {player.campus || 'No campus'}
                        </p>
                        <p className="mt-1 text-[11px] text-ink-faint">
                          {registered.length
                            ? `Registered: ${registered.map((entry) => competitions.find((competition) => competition.id === entry.competitionId)?.shortName ?? entry.competitionId).join(', ')}`
                            : 'Not registered for a competition'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {canEdit ? (
                        <Button variant="secondary" size="sm" onClick={() => openEdit(player)}>
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                          Edit record
                        </Button>
                      ) : null}
                      <Button variant="ghost" size="sm" onClick={() => void openHistory(player)}>
                        <History className="h-3.5 w-3.5" aria-hidden="true" />
                        History
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}

      <div className="flex items-start gap-2 rounded-card border border-line bg-canvas/50 p-3">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
        <p className="text-[11px] leading-relaxed text-ink-faint">
          Official records can only be changed by a team manager. Coaches submit change requests for review.
          Residence data is never stored. Media managers own photography but cannot change jersey numbers,
          positions or official statistics.
        </p>
      </div>

      <Dialog open={editing !== null} onOpenChange={(open) => (!open ? setEditing(null) : undefined)}>
        {editing ? (
          <DialogContent
            title={editing === 'new' ? 'Add player' : 'Edit official record'}
            description={
              editing === 'new'
                ? `Add a player to ${team.shortName}. Leave jersey and position blank if they are not yet verified.`
                : `Changes are recorded in the audit trail with your name and the time.`
            }
            className="max-w-2xl"
            footer={
              <div className="flex w-full flex-wrap items-center justify-between gap-2">
                {editing !== 'new' && canEdit ? (
                  confirmDelete ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-ink-muted">Delete permanently?</span>
                      <Button
                        variant="danger"
                        size="sm"
                        disabled={actionBusy}
                        onClick={() => void deletePlayer(editing)}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Confirm delete
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                        Keep
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {editing.archivedAt ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={actionBusy}
                          onClick={() => void setArchived(editing, false)}
                        >
                          <ArchiveRestore className="h-3.5 w-3.5" aria-hidden="true" />
                          Restore
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={actionBusy}
                          onClick={() => void setArchived(editing, true)}
                        >
                          <Archive className="h-3.5 w-3.5" aria-hidden="true" />
                          Archive
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={actionBusy}
                        onClick={() => setConfirmDelete(true)}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Delete
                      </Button>
                    </div>
                  )
                ) : (
                  <span />
                )}
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setEditing(null)} disabled={saving}>
                    Cancel
                  </Button>
                  <Button onClick={() => void save()} disabled={saving}>
                    {saving ? 'Saving…' : editing === 'new' ? 'Add player' : 'Save changes'}
                  </Button>
                </div>
              </div>
            }
          >
            <div className="grid max-h-[65vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
              <Field label="First name" htmlFor="player-first-name">
                <Input
                  id="player-first-name"
                  value={form.firstName}
                  onChange={(event) => patchForm({ firstName: event.target.value })}
                  autoComplete="off"
                />
              </Field>
              <Field label="Last name" htmlFor="player-last-name">
                <Input
                  id="player-last-name"
                  value={form.lastName}
                  onChange={(event) => patchForm({ lastName: event.target.value })}
                  autoComplete="off"
                />
              </Field>
              <Field
                label="Student number (private)"
                htmlFor="player-student-number"
                hint="Stored internally. Never published."
              >
                <Input
                  id="player-student-number"
                  value={form.studentNumber}
                  onChange={(event) => patchForm({ studentNumber: event.target.value })}
                  inputMode="numeric"
                  autoComplete="off"
                />
              </Field>
              <Field label="Campus (private)" htmlFor="player-campus" hint="No residence data is stored.">
                <Select
                  value={form.campus}
                  onValueChange={(value) => patchForm({ campus: value as 'Durban' | 'Midlands' })}
                  label="Campus"
                  options={[
                    { value: 'Durban', label: 'Durban' },
                    { value: 'Midlands', label: 'Midlands' },
                  ]}
                />
              </Field>
              <Field
                label="Jersey number"
                htmlFor="player-jersey"
                hint="Blank means unassigned. Duplicate numbers are rejected."
              >
                <Input
                  id="player-jersey"
                  value={form.jerseyNumber}
                  onChange={(event) => patchForm({ jerseyNumber: event.target.value })}
                  inputMode="numeric"
                  placeholder="Unassigned"
                />
              </Field>
              <Field label="Primary position" htmlFor="player-position" hint="Blank means unassigned.">
                <Select
                  value={form.position || 'unassigned'}
                  onValueChange={(value) => patchForm({ position: value === 'unassigned' ? '' : value })}
                  label="Primary position"
                  options={[
                    { value: 'unassigned', label: 'Unassigned' },
                    ...PLAYER_POSITIONS.map((position) => ({ value: position, label: position })),
                  ]}
                />
              </Field>
              <Field label="Secondary position (optional)" htmlFor="player-secondary-position">
                <Select
                  value={form.secondaryPosition || 'none'}
                  onValueChange={(value) => patchForm({ secondaryPosition: value === 'none' ? '' : value })}
                  label="Secondary position"
                  options={[
                    { value: 'none', label: 'None' },
                    ...PLAYER_POSITIONS.map((position) => ({ value: position, label: position })),
                  ]}
                />
              </Field>
              <Field label="Availability" htmlFor="player-availability">
                <Select
                  value={form.availability}
                  onValueChange={(value) => patchForm({ availability: value as PlayerAvailability })}
                  label="Availability"
                  options={Object.entries(AVAILABILITY_LABELS).map(([value, label]) => ({
                    value,
                    label,
                  }))}
                />
              </Field>
              <div className="sm:col-span-2">
                <p className="mb-1.5 text-xs font-semibold text-ink-muted">Competition registration</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {competitions.map((competition) => (
                    <label
                      key={competition.id}
                      className="flex cursor-pointer items-start gap-2 rounded-control border border-line bg-canvas/40 p-2.5 text-xs"
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 accent-[rgb(var(--color-accent))]"
                        checked={form.registrationIds.includes(competition.id)}
                        onChange={(event) =>
                          patchForm({
                            registrationIds: event.target.checked
                              ? [...form.registrationIds, competition.id]
                              : form.registrationIds.filter((id) => id !== competition.id),
                          })
                        }
                      />
                      <span>
                        <span className="block font-semibold text-ink">{competition.shortName}</span>
                        <span className="block text-[11px] text-ink-faint">{competition.name}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <p className="sm:col-span-2 text-[11px] leading-relaxed text-ink-faint">
                Player profile photography is managed outside this roster workspace. Managers cannot edit official statistics, jersey numbers or positions through media tools.
              </p>
              {formError ? (
                <p className="sm:col-span-2 rounded-control border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger" role="alert">
                  {formError}
                </p>
              ) : null}
            </div>
          </DialogContent>
        ) : null}
      </Dialog>

      <Dialog open={historyOf !== null} onOpenChange={(open) => (!open ? setHistoryOf(null) : undefined)}>
        {historyOf ? (
          <DialogContent
            title={`${historyOf.firstName} ${historyOf.lastName} · change history`}
            description="Every official change is retained with the actor and timestamp."
            className="max-w-lg"
            footer={<Button variant="ghost" onClick={() => setHistoryOf(null)}>Close</Button>}
          >
            {historyLoading ? (
              <SkeletonCard lines={4} />
            ) : history.length === 0 ? (
              <p className="text-sm text-ink-muted">No recorded changes yet.</p>
            ) : (
              <ul className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
                {history.map((entry) => (
                  <li key={entry.id} className="rounded-control border border-line bg-canvas/40 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-ink">{entry.actorName}</span>
                      <span className="text-[11px] text-ink-faint">{formatDateTime(entry.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-ink-muted">{entry.summary}</p>
                    <Badge tone="neutral" className="mt-2">{entry.action}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  )
}
