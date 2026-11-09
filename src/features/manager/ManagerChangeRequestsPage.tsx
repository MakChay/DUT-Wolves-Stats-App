import { useMemo, useState } from 'react'
import { CheckCircle2, ClipboardCheck, Clock3, XCircle } from 'lucide-react'
import type {
  AuditEntry,
  Player,
  Team,
  TeamChangeRequest,
  User,
} from '@/types/domain'
import {
  CHANGE_REQUEST_LABELS,
  PLAYER_POSITIONS,
  jerseyLabel,
} from '@/types/domain'
import { repositories } from '@/services/repositories'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/features/auth/AuthContext'
import { useTeamScope } from '@/features/teams/TeamScopeContext'
import { canReviewChangeRequests } from '@/features/auth/permissions'
import { recordAudit } from '@/services/audit/record'
import { notifyUsers } from '@/services/notifications/notify'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { SkeletonCard } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { formatDateTime } from '@/utils/format'

interface RequestData {
  team: Team
  requests: TeamChangeRequest[]
  players: Player[]
  audit: AuditEntry[]
}

async function loadRequests(teamId: string): Promise<RequestData | null> {
  const [team, requests, players] = await Promise.all([
    repositories.teams.getById(teamId),
    repositories.changeRequests.listByTeam(teamId),
    repositories.players.listByTeam(teamId),
  ])
  if (!team) return null
  const audit = (
    await Promise.all(
      requests.map((request) =>
        repositories.audit.listByEntity('change_request', request.id),
      ),
    )
  ).flat()
  return { team, requests, players, audit }
}

const STATUS_TONE = {
  pending: 'warning',
  accepted: 'accent',
  rejected: 'danger',
  completed: 'success',
} as const

const STATUS_FILTERS = [
  { value: 'all', label: 'All requests' },
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'completed', label: 'Completed' },
] as const

function requestValue(request: TeamChangeRequest): string {
  if (request.type === 'add_player' && request.proposedPlayer) {
    return [request.proposedPlayer.firstName, request.proposedPlayer.lastName].filter(Boolean).join(' ')
  }
  if (request.type === 'remove_player') return 'Remove from active squad'
  return request.requestedValue || '—'
}

export function ManagerChangeRequestsPage() {
  const { teamId, loading: scopeLoading } = useTeamScope()
  const { user } = useAuth()
  const { toast } = useToast()
  const { data, loading, reload } = useAsync<RequestData | null>(
    () => (teamId ? loadRequests(teamId) : Promise.resolve(null)),
    [teamId],
  )
  const [statusFilter, setStatusFilter] = useState<string>('pending')
  const [selected, setSelected] = useState<TeamChangeRequest | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [busy, setBusy] = useState(false)

  const canReview = Boolean(user && teamId && canReviewChangeRequests(user, teamId))

  const filtered = useMemo(() => {
    if (!data) return []
    return statusFilter === 'all'
      ? data.requests
      : data.requests.filter((request) => request.status === statusFilter)
  }, [data, statusFilter])

  if (scopeLoading || loading) {
    return (
      <div className="space-y-4">
        <SkeletonCard lines={2} />
        <SkeletonCard lines={6} />
      </div>
    )
  }

  if (!data) {
    return <EmptyState title="No team selected" description="Choose a team to review change requests." icon={ClipboardCheck} />
  }

  if (!canReview) {
    return (
      <EmptyState
        title="Manager access required"
        description="Only the team manager for this team can review change requests."
        icon={ClipboardCheck}
      />
    )
  }

  const pendingCount = data.requests.filter((request) => request.status === 'pending').length

  const review = async (action: 'accept' | 'reject' | 'complete') => {
    if (!selected || !user || !teamId) return
    setBusy(true)
    try {
      const now = new Date().toISOString()
      const reviewed = await repositories.changeRequests.update(selected.id, {
        status: action === 'reject' ? 'rejected' : action === 'accept' ? 'accepted' : 'completed',
        reviewedByUserId: user.id,
        reviewedByName: user.displayName,
        reviewedAt: now,
        reviewNote: reviewNote.trim() || undefined,
        ...(action === 'complete' ? { completedAt: now } : {}),
      })
      if (!reviewed) throw new Error('Request could not be found.')

      if (action === 'complete') {
        await applyRequest(selected, data.players, user)
      }

      await recordAudit({
        user,
        entityType: 'change_request',
        entityId: selected.id,
        action: action === 'accept' ? 'accept' : action === 'reject' ? 'reject' : 'complete',
        summary:
          action === 'reject'
            ? `Rejected ${CHANGE_REQUEST_LABELS[selected.type].toLowerCase()} request from ${selected.submittedByName}${reviewNote.trim() ? `: ${reviewNote.trim()}` : '.'}`
            : action === 'accept'
              ? `Accepted ${CHANGE_REQUEST_LABELS[selected.type].toLowerCase()} request from ${selected.submittedByName}.`
              : `Completed ${CHANGE_REQUEST_LABELS[selected.type].toLowerCase()} request from ${selected.submittedByName} and applied the change.`,
        before: { status: selected.status },
        after: { status: reviewed.status },
      })

      await notifyUsers([selected.submittedByUserId], {
        kind: 'change_request',
        title:
          action === 'reject'
            ? 'Change request rejected'
            : action === 'accept'
              ? 'Change request accepted'
              : 'Change request completed',
        body:
          action === 'reject'
            ? `Your request for ${selected.playerName ?? 'a player'} was rejected by ${user.displayName}.${reviewNote.trim() ? ` Note: ${reviewNote.trim()}` : ''}`
            : action === 'accept'
              ? `Your request for ${selected.playerName ?? 'a player'} was accepted. It will be completed by the team manager.`
              : `Your request for ${selected.playerName ?? 'a player'} was completed and the official record updated.`,
        link: '/coach/requests',
      })

      toast({
        title:
          action === 'complete'
            ? 'Request completed'
            : action === 'accept'
              ? 'Request accepted'
              : 'Request rejected',
        description: 'The coach has been notified and the decision is in the audit trail.',
        tone: action === 'reject' ? 'info' : 'success',
      })
      setSelected(null)
      setReviewNote('')
      await reload()
    } catch (error) {
      toast({
        title: 'Could not update request',
        description: error instanceof Error ? error.message : 'Unknown error.',
        tone: 'error',
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Coach collaboration"
        title="Team change requests"
        description={`${pendingCount} pending. Coaches cannot edit official records; review each request, add a note, then accept, reject or apply the change.`}
        actions={
          <Select
            value={statusFilter}
            onValueChange={setStatusFilter}
            label="Filter requests"
            options={[...STATUS_FILTERS]}
            className="w-44"
          />
        }
      />

      {filtered.length === 0 ? (
        <EmptyState
          title={statusFilter === 'pending' ? 'No pending requests' : 'No requests in this view'}
          description="When a coach submits a change request it will appear here and trigger a manager notification."
          icon={ClipboardCheck}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((request) => {
            const audit = data.audit.filter(
              (entry) => entry.entityType === 'change_request' && entry.entityId === request.id,
            )
            return (
              <Card key={request.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="accent">{CHANGE_REQUEST_LABELS[request.type]}</Badge>
                        <Badge tone={STATUS_TONE[request.status]}>{request.status}</Badge>
                        <span className="text-[11px] text-ink-faint">
                          {formatDateTime(request.submittedAt)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-ink">
                        {request.playerName ?? requestValue(request)}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-ink-muted">{request.reason}</p>
                    </div>
                    <Button
                      size="sm"
                      variant={request.status === 'pending' ? 'primary' : 'secondary'}
                      onClick={() => {
                        setSelected(request)
                        setReviewNote(request.reviewNote ?? '')
                      }}
                    >
                      Review
                    </Button>
                  </div>

                  <dl className="grid gap-3 rounded-control border border-line bg-canvas/40 p-3 text-xs sm:grid-cols-3">
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">Current</dt>
                      <dd className="mt-0.5 font-medium text-ink">{request.currentValue ?? 'Unassigned'}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">Requested</dt>
                      <dd className="mt-0.5 font-medium text-ink">{requestValue(request)}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">Submitted by</dt>
                      <dd className="mt-0.5 font-medium text-ink">{request.submittedByName}</dd>
                    </div>
                  </dl>

                  {request.reviewNote ? (
                    <p className="text-[11px] text-ink-muted">
                      <span className="font-semibold text-ink">Manager note:</span> {request.reviewNote}
                    </p>
                  ) : null}

                  {audit.length ? (
                    <div className="border-t border-line pt-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">Audit trail</p>
                      <ul className="mt-1 space-y-1">
                        {audit.map((entry) => (
                          <li key={entry.id} className="text-[11px] text-ink-muted">
                            <span className="font-medium text-ink">{entry.actorName}</span> · {entry.summary}{' '}
                            <span className="text-ink-faint">({formatDateTime(entry.createdAt)})</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={selected !== null} onOpenChange={(open) => (!open ? setSelected(null) : undefined)}>
        {selected ? (
          <DialogContent
            title="Review change request"
            description={`${selected.submittedByName} · ${formatDateTime(selected.submittedAt)}`}
            className="max-w-lg"
            footer={
              <>
                <Button variant="ghost" onClick={() => setSelected(null)} disabled={busy}>
                  Cancel
                </Button>
                {selected.status === 'pending' ? (
                  <Button variant="secondary" onClick={() => void review('accept')} disabled={busy}>
                    <Clock3 className="h-4 w-4" aria-hidden="true" />
                    Accept
                  </Button>
                ) : null}
                <Button variant="danger" onClick={() => void review('reject')} disabled={busy}>
                  <XCircle className="h-4 w-4" aria-hidden="true" />
                  Reject
                </Button>
                <Button onClick={() => void review('complete')} disabled={busy}>
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  Apply &amp; complete
                </Button>
              </>
            }
          >
            <div className="space-y-3">
              <dl className="grid grid-cols-2 gap-3 rounded-control border border-line bg-canvas/40 p-3 text-xs">
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">Type</dt>
                  <dd className="mt-0.5 font-medium text-ink">{CHANGE_REQUEST_LABELS[selected.type]}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">Status</dt>
                  <dd className="mt-0.5"><Badge tone={STATUS_TONE[selected.status]}>{selected.status}</Badge></dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">Current</dt>
                  <dd className="mt-0.5 font-medium text-ink">{selected.currentValue ?? 'Unassigned'}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">Requested</dt>
                  <dd className="mt-0.5 font-medium text-ink">{requestValue(selected)}</dd>
                </div>
              </dl>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">Reason</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-muted">{selected.reason}</p>
              </div>
              <div>
                <label htmlFor="review-note" className="block text-xs font-semibold text-ink-muted">
                  Manager note (recorded in the audit trail)
                </label>
                <Input
                  id="review-note"
                  value={reviewNote}
                  onChange={(event) => setReviewNote(event.target.value)}
                  placeholder="Optional context for the coach"
                  className="mt-1.5"
                />
              </div>
              <p className="text-[11px] leading-relaxed text-ink-faint">
                Applying a request updates the official record and notifies the coach. Jersey duplicates are
                rejected even if a coach requested them.
              </p>
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  )
}

async function applyRequest(
  request: TeamChangeRequest,
  players: Player[],
  actor: User,
): Promise<void> {
  const player = request.playerId
    ? players.find((entry) => entry.id === request.playerId)
    : undefined

  if (request.type === 'add_player') {
    const proposed = request.proposedPlayer
    if (!proposed) throw new Error('This request does not include proposed player details.')
    const created = await repositories.players.create({
      id: `${request.teamId === 'team-men' ? 'men' : 'women'}-${Date.now().toString(36)}`,
      teamId: request.teamId,
      firstName: proposed.firstName,
      lastName: proposed.lastName,
      studentNumber: proposed.studentNumber ?? '',
      campus: proposed.campus ?? '',
      jerseyNumber: proposed.jerseyNumber ?? null,
      position: proposed.position ?? null,
      secondaryPosition: null,
      availability: 'active',
      isActive: true,
      publicVisible: true,
      registeredCompetitionIds: [],
      joinedAt: new Date().toISOString(),
    })
    await recordAudit({
      user: actor,
      entityType: 'player',
      entityId: created.id,
      action: 'create',
      summary: `Created ${created.firstName} ${created.lastName} from an approved coach request.`,
      after: { firstName: created.firstName, lastName: created.lastName },
    })
    return
  }

  if (!player) throw new Error('The player in this request could not be found.')

  if (request.type === 'remove_player') {
    await repositories.players.update(player.id, {
      isActive: false,
      availability: 'inactive',
    })
    await recordAudit({
      user: actor,
      entityType: 'player',
      entityId: player.id,
      action: 'update',
      summary: `Removed ${player.firstName} ${player.lastName} from the active squad following an approved request.`,
      before: { isActive: player.isActive, availability: player.availability },
      after: { isActive: false, availability: 'inactive' },
    })
    return
  }

  if (request.type === 'jersey_number') {
    const value = request.requestedValue.trim().replace(/^#/, '')
    const jerseyNumber = value === '' ? null : Number(value)
    if (jerseyNumber !== null && (!Number.isInteger(jerseyNumber) || jerseyNumber < 0 || jerseyNumber > 99)) {
      throw new Error('The requested jersey number is not valid.')
    }
    await repositories.players.update(player.id, { jerseyNumber })
    await recordAudit({
      user: actor,
      entityType: 'player',
      entityId: player.id,
      action: 'assign',
      summary: `Assigned jersey ${jerseyLabel(jerseyNumber)} to ${player.firstName} ${player.lastName}.`,
      before: { jerseyNumber: player.jerseyNumber },
      after: { jerseyNumber },
    })
    return
  }

  if (request.type === 'position') {
    const [primary, secondary] = request.requestedValue
      .split('/')
      .map((value) => value.trim().toUpperCase())
    const valid = (value: string | undefined): value is (typeof PLAYER_POSITIONS)[number] =>
      Boolean(value && (PLAYER_POSITIONS as string[]).includes(value))
    if (!valid(primary)) throw new Error('The requested position is not valid.')
    const secondaryPosition = valid(secondary) ? secondary : null
    await repositories.players.update(player.id, {
      position: primary,
      secondaryPosition,
    })
    await recordAudit({
      user: actor,
      entityType: 'player',
      entityId: player.id,
      action: 'update',
      summary: `Set ${player.firstName} ${player.lastName} to ${primary}${secondaryPosition ? ` / ${secondaryPosition}` : ''}.`,
      before: { position: player.position, secondaryPosition: player.secondaryPosition ?? null },
      after: { position: primary, secondaryPosition },
    })
    return
  }

  if (request.type === 'availability' || request.type === 'injury_status') {
    const value = request.requestedValue.trim().toLowerCase()
    const allowed = ['active', 'unavailable', 'injured', 'inactive']
    if (!allowed.includes(value)) throw new Error('The requested availability value is not valid.')
    await repositories.players.update(player.id, {
      availability: value as Player['availability'],
    })
    await recordAudit({
      user: actor,
      entityType: 'player',
      entityId: player.id,
      action: 'update',
      summary: `Set ${player.firstName} ${player.lastName} availability to ${value}.`,
      before: { availability: player.availability },
      after: { availability: value },
    })
    return
  }

  await recordAudit({
    user: actor,
    entityType: 'change_request',
    entityId: request.id,
    action: 'complete',
    summary: `Completed general correction request from ${request.submittedByName}: ${request.requestedValue}`,
  })
}
