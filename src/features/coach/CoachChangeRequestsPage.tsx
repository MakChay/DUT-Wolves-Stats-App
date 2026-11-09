import { useMemo, useState } from 'react'
import { ClipboardList, Plus, Send } from 'lucide-react'
import type {
  ChangeRequestType,
  Player,
  Team,
  TeamChangeRequest,
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
import { recordAudit } from '@/services/audit/record'
import { managerIdsForTeam, notifyUsers } from '@/services/notifications/notify'
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

interface CoachRequestData {
  team: Team
  players: Player[]
  requests: TeamChangeRequest[]
}

async function loadCoachRequests(teamId: string, userId: string): Promise<CoachRequestData | null> {
  const [team, players, requests] = await Promise.all([
    repositories.teams.getById(teamId),
    repositories.players.listByTeam(teamId),
    repositories.changeRequests.listBySubmitter(userId),
  ])
  if (!team) return null
  return { team, players, requests }
}

const STATUS_TONE = {
  pending: 'warning',
  accepted: 'accent',
  rejected: 'danger',
  completed: 'success',
} as const

const REQUEST_TYPES: ChangeRequestType[] = [
  'add_player',
  'remove_player',
  'jersey_number',
  'position',
  'availability',
  'injury_status',
  'general_correction',
]

interface RequestForm {
  type: ChangeRequestType
  playerId: string
  requestedValue: string
  secondaryPosition: string
  reason: string
  firstName: string
  lastName: string
  studentNumber: string
  campus: 'Durban' | 'Midlands'
  proposedJersey: string
  proposedPosition: string
}

const EMPTY_FORM: RequestForm = {
  type: 'jersey_number',
  playerId: '',
  requestedValue: '',
  secondaryPosition: '',
  reason: '',
  firstName: '',
  lastName: '',
  studentNumber: '',
  campus: 'Durban',
  proposedJersey: '',
  proposedPosition: '',
}

export function CoachChangeRequestsPage() {
  const { teamId, loading: scopeLoading } = useTeamScope()
  const { user } = useAuth()
  const { toast } = useToast()
  const { data, loading, reload } = useAsync<CoachRequestData | null>(
    () => (teamId && user ? loadCoachRequests(teamId, user.id) : Promise.resolve(null)),
    [teamId, user?.id],
  )
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<RequestForm>(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const player = useMemo(
    () => data?.players.find((entry) => entry.id === form.playerId),
    [data, form.playerId],
  )

  if (scopeLoading || loading) {
    return (
      <div className="space-y-4">
        <SkeletonCard lines={2} />
        <SkeletonCard lines={6} />
      </div>
    )
  }

  if (!data || !user) {
    return <EmptyState title="No team assigned" description="Ask an administrator to assign you to a team." icon={ClipboardList} />
  }

  const openForm = () => {
    setForm(EMPTY_FORM)
    setError(null)
    setOpen(true)
  }

  const patch = (value: Partial<RequestForm>) => setForm((current) => ({ ...current, ...value }))

  const currentValue = (() => {
    if (form.type === 'add_player' || !player) return null
    if (form.type === 'jersey_number') return jerseyLabel(player.jerseyNumber)
    if (form.type === 'position') {
      return player.position
        ? `${player.position}${player.secondaryPosition ? ` / ${player.secondaryPosition}` : ''}`
        : 'Unassigned'
    }
    if (form.type === 'availability' || form.type === 'injury_status') return player.availability
    if (form.type === 'remove_player') return player.isActive ? 'Active squad' : 'Already inactive'
    return 'Correction requested'
  })()

  const submit = async () => {
    if (!teamId) return
    setError(null)
    if (form.type !== 'add_player' && !form.playerId) {
      setError('Choose the player this request relates to.')
      return
    }
    if (!form.reason.trim()) {
      setError('Explain why this change is needed so the manager can review it.')
      return
    }

    let requestedValue = form.requestedValue.trim()
    if (form.type === 'add_player') {
      if (!form.firstName.trim() || !form.lastName.trim()) {
        setError('First name and last name are required for a new player request.')
        return
      }
      requestedValue = `${form.firstName.trim()} ${form.lastName.trim()}`
    }
    if (form.type === 'position') {
      if (!form.requestedValue) {
        setError('Choose the requested primary position.')
        return
      }
      requestedValue = form.secondaryPosition
        ? `${form.requestedValue} / ${form.secondaryPosition}`
        : form.requestedValue
    }
    if (!requestedValue && form.type !== 'remove_player') {
      setError('Enter the requested value.')
      return
    }
    if (form.type === 'remove_player') requestedValue = 'Remove from active squad'

    setSaving(true)
    try {
      const now = new Date().toISOString()
      const proposedJersey = form.proposedJersey.trim() === '' ? null : Number(form.proposedJersey)
      const request = await repositories.changeRequests.create({
        id: `req-${Date.now().toString(36)}`,
        teamId,
        type: form.type,
        playerId: form.type === 'add_player' ? undefined : form.playerId,
        playerName:
          form.type === 'add_player'
            ? `${form.firstName.trim()} ${form.lastName.trim()}`
            : player
              ? `${player.firstName} ${player.lastName}`
              : undefined,
        currentValue,
        requestedValue,
        reason: form.reason.trim(),
        submittedByUserId: user.id,
        submittedByName: user.displayName,
        submittedAt: now,
        status: 'pending',
        managerNotifiedAt: now,
        proposedPlayer:
          form.type === 'add_player'
            ? {
                firstName: form.firstName.trim(),
                lastName: form.lastName.trim(),
                studentNumber: form.studentNumber.trim() || undefined,
                campus: form.campus,
                jerseyNumber:
                  proposedJersey !== null && Number.isFinite(proposedJersey) ? proposedJersey : null,
                position: (form.proposedPosition || null) as Player['position'],
              }
            : undefined,
      })

      await recordAudit({
        user,
        entityType: 'change_request',
        entityId: request.id,
        action: 'submit',
        summary: `Submitted a ${CHANGE_REQUEST_LABELS[form.type].toLowerCase()} request for ${request.playerName ?? 'a player'}.`,
        after: { requestedValue, currentValue },
      })

      await notifyUsers(managerIdsForTeam(data.team), {
        kind: 'change_request',
        title: 'New change request',
        body: `${user.displayName} requested ${CHANGE_REQUEST_LABELS[form.type].toLowerCase()} for ${request.playerName ?? 'a player'}.`,
        link: '/manager/requests',
      })

      toast({
        title: 'Request submitted',
        description: 'The team manager has been notified. Track the decision below.',
        tone: 'success',
      })
      setOpen(false)
      await reload()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not submit the request.')
    } finally {
      setSaving(false)
    }
  }

  const pending = data.requests.filter((request) => request.status === 'pending').length

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Official records"
        title="Change requests"
        description={`Coaches cannot edit official records directly. Submit a request and track the manager’s decision. ${pending} pending.`}
        actions={
          <Button onClick={openForm}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New request
          </Button>
        }
      />

      <div className="flex items-start gap-2 rounded-card border border-line bg-canvas/50 p-3">
        <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
        <p className="text-[11px] leading-relaxed text-ink-faint">
          Requests cover jersey numbers, positions, availability, injury status, squad changes and general
          corrections. The team manager must accept and apply each change. Every step is audited with the
          submitter, reviewer and timestamp.
        </p>
      </div>

      {data.requests.length === 0 ? (
        <EmptyState
          title="No requests yet"
          description="Submit your first request to correct or update an official team record."
          icon={ClipboardList}
        />
      ) : (
        <div className="space-y-3">
          {data.requests.map((request) => (
            <Card key={request.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="accent">{CHANGE_REQUEST_LABELS[request.type]}</Badge>
                    <Badge tone={STATUS_TONE[request.status]}>{request.status}</Badge>
                  </div>
                  <span className="text-[11px] text-ink-faint">{formatDateTime(request.submittedAt)}</span>
                </div>
                <p className="text-sm font-semibold text-ink">{request.playerName ?? 'Team request'}</p>
                <p className="text-xs text-ink-muted">
                  <span className="text-ink-faint">Current:</span> {request.currentValue ?? 'Unassigned'} ·{' '}
                  <span className="text-ink-faint">Requested:</span>{' '}
                  <span className="font-medium text-ink">{request.requestedValue}</span>
                </p>
                <p className="text-xs leading-relaxed text-ink-muted">{request.reason}</p>
                {request.reviewNote ? (
                  <p className="rounded-control border border-line bg-canvas/40 p-2 text-xs text-ink-muted">
                    <span className="font-semibold text-ink">{request.reviewedByName ?? 'Manager'} note:</span>{' '}
                    {request.reviewNote}
                  </p>
                ) : null}
                {request.reviewedAt ? (
                  <p className="text-[11px] text-ink-faint">
                    Reviewed by {request.reviewedByName} · {formatDateTime(request.reviewedAt)}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          title="New team change request"
          description={`For ${data.team.shortName}. The manager will review this before any official record changes.`}
          className="max-w-xl"
          footer={
            <>
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={() => void submit()} disabled={saving}>
                <Send className="h-4 w-4" aria-hidden="true" />
                {saving ? 'Submitting…' : 'Submit request'}
              </Button>
            </>
          }
        >
          <div className="grid max-h-[65vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="request-type" className="block text-xs font-semibold text-ink-muted">
                Request type
              </label>
              <Select
                value={form.type}
                onValueChange={(value) =>
                  patch({ type: value as ChangeRequestType, requestedValue: '', secondaryPosition: '' })
                }
                label="Request type"
                options={REQUEST_TYPES.map((type) => ({
                  value: type,
                  label: CHANGE_REQUEST_LABELS[type],
                }))}
                className="mt-1.5 w-full"
              />
            </div>

            {form.type !== 'add_player' ? (
              <div className="sm:col-span-2">
                <label htmlFor="request-player" className="block text-xs font-semibold text-ink-muted">
                  Player
                </label>
                <Select
                  value={form.playerId}
                  onValueChange={(value) => patch({ playerId: value })}
                  label="Player"
                  placeholder="Choose a player"
                  options={data.players.map((entry) => ({
                    value: entry.id,
                    label: `${jerseyLabel(entry.jerseyNumber)} ${entry.firstName} ${entry.lastName}`,
                  }))}
                  className="mt-1.5 w-full"
                />
              </div>
            ) : (
              <>
                <div>
                  <label htmlFor="proposed-first" className="block text-xs font-semibold text-ink-muted">
                    First name
                  </label>
                  <Input id="proposed-first" className="mt-1.5" value={form.firstName} onChange={(event) => patch({ firstName: event.target.value })} />
                </div>
                <div>
                  <label htmlFor="proposed-last" className="block text-xs font-semibold text-ink-muted">
                    Last name
                  </label>
                  <Input id="proposed-last" className="mt-1.5" value={form.lastName} onChange={(event) => patch({ lastName: event.target.value })} />
                </div>
                <div>
                  <label htmlFor="proposed-student" className="block text-xs font-semibold text-ink-muted">
                    Student number (private, optional)
                  </label>
                  <Input id="proposed-student" className="mt-1.5" value={form.studentNumber} onChange={(event) => patch({ studentNumber: event.target.value })} inputMode="numeric" />
                </div>
                <div>
                  <label htmlFor="proposed-campus" className="block text-xs font-semibold text-ink-muted">
                    Campus (private)
                  </label>
                  <Select
                    value={form.campus}
                    onValueChange={(value) => patch({ campus: value as 'Durban' | 'Midlands' })}
                    label="Campus"
                    options={[
                      { value: 'Durban', label: 'Durban' },
                      { value: 'Midlands', label: 'Midlands' },
                    ]}
                    className="mt-1.5 w-full"
                  />
                </div>
                <div>
                  <label htmlFor="proposed-jersey" className="block text-xs font-semibold text-ink-muted">
                    Proposed jersey (optional)
                  </label>
                  <Input id="proposed-jersey" className="mt-1.5" value={form.proposedJersey} onChange={(event) => patch({ proposedJersey: event.target.value })} inputMode="numeric" placeholder="Unassigned" />
                </div>
                <div>
                  <label htmlFor="proposed-position" className="block text-xs font-semibold text-ink-muted">
                    Proposed position (optional)
                  </label>
                  <Select
                    value={form.proposedPosition || 'unassigned'}
                    onValueChange={(value) => patch({ proposedPosition: value === 'unassigned' ? '' : value })}
                    label="Proposed position"
                    options={[
                      { value: 'unassigned', label: 'Unassigned' },
                      ...PLAYER_POSITIONS.map((position) => ({ value: position, label: position })),
                    ]}
                    className="mt-1.5 w-full"
                  />
                </div>
              </>
            )}

            {form.type === 'jersey_number' ? (
              <div className="sm:col-span-2">
                <label htmlFor="requested-jersey" className="block text-xs font-semibold text-ink-muted">
                  Requested jersey number
                </label>
                <Input id="requested-jersey" className="mt-1.5" value={form.requestedValue} onChange={(event) => patch({ requestedValue: event.target.value })} inputMode="numeric" placeholder="e.g. 7" />
              </div>
            ) : null}

            {form.type === 'position' ? (
              <>
                <div>
                  <label htmlFor="requested-position" className="block text-xs font-semibold text-ink-muted">
                    Requested primary position
                  </label>
                  <Select
                    value={form.requestedValue || 'unassigned'}
                    onValueChange={(value) => patch({ requestedValue: value === 'unassigned' ? '' : value })}
                    label="Requested primary position"
                    options={[
                      { value: 'unassigned', label: 'Choose…' },
                      ...PLAYER_POSITIONS.map((position) => ({ value: position, label: position })),
                    ]}
                    className="mt-1.5 w-full"
                  />
                </div>
                <div>
                  <label htmlFor="requested-secondary" className="block text-xs font-semibold text-ink-muted">
                    Requested secondary (optional)
                  </label>
                  <Select
                    value={form.secondaryPosition || 'none'}
                    onValueChange={(value) => patch({ secondaryPosition: value === 'none' ? '' : value })}
                    label="Requested secondary position"
                    options={[
                      { value: 'none', label: 'None' },
                      ...PLAYER_POSITIONS.map((position) => ({ value: position, label: position })),
                    ]}
                    className="mt-1.5 w-full"
                  />
                </div>
              </>
            ) : null}

            {form.type === 'availability' || form.type === 'injury_status' ? (
              <div className="sm:col-span-2">
                <label htmlFor="requested-availability" className="block text-xs font-semibold text-ink-muted">
                  Requested status
                </label>
                <Select
                  value={form.requestedValue || 'active'}
                  onValueChange={(value) => patch({ requestedValue: value })}
                  label="Requested status"
                  options={[
                    { value: 'active', label: 'Active' },
                    { value: 'unavailable', label: 'Unavailable' },
                    { value: 'injured', label: 'Injured' },
                    { value: 'inactive', label: 'Inactive' },
                  ]}
                  className="mt-1.5 w-full"
                />
              </div>
            ) : null}

            {form.type === 'general_correction' ? (
              <div className="sm:col-span-2">
                <label htmlFor="requested-correction" className="block text-xs font-semibold text-ink-muted">
                  Requested correction
                </label>
                <Input id="requested-correction" className="mt-1.5" value={form.requestedValue} onChange={(event) => patch({ requestedValue: event.target.value })} placeholder="Describe the corrected value" />
              </div>
            ) : null}

            <div className="sm:col-span-2">
              <label htmlFor="request-reason" className="block text-xs font-semibold text-ink-muted">
                Reason
              </label>
              <textarea
                id="request-reason"
                value={form.reason}
                onChange={(event) => patch({ reason: event.target.value })}
                rows={3}
                className="mt-1.5 w-full rounded-control border border-line bg-canvas/60 px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/30"
                placeholder="Explain why the official record should change."
              />
            </div>

            {currentValue ? (
              <p className="sm:col-span-2 text-[11px] text-ink-faint">
                Current official value: <span className="font-medium text-ink-muted">{currentValue}</span>
              </p>
            ) : null}
            {error ? (
              <p className="sm:col-span-2 rounded-control border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
