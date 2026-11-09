import { useState } from 'react'
import { Pencil, ShieldCheck } from 'lucide-react'
import type { Team } from '@/types/domain'
import { jerseyLabel } from '@/types/domain'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PlayerAvatar } from '@/components/stats/player-avatar'
import { EmptyState } from '@/components/ui/empty-state'
import { SkeletonCard } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input, Field } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { useAdminData } from '@/features/admin/useAdminData'
import { useAuth } from '@/features/auth/AuthContext'
import { repositories } from '@/services/repositories'
import { recordAudit } from '@/services/audit/record'

interface TeamForm {
  name: string
  shortName: string
  description: string
  homeVenue: string
  managerId: string
  coachIds: string[]
  publicVisible: boolean
}

const EMPTY_FORM: TeamForm = {
  name: '',
  shortName: '',
  description: '',
  homeVenue: '',
  managerId: '',
  coachIds: [],
  publicVisible: true,
}

export function AdminTeamsPage() {
  const { data, loading, error, reload } = useAdminData()
  const { user } = useAuth()
  const { toast } = useToast()
  const [editing, setEditing] = useState<Team | null>(null)
  const [form, setForm] = useState<TeamForm>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonCard lines={2} />
        <div className="grid gap-4 lg:grid-cols-2">
          <SkeletonCard lines={8} />
          <SkeletonCard lines={8} />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Teams could not be loaded"
        description={error}
        action={<Button onClick={reload}>Try again</Button>}
      />
    )
  }

  if (!data) return null

  const dutTeams = data.teams.filter((team) => team.id === 'team-men' || team.id === 'team-women')
  const managerOptions = data.users
    .filter((entry) => entry.role === 'manager' || entry.role === 'admin')
    .map((entry) => ({ value: entry.id, label: `${entry.displayName} · ${entry.role}` }))
  const coachOptions = data.users.filter((entry) => entry.role === 'coach')

  const openEdit = (team: Team) => {
    setEditing(team)
    setForm({
      name: team.name,
      shortName: team.shortName,
      description: team.description ?? '',
      homeVenue: team.homeVenue ?? '',
      managerId: team.managerId,
      coachIds: team.coachIds,
      publicVisible: team.publicVisible,
    })
    setFormError(null)
  }

  const save = async () => {
    if (!user || user.role !== 'admin' || !editing) return
    setFormError(null)
    if (!form.name.trim() || !form.shortName.trim()) {
      setFormError('Enter a team name and short name.')
      return
    }
    if (!form.managerId) {
      setFormError('Assign a team manager.')
      return
    }
    setBusy(true)
    try {
      const updated = await repositories.teams.update(editing.id, {
        name: form.name.trim(),
        shortName: form.shortName.trim(),
        description: form.description.trim() || undefined,
        homeVenue: form.homeVenue.trim() || undefined,
        managerId: form.managerId,
        coachIds: form.coachIds,
        publicVisible: form.publicVisible,
      })
      if (!updated) throw new Error('The team could not be found.')

      // Keep each staff member's Firebase profile team scope in sync with the
      // team document, otherwise their role would not grant them access.
      const previousStaff = new Set([editing.managerId, ...editing.coachIds].filter(Boolean))
      const nextStaff = new Set([form.managerId, ...form.coachIds].filter(Boolean))
      const scopeUpdates = new Map<string, string[]>()
      for (const staffId of nextStaff) {
        const staff = data.users.find((entry) => entry.id === staffId)
        if (!staff || staff.role === 'admin') continue
        scopeUpdates.set(staffId, [...new Set([...staff.teamIds, editing.id])])
      }
      for (const staffId of previousStaff) {
        if (nextStaff.has(staffId)) continue
        const staff = data.users.find((entry) => entry.id === staffId)
        if (!staff || staff.role === 'admin') continue
        scopeUpdates.set(staffId, staff.teamIds.filter((teamId) => teamId !== editing.id))
      }
      await Promise.all(
        [...scopeUpdates.entries()].map(([staffId, teamIds]) =>
          repositories.users.update(staffId, { teamIds }),
        ),
      )

      await recordAudit({
        user,
        entityType: 'team',
        entityId: editing.id,
        action: 'update',
        summary: `Updated ${updated.name} staff and visibility.`,
        before: {
          managerId: editing.managerId,
          coachIds: editing.coachIds,
          publicVisible: editing.publicVisible,
        },
        after: {
          managerId: updated.managerId,
          coachIds: updated.coachIds,
          publicVisible: updated.publicVisible,
        },
      })
      toast({
        title: 'Team updated',
        description: `${updated.shortName} staff and visibility saved.`,
        tone: 'success',
      })
      setEditing(null)
      await reload()
    } catch (saveError) {
      setFormError(saveError instanceof Error ? saveError.message : 'Could not save the team.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Teams"
        title="Team administration"
        description="Assign each DUT Wolves squad a manager and coaching staff, and control whether the team appears publicly."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {dutTeams.map((team) => {
          const manager = data.users.find((entry) => entry.id === team.managerId)
          const coaches = data.users.filter((entry) => team.coachIds.includes(entry.id))
          const players = data.players.filter((player) => player.teamId === team.id)
          const matches = data.matches.filter(
            (match) => match.homeTeamId === team.id || match.awayTeamId === team.id,
          )

          return (
            <Card key={team.id}>
              <CardHeader>
                <div>
                  <CardTitle>{team.name}</CardTitle>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {players.length} players · {matches.length} fixtures · {coaches.length} coaches
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge tone={team.publicVisible ? 'success' : 'neutral'}>
                    {team.publicVisible ? 'Public' : 'Hidden'}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(team)}>
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-3">
                <div className="rounded-control border border-line px-3 py-2">
                  <p className="label-caps">Team manager</p>
                  <p className="mt-0.5 text-sm font-medium text-ink">{manager?.displayName ?? 'Unassigned'}</p>
                  <p className="text-[11px] text-ink-faint">{manager?.email ?? '—'}</p>
                </div>

                <div>
                  <p className="label-caps mb-1.5">Coaching staff</p>
                  {coaches.length === 0 ? (
                    <p className="text-xs text-ink-faint">No coaches assigned.</p>
                  ) : (
                    <ul className="space-y-1">
                      {coaches.map((coach) => (
                        <li
                          key={coach.id}
                          className="flex items-center justify-between gap-3 rounded-control border border-line/70 px-2.5 py-1.5"
                        >
                          <span className="text-xs text-ink">{coach.displayName}</span>
                          <span className="text-[10px] uppercase tracking-wider text-ink-faint">Coach</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <p className="label-caps mb-1.5">Active roster</p>
                  <div className="grid grid-cols-2 gap-1">
                    {players.slice(0, 8).map((player) => (
                      <div
                        key={player.id}
                        className="flex items-center gap-2 rounded-control border border-line/70 px-2 py-1.5"
                      >
                        <PlayerAvatar player={player} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-medium text-ink">
                            {player.firstName} {player.lastName}
                          </p>
                          <p className="text-[9px] uppercase text-ink-faint">
                            {jerseyLabel(player.jerseyNumber)} · {player.position ?? 'Unassigned'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {players.length > 8 ? (
                    <p className="mt-1 text-[11px] text-ink-faint">+{players.length - 8} more players</p>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <p className="text-[11px] leading-relaxed text-ink-faint">
        Opponent teams are registered for fixtures and standings. They do not have manager or coach accounts
        linked to this workspace.
      </p>

      <Dialog open={editing !== null} onOpenChange={(open) => (!open && !busy ? setEditing(null) : undefined)}>
        {editing ? (
          <DialogContent
            title={`Edit ${editing.shortName}`}
            description="Assign the official team manager and coaching staff. Changes are recorded in the audit trail."
            className="max-w-lg"
            footer={
              <>
                <Button variant="ghost" onClick={() => setEditing(null)} disabled={busy}>Cancel</Button>
                <Button onClick={() => void save()} disabled={busy}>
                  {busy ? 'Saving…' : 'Save team'}
                </Button>
              </>
            }
          >
            <div className="grid max-h-[65vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
              <Field label="Team name" htmlFor="team-name">
                <Input
                  id="team-name"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                />
              </Field>
              <Field label="Short name" htmlFor="team-short">
                <Input
                  id="team-short"
                  value={form.shortName}
                  onChange={(event) => setForm({ ...form, shortName: event.target.value })}
                />
              </Field>
              <Field label="Team manager" htmlFor="team-manager">
                <Select
                  label="Team manager"
                  value={form.managerId}
                  onValueChange={(value) => setForm({ ...form, managerId: value })}
                  options={managerOptions}
                  className="w-full"
                />
              </Field>
              <Field label="Home venue" htmlFor="team-venue">
                <Input
                  id="team-venue"
                  value={form.homeVenue}
                  onChange={(event) => setForm({ ...form, homeVenue: event.target.value })}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Description" htmlFor="team-description">
                  <Input
                    id="team-description"
                    value={form.description}
                    onChange={(event) => setForm({ ...form, description: event.target.value })}
                  />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <p className="mb-1.5 text-xs font-semibold text-ink-muted">Coaching staff</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {coachOptions.map((coach) => (
                    <label
                      key={coach.id}
                      className="flex cursor-pointer items-center gap-2 rounded-control border border-line bg-canvas/40 px-2.5 py-2 text-xs"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[rgb(var(--color-accent))]"
                        checked={form.coachIds.includes(coach.id)}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            coachIds: event.target.checked
                              ? [...form.coachIds, coach.id]
                              : form.coachIds.filter((id) => id !== coach.id),
                          })
                        }
                      />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-ink">{coach.displayName}</span>
                        <span className="block truncate text-[10px] text-ink-faint">{coach.email}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <label className="sm:col-span-2 flex cursor-pointer items-center gap-2 text-xs text-ink-muted">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[rgb(var(--color-accent))]"
                  checked={form.publicVisible}
                  onChange={(event) => setForm({ ...form, publicVisible: event.target.checked })}
                />
                Show this team on the public site
              </label>
              {formError ? (
                <p className="sm:col-span-2 text-xs text-danger" role="alert">{formError}</p>
              ) : null}
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  )
}
