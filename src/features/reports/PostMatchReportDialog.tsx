import { useMemo, useState } from 'react'
import { AlertTriangle, ClipboardCheck, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import type {
  InjuryEntry,
  Match,
  Player,
  PostMatchTeamReport,
  Team,
} from '@/types/domain'
import { jerseyLabel } from '@/types/domain'
import { repositories } from '@/services/repositories'
import { useAuth } from '@/features/auth/AuthContext'
import { recordAudit } from '@/services/audit/record'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input, Field } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { formatDateTime, uid } from '@/utils/format'
import { syncMatchAdminComplete } from './reporting'

interface InjuryDraft {
  id: string
  playerId: string
  description: string
  period: number
  timeLabel: string
  continuedPlaying: boolean
  substitutedDueToInjury: boolean
  medicalAttention: boolean
  followUpNotes: string
}

function emptyInjury(): InjuryDraft {
  return {
    id: uid('injury'),
    playerId: '',
    description: '',
    period: 1,
    timeLabel: '',
    continuedPlaying: false,
    substitutedDueToInjury: false,
    medicalAttention: false,
    followUpNotes: '',
  }
}

function toDraft(injury: InjuryEntry): InjuryDraft {
  return {
    id: injury.id,
    playerId: injury.playerId,
    description: injury.description,
    period: injury.period,
    timeLabel: injury.timeLabel,
    continuedPlaying: injury.continuedPlaying,
    substitutedDueToInjury: injury.substitutedDueToInjury,
    medicalAttention: injury.medicalAttention,
    followUpNotes: injury.followUpNotes ?? '',
  }
}

export interface PostMatchReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  match: Match
  team: Team
  /** The team squad, used for the injury player picker. */
  players: Player[]
  existing: PostMatchTeamReport | null
  onSubmitted: (match: Match | null) => void
}

export function PostMatchReportDialog({
  open,
  onOpenChange,
  match,
  team,
  players,
  existing,
  onSubmitted,
}: PostMatchReportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <PostMatchReportForm
          match={match}
          team={team}
          players={players}
          existing={existing}
          onCancel={() => onOpenChange(false)}
          onSubmitted={(updated) => {
            onOpenChange(false)
            onSubmitted(updated)
          }}
        />
      ) : null}
    </Dialog>
  )
}

function PostMatchReportForm({
  match,
  team,
  players,
  existing,
  onCancel,
  onSubmitted,
}: {
  match: Match
  team: Team
  players: Player[]
  existing: PostMatchTeamReport | null
  onCancel: () => void
  onSubmitted: (match: Match | null) => void
}) {
  const { user } = useAuth()
  const { toast } = useToast()
  const amending = Boolean(existing)

  const [injuryAnswer, setInjuryAnswer] = useState<'' | 'yes' | 'no'>(
    existing ? (existing.injuriesReported ? 'yes' : 'no') : '',
  )
  const [injuries, setInjuries] = useState<InjuryDraft[]>(() =>
    existing ? existing.injuries.map(toDraft) : [],
  )
  const [notes, setNotes] = useState(existing?.additionalNotes ?? '')
  const [noInjuriesConfirmed, setNoInjuriesConfirmed] = useState(
    existing?.noInjuriesConfirmed ?? false,
  )
  const [amendmentReason, setAmendmentReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const squadOptions = useMemo(
    () =>
      [...players]
        .sort((a, b) => (a.jerseyNumber ?? 999) - (b.jerseyNumber ?? 999))
        .map((player) => ({
          value: player.id,
          label: `${jerseyLabel(player.jerseyNumber)} ${player.firstName} ${player.lastName}`,
        })),
    [players],
  )

  const patchInjury = (id: string, patch: Partial<InjuryDraft>) =>
    setInjuries((current) =>
      current.map((injury) => (injury.id === id ? { ...injury, ...patch } : injury)),
    )

  const addInjury = () => setInjuries((current) => [...current, emptyInjury()])

  const removeInjury = (id: string) =>
    setInjuries((current) => current.filter((injury) => injury.id !== id))

  const submit = async () => {
    if (!user) return
    setError(null)

    if (injuryAnswer === '') {
      setError('Answer the injury question explicitly before submitting the report.')
      return
    }
    if (injuryAnswer === 'no' && !noInjuriesConfirmed) {
      setError('Confirm the “NO INJURIES REPORTED” statement before submitting.')
      return
    }
    if (injuryAnswer === 'yes') {
      if (injuries.length === 0) {
        setError('Add at least one injury, or change the answer to No.')
        return
      }
      if (injuries.some((injury) => !injury.playerId || !injury.description.trim())) {
        setError('Every injury needs a player and a description.')
        return
      }
    }
    if (amending && !amendmentReason.trim()) {
      setError('Explain why the original report is being amended.')
      return
    }

    const entries: InjuryEntry[] = injuries.map((injury) => {
      const player = players.find((entry) => entry.id === injury.playerId)
      return {
        id: injury.id,
        playerId: injury.playerId,
        playerName: player
          ? `${player.firstName} ${player.lastName}`
          : injury.playerId,
        description: injury.description.trim(),
        period: injury.period,
        timeLabel: injury.timeLabel.trim(),
        continuedPlaying: injury.continuedPlaying,
        substitutedDueToInjury: injury.substitutedDueToInjury,
        medicalAttention: injury.medicalAttention,
        followUpNotes: injury.followUpNotes.trim(),
      }
    })

    const snapshot = {
      injuriesReported: injuryAnswer === 'yes',
      noInjuriesConfirmed: injuryAnswer === 'no' ? true : false,
      injuries: injuryAnswer === 'yes' ? entries : [],
      additionalNotes: notes.trim(),
    }

    setSaving(true)
    try {
      let saved: PostMatchTeamReport | null
      if (existing) {
        saved = await repositories.reports.amend(
          existing.id,
          snapshot,
          {
            id: uid('amend'),
            amendedAt: new Date().toISOString(),
            amendedByUserId: user.id,
            amendedByName: user.displayName,
            reason: amendmentReason.trim(),
            previous: {
              injuriesReported: existing.injuriesReported,
              noInjuriesConfirmed: existing.noInjuriesConfirmed,
              injuries: existing.injuries,
              additionalNotes: existing.additionalNotes,
            },
          },
        )
      } else {
        saved = await repositories.reports.submit({
          id: `report-${match.id}-${team.id}`,
          matchId: match.id,
          teamId: team.id,
          managerId: team.managerId,
          managerName: user.displayName,
          ...snapshot,
          status: 'submitted',
          submittedAt: new Date().toISOString(),
          submittedByUserId: user.id,
          submittedByName: user.displayName,
          amendments: [],
        })
      }
      if (!saved) throw new Error('The report could not be saved.')

      await recordAudit({
        user,
        entityType: 'report',
        entityId: saved.id,
        action: amending ? 'amend' : 'submit',
        summary: amending
          ? `Amended the post-match report for ${team.shortName} vs ${match.round ?? 'match'}. Reason: ${amendmentReason.trim()}`
          : `Submitted the post-match report for ${team.shortName}. ${
              snapshot.injuriesReported
                ? `${snapshot.injuries.length} inj${snapshot.injuries.length === 1 ? 'ury' : 'uries'} reported.`
                : 'NO INJURIES REPORTED.'
            }`,
        before: existing
          ? { injuriesReported: existing.injuriesReported, injuries: existing.injuries }
          : null,
        after: { injuriesReported: snapshot.injuriesReported, injuries: snapshot.injuries },
      })

      const updatedMatch = await syncMatchAdminComplete(match.id)

      toast({
        title: amending ? 'Report amended' : 'Report submitted',
        description: amending
          ? 'The original report is preserved in the amendment history.'
          : updatedMatch?.adminComplete
            ? 'The match is now administratively complete.'
            : 'The report has been recorded.',
        tone: 'success',
      })
      onSubmitted(updatedMatch)
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'Could not save the report.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <DialogContent
      title={amending ? 'Amend post-match report' : 'Post-match team report'}
      description={`${team.name} · ${match.round ?? 'Match'} · ${match.venue}`}
      className="max-w-3xl"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={saving}>
            <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
            {saving ? 'Saving…' : amending ? 'Save amendment' : 'Submit report'}
          </Button>
        </>
      }
    >
      <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        <div className="flex items-start gap-2 rounded-control border border-accent/25 bg-accent/[0.06] p-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
          <p className="text-[11px] leading-relaxed text-ink-muted">
            This report is mandatory. The match cannot be marked administratively complete until it
            is submitted. Injury details are private to team management and are never published.
          </p>
        </div>

        {existing ? (
          <div className="rounded-control border border-line bg-canvas/40 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={existing.status === 'amended' ? 'warning' : 'success'}>
                {existing.status}
              </Badge>
              <span className="text-[11px] text-ink-faint">
                Originally submitted by {existing.submittedByName} ·{' '}
                {formatDateTime(existing.submittedAt)}
              </span>
            </div>
            {existing.amendments.length ? (
              <ul className="mt-2 space-y-1 border-t border-line pt-2">
                {existing.amendments.map((amendment) => (
                  <li key={amendment.id} className="text-[11px] text-ink-muted">
                    <span className="font-medium text-ink">{amendment.amendedByName}</span> ·{' '}
                    {amendment.reason}{' '}
                    <span className="text-ink-faint">({formatDateTime(amendment.amendedAt)})</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <div>
          <p className="text-xs font-semibold text-ink">
            Were there any injuries during this match? <span className="text-danger">*</span>
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setInjuryAnswer('yes')}
              aria-pressed={injuryAnswer === 'yes'}
              className={`rounded-control border px-3 py-3 text-left transition ${
                injuryAnswer === 'yes'
                  ? 'border-danger/50 bg-danger/10'
                  : 'border-line bg-canvas/40 hover:border-white/20'
              }`}
            >
              <span className="block text-sm font-bold text-ink">Yes — injuries occurred</span>
              <span className="mt-0.5 block text-[11px] text-ink-faint">
                Record every injury with player, time and follow-up.
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setInjuryAnswer('no')
                setInjuries([])
              }}
              aria-pressed={injuryAnswer === 'no'}
              className={`rounded-control border px-3 py-3 text-left transition ${
                injuryAnswer === 'no'
                  ? 'border-success/50 bg-success/10'
                  : 'border-line bg-canvas/40 hover:border-white/20'
              }`}
            >
              <span className="block text-sm font-bold text-ink">No — no injuries</span>
              <span className="mt-0.5 block text-[11px] text-ink-faint">
                Records an explicit “NO INJURIES REPORTED”.
              </span>
            </button>
          </div>
        </div>

        {injuryAnswer === 'no' ? (
          <div className="rounded-control border border-success/30 bg-success/[0.07] p-3">
            <p className="text-sm font-bold uppercase tracking-wide text-success">
              NO INJURIES REPORTED
            </p>
            <label className="mt-2 flex cursor-pointer items-start gap-2 text-xs text-ink-muted">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-[rgb(var(--color-success))]"
                checked={noInjuriesConfirmed}
                onChange={(event) => setNoInjuriesConfirmed(event.target.checked)}
              />
              <span>
                I confirm that no player on {team.shortName} reported an injury during this match.
              </span>
            </label>
          </div>
        ) : null}

        {injuryAnswer === 'yes' ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-ink">
                Injuries ({injuries.length})
              </p>
              <Button type="button" variant="secondary" size="sm" onClick={addInjury}>
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Add injury
              </Button>
            </div>
            {injuries.length === 0 ? (
              <p className="rounded-control border border-dashed border-line px-3 py-4 text-center text-[11px] text-ink-faint">
                Add at least one injury record.
              </p>
            ) : null}
            {injuries.map((injury, index) => (
              <div key={injury.id} className="rounded-card border border-line bg-canvas/30 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">
                    Injury {index + 1}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeInjury(injury.id)}
                    aria-label={`Remove injury ${index + 1}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Remove
                  </Button>
                </div>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <Field label="Player" htmlFor={`injury-player-${injury.id}`}>
                    <Select
                      value={injury.playerId}
                      onValueChange={(value) => patchInjury(injury.id, { playerId: value })}
                      label="Injured player"
                      placeholder="Select player"
                      options={squadOptions}
                      className="w-full"
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Period" htmlFor={`injury-period-${injury.id}`}>
                      <Select
                        value={String(injury.period)}
                        onValueChange={(value) =>
                          patchInjury(injury.id, { period: Number(value) })
                        }
                        label="Period"
                        options={[1, 2, 3, 4].map((period) => ({
                          value: String(period),
                          label: `Q${period}`,
                        }))}
                        className="w-full"
                      />
                    </Field>
                    <Field
                      label="Time"
                      htmlFor={`injury-time-${injury.id}`}
                      hint="e.g. 06:42"
                    >
                      <Input
                        id={`injury-time-${injury.id}`}
                        value={injury.timeLabel}
                        onChange={(event) =>
                          patchInjury(injury.id, { timeLabel: event.target.value })
                        }
                        placeholder="06:42"
                      />
                    </Field>
                  </div>
                  <div className="sm:col-span-2">
                    <Field
                      label="Description"
                      htmlFor={`injury-description-${injury.id}`}
                      hint="What happened and what treatment was given."
                    >
                      <textarea
                        id={`injury-description-${injury.id}`}
                        value={injury.description}
                        onChange={(event) =>
                          patchInjury(injury.id, { description: event.target.value })
                        }
                        rows={2}
                        className="w-full rounded-control border border-line bg-canvas/60 px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/30"
                        placeholder="Describe the injury and immediate treatment."
                      />
                    </Field>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="mb-1.5 text-xs font-semibold text-ink-muted">Outcome</p>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {(
                        [
                          ['continuedPlaying', 'Continued playing'],
                          ['substitutedDueToInjury', 'Substituted'],
                          ['medicalAttention', 'Medical attention'],
                        ] as const
                      ).map(([key, label]) => (
                        <label
                          key={key}
                          className="flex cursor-pointer items-center gap-2 rounded-control border border-line bg-canvas/40 px-2.5 py-2 text-xs text-ink-muted"
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-[rgb(var(--color-accent))]"
                            checked={injury[key]}
                            onChange={(event) =>
                              patchInjury(injury.id, { [key]: event.target.checked })
                            }
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <Field
                      label="Follow-up notes"
                      htmlFor={`injury-followup-${injury.id}`}
                      hint="Physio review, availability, return-to-play."
                    >
                      <Input
                        id={`injury-followup-${injury.id}`}
                        value={injury.followUpNotes}
                        onChange={(event) =>
                          patchInjury(injury.id, { followUpNotes: event.target.value })
                        }
                        placeholder="Optional follow-up"
                      />
                    </Field>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <div>
          <label htmlFor="report-notes" className="block text-xs font-semibold text-ink-muted">
            Additional notes
          </label>
          <textarea
            id="report-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            className="mt-1.5 w-full rounded-control border border-line bg-canvas/60 px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/30"
            placeholder="Anything else the team manager should record for this match."
          />
        </div>

        {amending ? (
          <div>
            <label
              htmlFor="amendment-reason"
              className="block text-xs font-semibold text-ink-muted"
            >
              Reason for amendment <span className="text-danger">*</span>
            </label>
            <Input
              id="amendment-reason"
              value={amendmentReason}
              onChange={(event) => setAmendmentReason(event.target.value)}
              className="mt-1.5"
              placeholder="Explain what changed and why."
            />
            <p className="mt-1 text-[11px] text-ink-faint">
              The previous report is retained in full alongside your amendment.
            </p>
          </div>
        ) : null}

        {error ? (
          <p
            className="flex items-start gap-2 rounded-control border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger"
            role="alert"
          >
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {error}
          </p>
        ) : null}
      </div>
    </DialogContent>
  )
}
