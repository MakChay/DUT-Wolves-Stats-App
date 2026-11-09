import { useState } from 'react'
import { CalendarDays, Pencil, Plus, Trash2 } from 'lucide-react'
import type { Match } from '@/types/domain'
import { isDutTeamId } from '@/types/domain'
import { repositories } from '@/services/repositories'
import { recordAudit } from '@/services/audit/record'
import { useAuth } from '@/features/auth/AuthContext'
import { useToast } from '@/components/ui/toast'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { StatusPill } from '@/components/stats/status-pill'
import { Table, TableWrap, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty-state'
import { SkeletonCard } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input, Field } from '@/components/ui/input'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useAdminData } from '@/features/admin/useAdminData'
import { matchScore } from '@/services/analytics/stats'
import { formatDate, formatTime } from '@/utils/format'

interface FixtureForm {
  competitionId: string
  seasonId: string
  homeTeamId: string
  awayTeamId: string
  venue: string
  tipoff: string
  round: string
  publicVisible: boolean
}

const EMPTY_FORM: FixtureForm = {
  competitionId: '',
  seasonId: '',
  homeTeamId: '',
  awayTeamId: '',
  venue: 'DUT Sports Centre, Durban',
  tipoff: '',
  round: '',
  publicVisible: true,
}

function toLocalInput(iso: string): string {
  const value = new Date(iso)
  if (Number.isNaN(value.getTime())) return ''
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`
}

export function AdminMatchesPage() {
  const { data, loading, error, reload } = useAdminData()
  const { user } = useAuth()
  const { toast } = useToast()
  const [status, setStatus] = useState('all')
  const [editing, setEditing] = useState<Match | 'new' | null>(null)
  const [form, setForm] = useState<FixtureForm>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [publishingId, setPublishingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Match | null>(null)

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonCard lines={2} />
        <SkeletonCard lines={10} />
      </div>
    )
  }

  if (error) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Matches could not be loaded"
        description={error}
        action={<Button onClick={reload}>Try again</Button>}
      />
    )
  }

  if (!data) return null

  const activeCompetitions = data.competitions.filter(
    (competition) => competition.status !== 'archived',
  )
  const teams = [...data.teams].sort((a, b) =>
    `${a.gender}-${a.name}`.localeCompare(`${b.gender}-${b.name}`),
  )
  const shown = [...data.matches]
    .filter((match) => isDutTeamId(match.homeTeamId) || isDutTeamId(match.awayTeamId))
    .filter((match) => status === 'all' || match.status === status)
    .sort((a, b) => b.tipoff.localeCompare(a.tipoff))

  const openNew = () => {
    const competition = activeCompetitions[0]
    setEditing('new')
    setForm({
      ...EMPTY_FORM,
      competitionId: competition?.id ?? '',
      seasonId: competition?.seasonId ?? data.seasons[0]?.id ?? '',
    })
    setFormError(null)
  }

  const openEdit = (match: Match) => {
    setEditing(match)
    setForm({
      competitionId: match.competitionId,
      seasonId: match.seasonId,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      venue: match.venue,
      tipoff: toLocalInput(match.tipoff),
      round: match.round ?? '',
      publicVisible: match.publicVisible,
    })
    setFormError(null)
  }

  const save = async () => {
    if (!user || user.role !== 'admin' || !editing) return
    setFormError(null)
    if (!form.competitionId || !form.homeTeamId || !form.awayTeamId) {
      setFormError('Choose a competition, home team and away team.')
      return
    }
    if (form.homeTeamId === form.awayTeamId) {
      setFormError('The home and away teams must be different.')
      return
    }
    if (!isDutTeamId(form.homeTeamId) && !isDutTeamId(form.awayTeamId)) {
      setFormError('At least one team must be a DUT Wolves squad.')
      return
    }
    const tipoff = new Date(form.tipoff)
    if (!form.tipoff || Number.isNaN(tipoff.getTime())) {
      setFormError('Choose a valid tip-off date and time.')
      return
    }
    if (!form.venue.trim()) {
      setFormError('Enter a venue.')
      return
    }

    setBusy(true)
    try {
      const competition = data.competitions.find((entry) => entry.id === form.competitionId)
      const seasonId = form.seasonId || competition?.seasonId || ''
      const reportRequired = isDutTeamId(form.homeTeamId) || isDutTeamId(form.awayTeamId)
      if (editing === 'new') {
        const created: Match = {
          id: `match-${form.competitionId}-${Date.now().toString(36)}`,
          competitionId: form.competitionId,
          seasonId,
          homeTeamId: form.homeTeamId,
          awayTeamId: form.awayTeamId,
          venue: form.venue.trim(),
          tipoff: tipoff.toISOString(),
          status: 'scheduled',
          period: 1,
          clockSeconds: 600,
          publicVisible: form.publicVisible,
          round: form.round.trim() || undefined,
          reportRequired,
          adminComplete: false,
          isDraft: false,
        }
        await repositories.matches.create(created)
        await recordAudit({
          user,
          entityType: 'match',
          entityId: created.id,
          action: 'create',
          summary: `Created fixture ${form.homeTeamId} vs ${form.awayTeamId}.`,
          after: { ...created },
        })
        toast({ title: 'Fixture created', description: 'It is on the schedule.', tone: 'success' })
      } else {
        const updated = await repositories.matches.update(editing.id, {
          competitionId: form.competitionId,
          seasonId,
          homeTeamId: form.homeTeamId,
          awayTeamId: form.awayTeamId,
          venue: form.venue.trim(),
          tipoff: tipoff.toISOString(),
          publicVisible: form.publicVisible,
          round: form.round.trim() || undefined,
          reportRequired,
        })
        if (!updated) throw new Error('The fixture could not be found.')
        await recordAudit({
          user,
          entityType: 'match',
          entityId: editing.id,
          action: 'update',
          summary: `Updated fixture ${form.homeTeamId} vs ${form.awayTeamId}.`,
          before: {
            homeTeamId: editing.homeTeamId,
            awayTeamId: editing.awayTeamId,
            tipoff: editing.tipoff,
            venue: editing.venue,
          },
          after: {
            homeTeamId: form.homeTeamId,
            awayTeamId: form.awayTeamId,
            tipoff: tipoff.toISOString(),
            venue: form.venue.trim(),
          },
        })
        toast({ title: 'Fixture updated', description: 'The schedule has been saved.', tone: 'success' })
      }
      setEditing(null)
      await reload()
    } catch (saveError) {
      setFormError(saveError instanceof Error ? saveError.message : 'Could not save the fixture.')
    } finally {
      setBusy(false)
    }
  }

  const publishDraft = async (matchId: string) => {
    setPublishingId(matchId)
    try {
      const updated = await repositories.matches.update(matchId, {
        isDraft: false,
        publicVisible: true,
      })
      if (!updated) throw new Error('The fixture could not be found.')
      toast({ title: 'Fixture published', description: 'It is now visible on the public schedule.', tone: 'success' })
      await reload()
    } catch (publishError) {
      toast({
        title: 'Fixture was not published',
        description: publishError instanceof Error ? publishError.message : 'Try again.',
        tone: 'error',
      })
    } finally {
      setPublishingId(null)
    }
  }

  const remove = async (match: Match) => {
    if (!user || user.role !== 'admin') return
    if (match.status !== 'scheduled' && match.status !== 'postponed') {
      toast({
        title: 'Fixture has match data',
        description: 'Only scheduled or postponed fixtures can be deleted. Completed matches are kept for history.',
        tone: 'error',
      })
      return
    }
    setBusy(true)
    try {
      await repositories.matches.remove(match.id)
      await recordAudit({
        user,
        entityType: 'match',
        entityId: match.id,
        action: 'delete',
        summary: `Deleted fixture ${match.homeTeamId} vs ${match.awayTeamId}.`,
        before: {
          homeTeamId: match.homeTeamId,
          awayTeamId: match.awayTeamId,
          tipoff: match.tipoff,
          status: match.status,
        },
      })
      toast({ title: 'Fixture deleted', description: 'It was removed from the schedule.', tone: 'success' })
      setDeleteTarget(null)
      await reload()
    } catch (removeError) {
      toast({
        title: 'Fixture was not deleted',
        description: removeError instanceof Error ? removeError.message : 'Try again.',
        tone: 'error',
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Matches"
        title="DUT Wolves matches"
        description="Create, edit and publish fixtures involving a DUT Wolves squad. Opponents remain fixture references only."
        actions={
          <Button onClick={openNew} disabled={activeCompetitions.length === 0}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New fixture
          </Button>
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="sm:w-56">
            <Select
              label="Filter by status"
              value={status}
              onValueChange={setStatus}
              options={[
                { value: 'all', label: 'All statuses' },
                { value: 'scheduled', label: 'Scheduled' },
                { value: 'live', label: 'Live' },
                { value: 'paused', label: 'Paused' },
                { value: 'completed', label: 'Completed' },
              ]}
              className="w-full"
            />
          </div>
          <p className="text-[11px] text-ink-faint">{shown.length} matches shown</p>
        </CardContent>
      </Card>

      {shown.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No matches"
          description="No fixtures match the selected status."
          action={<Button onClick={openNew} disabled={activeCompetitions.length === 0}>Create a fixture</Button>}
        />
      ) : (
        <TableWrap>
          <Table>
            <THead>
              <tr>
                <TH>Date</TH>
                <TH>Fixture</TH>
                <TH>Competition</TH>
                <TH className="text-center">Period</TH>
                <TH className="text-center">Score</TH>
                <TH>Status</TH>
                <TH>Visibility</TH>
                <TH>Venue</TH>
                <TH><span className="sr-only">Actions</span></TH>
              </tr>
            </THead>
            <TBody>
              {shown.map((match) => {
                const home = data.teams.find((team) => team.id === match.homeTeamId)
                const away = data.teams.find((team) => team.id === match.awayTeamId)
                const competition = data.competitions.find((entry) => entry.id === match.competitionId)
                const hasScore = match.status !== 'scheduled'
                const score = matchScore(data.eventsByMatch.get(match.id) ?? [], match)
                return (
                  <TR key={match.id}>
                    <TD>
                      <p className="text-ink">{formatDate(match.tipoff)}</p>
                      <p className="text-[10px] text-ink-faint">{formatTime(match.tipoff)}</p>
                    </TD>
                    <TD>
                      <p className="font-medium text-ink">
                        {home?.shortName ?? match.homeTeamId} vs {away?.shortName ?? match.awayTeamId}
                      </p>
                      <p className="text-[10px] text-ink-faint">{match.round}</p>
                    </TD>
                    <TD>{competition?.shortName ?? '—'}</TD>
                    <TD className="stat-num text-center">Q{match.period}</TD>
                    <TD className="stat-num text-center text-ink">
                      {hasScore ? `${score.home}–${score.away}` : '—'}
                    </TD>
                    <TD><StatusPill status={match.status} /></TD>
                    <TD>
                      {match.isDraft ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={publishingId === match.id}
                          onClick={() => void publishDraft(match.id)}
                        >
                          {publishingId === match.id ? 'Publishing…' : 'Publish draft'}
                        </Button>
                      ) : (
                        <span className="text-xs text-ink-muted">
                          {match.publicVisible ? 'Public' : 'Private'}
                        </span>
                      )}
                    </TD>
                    <TD className="max-w-[220px] truncate">{match.venue}</TD>
                    <TD>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(match)}>
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(match)}>
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Delete
                        </Button>
                      </div>
                    </TD>
                  </TR>
                )
              })}
            </TBody>
          </Table>
        </TableWrap>
      )}

      <Dialog open={editing !== null} onOpenChange={(open) => (!open && !busy ? setEditing(null) : undefined)}>
        {editing ? (
          <DialogContent
            title={editing === 'new' ? 'New fixture' : 'Edit fixture'}
            description="Fixtures belong to a competition and season. Completed matches keep their recorded scores."
            className="max-w-2xl"
            footer={
              <>
                <Button variant="ghost" onClick={() => setEditing(null)} disabled={busy}>Cancel</Button>
                <Button onClick={() => void save()} disabled={busy}>
                  {busy ? 'Saving…' : editing === 'new' ? 'Create fixture' : 'Save changes'}
                </Button>
              </>
            }
          >
            <div className="grid max-h-[65vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
              <Field label="Competition" htmlFor="fixture-competition">
                <Select
                  label="Competition"
                  value={form.competitionId}
                  onValueChange={(value) => {
                    const competition = data.competitions.find((entry) => entry.id === value)
                    setForm({ ...form, competitionId: value, seasonId: competition?.seasonId ?? form.seasonId })
                  }}
                  options={activeCompetitions.map((competition) => ({
                    value: competition.id,
                    label: competition.shortName,
                  }))}
                  className="w-full"
                />
              </Field>
              <Field label="Season" htmlFor="fixture-season">
                <Select
                  label="Season"
                  value={form.seasonId}
                  onValueChange={(value) => setForm({ ...form, seasonId: value })}
                  options={data.seasons.map((season) => ({ value: season.id, label: season.name }))}
                  className="w-full"
                />
              </Field>
              <Field label="Home team" htmlFor="fixture-home">
                <Select
                  label="Home team"
                  value={form.homeTeamId}
                  onValueChange={(value) => setForm({ ...form, homeTeamId: value })}
                  options={teams.map((team) => ({ value: team.id, label: team.name }))}
                  className="w-full"
                />
              </Field>
              <Field label="Away team" htmlFor="fixture-away">
                <Select
                  label="Away team"
                  value={form.awayTeamId}
                  onValueChange={(value) => setForm({ ...form, awayTeamId: value })}
                  options={teams.map((team) => ({ value: team.id, label: team.name }))}
                  className="w-full"
                />
              </Field>
              <Field label="Tip-off" htmlFor="fixture-tipoff">
                <Input
                  id="fixture-tipoff"
                  type="datetime-local"
                  value={form.tipoff}
                  onChange={(event) => setForm({ ...form, tipoff: event.target.value })}
                />
              </Field>
              <Field label="Venue" htmlFor="fixture-venue">
                <Input
                  id="fixture-venue"
                  value={form.venue}
                  onChange={(event) => setForm({ ...form, venue: event.target.value })}
                  placeholder="DUT Sports Centre, Durban"
                />
              </Field>
              <Field label="Round / pool" htmlFor="fixture-round">
                <Input
                  id="fixture-round"
                  value={form.round}
                  onChange={(event) => setForm({ ...form, round: event.target.value })}
                  placeholder="Section A · Pool A"
                />
              </Field>
              <label className="mt-6 flex cursor-pointer items-center gap-2 text-xs text-ink-muted">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[rgb(var(--color-accent))]"
                  checked={form.publicVisible}
                  onChange={(event) => setForm({ ...form, publicVisible: event.target.checked })}
                />
                Publish on the public schedule
              </label>
              {formError ? (
                <p className="sm:col-span-2 text-xs text-danger" role="alert">{formError}</p>
              ) : null}
            </div>
          </DialogContent>
        ) : null}
      </Dialog>

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => (!open && !busy ? setDeleteTarget(null) : undefined)}>
        {deleteTarget ? (
          <DialogContent
            title="Delete fixture?"
            description="This removes a scheduled fixture and its schedule entry. Completed matches are kept for history."
            footer={
              <>
                <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={busy}>Cancel</Button>
                <Button variant="danger" onClick={() => void remove(deleteTarget)} disabled={busy}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  {busy ? 'Deleting…' : 'Delete fixture'}
                </Button>
              </>
            }
          >
            <p className="text-sm text-ink-muted">
              {data.teams.find((team) => team.id === deleteTarget.homeTeamId)?.shortName ?? deleteTarget.homeTeamId}
              {' vs '}
              {data.teams.find((team) => team.id === deleteTarget.awayTeamId)?.shortName ?? deleteTarget.awayTeamId}
              {' · '}
              {formatDate(deleteTarget.tipoff)}
            </p>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  )
}
