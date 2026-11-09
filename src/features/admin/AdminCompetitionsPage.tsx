import { useState } from 'react'
import { Pencil, Plus, Trophy } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import type { Competition, CompetitionType } from '@/types/domain'
import { formatDate } from '@/utils/format'

interface CompetitionForm {
  name: string
  shortName: string
  type: CompetitionType
  seasonId: string
  startDate: string
  endDate: string
  publicVisible: boolean
}

const EMPTY_FORM: CompetitionForm = {
  name: '',
  shortName: '',
  type: 'tournament',
  seasonId: '',
  startDate: '',
  endDate: '',
  publicVisible: false,
}

function toDateInput(iso: string): string {
  return iso ? iso.slice(0, 10) : ''
}

export function AdminCompetitionsPage() {
  const { data, loading, error, reload } = useAdminData()
  const { user } = useAuth()
  const { toast } = useToast()
  const [editing, setEditing] = useState<Competition | 'new' | null>(null)
  const [form, setForm] = useState<CompetitionForm>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonCard lines={2} />
        <SkeletonCard lines={6} />
        <SkeletonCard lines={4} />
      </div>
    )
  }

  if (error) {
    return (
      <EmptyState
        icon={Trophy}
        title="Competitions could not be loaded"
        description={error}
        action={<Button onClick={reload}>Try again</Button>}
      />
    )
  }

  if (!data) return null

  const currentSeason = data.seasons.find((season) => season.isCurrent) ?? data.seasons[0]

  const openNew = () => {
    setEditing('new')
    setForm({
      ...EMPTY_FORM,
      seasonId: currentSeason?.id ?? '',
    })
    setFormError(null)
  }

  const openEdit = (competition: Competition) => {
    setEditing(competition)
    setForm({
      name: competition.name,
      shortName: competition.shortName,
      type: competition.type,
      seasonId: competition.seasonId,
      startDate: toDateInput(competition.startDate),
      endDate: toDateInput(competition.endDate),
      publicVisible: competition.publicVisible,
    })
    setFormError(null)
  }

  const save = async () => {
    if (!user || user.role !== 'admin' || !editing) return
    setFormError(null)
    if (!form.name.trim() || !form.shortName.trim()) {
      setFormError('Enter a full name and a short name.')
      return
    }
    if (!form.seasonId) {
      setFormError('Choose a season.')
      return
    }
    if (!form.startDate || !form.endDate || form.endDate < form.startDate) {
      setFormError('End date must be on or after the start date.')
      return
    }
    setBusy(true)
    try {
      const existing = editing === 'new' ? null : editing
      const isNew = existing === null
      const id = existing
        ? existing.id
        : `comp-${form.shortName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`
      const competition: Competition = {
        id,
        name: form.name.trim(),
        shortName: form.shortName.trim(),
        type: form.type,
        seasonId: form.seasonId,
        startDate: new Date(`${form.startDate}T00:00:00+02:00`).toISOString(),
        endDate: new Date(`${form.endDate}T23:59:00+02:00`).toISOString(),
        publicVisible: form.publicVisible,
      }
      await repositories.competitions.upsert(competition)
      await recordAudit({
        user,
        entityType: 'competition',
        entityId: id,
        action: isNew ? 'create' : 'update',
        summary: isNew
          ? `Created ${competition.name} (${competition.type}).`
          : `Updated ${competition.name}.`,
        before: existing ? { name: existing.name, publicVisible: existing.publicVisible } : null,
        after: { name: competition.name, publicVisible: competition.publicVisible },
      })
      toast({
        title: isNew ? 'Competition created' : 'Competition saved',
        description: competition.publicVisible
          ? 'It is visible on the public site.'
          : 'It is hidden from the public site until you publish it.',
        tone: 'success',
      })
      setEditing(null)
      await reload()
    } catch (saveError) {
      setFormError(saveError instanceof Error ? saveError.message : 'Could not save the competition.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Competitions"
        title="Tournaments & leagues"
        description="Create tournaments and leagues, set dates and choose what appears publicly. Fixtures are added to each competition from the match tools."
        actions={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New competition
          </Button>
        }
      />

      {data.competitions.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No competitions yet"
          description="Create the USSA tournament or the DUT league to start registering players."
          action={<Button onClick={openNew}>New competition</Button>}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.competitions.map((competition) => {
            const season = data.seasons.find((entry) => entry.id === competition.seasonId)
            const matches = data.matches.filter((match) => match.competitionId === competition.id)
            return (
              <Card key={competition.id}>
                <CardHeader>
                  <div className="min-w-0">
                    <CardTitle>{competition.name}</CardTitle>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {season?.name ?? 'No season'} · {formatDate(competition.startDate)} –{' '}
                      {formatDate(competition.endDate)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Badge tone={competition.type === 'league' ? 'accent' : 'warning'}>{competition.type}</Badge>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(competition)}>
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      Edit
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-3">
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      ['Fixtures', matches.length],
                      ['Completed', matches.filter((match) => match.status === 'completed').length],
                      ['Live', matches.filter((match) => match.status === 'live' || match.status === 'paused').length],
                    ].map(([label, value]) => (
                      <div key={String(label)} className="rounded-control border border-line bg-canvas/40 p-2 text-center">
                        <p className="stat-num text-lg text-ink">{value}</p>
                        <p className="text-[10px] uppercase tracking-wider text-ink-faint">{label}</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-[11px] text-ink-faint">
                    Public visibility: {competition.publicVisible ? 'published' : 'hidden'}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={editing !== null} onOpenChange={(open) => (!open && !busy ? setEditing(null) : undefined)}>
        {editing ? (
          <DialogContent
            title={editing === 'new' ? 'New competition' : 'Edit competition'}
            description="Tournaments and leagues are scoped to a season."
            className="max-w-lg"
            footer={
              <>
                <Button variant="ghost" onClick={() => setEditing(null)} disabled={busy}>
                  Cancel
                </Button>
                <Button onClick={() => void save()} disabled={busy}>
                  {busy ? 'Saving…' : 'Save'}
                </Button>
              </>
            }
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Full name" htmlFor="comp-name">
                  <Input
                    id="comp-name"
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                    placeholder="USSA Basketball Championships 2026"
                  />
                </Field>
              </div>
              <Field label="Short name" htmlFor="comp-short">
                <Input
                  id="comp-short"
                  value={form.shortName}
                  onChange={(event) => setForm({ ...form, shortName: event.target.value })}
                  placeholder="USSA 2026"
                />
              </Field>
              <Field label="Type" htmlFor="comp-type">
                <Select
                  label="Type"
                  value={form.type}
                  onValueChange={(value) => setForm({ ...form, type: value as CompetitionType })}
                  options={[
                    { value: 'tournament', label: 'Tournament' },
                    { value: 'league', label: 'League' },
                  ]}
                  className="w-full"
                />
              </Field>
              <Field label="Season" htmlFor="comp-season">
                <Select
                  label="Season"
                  value={form.seasonId}
                  onValueChange={(value) => setForm({ ...form, seasonId: value })}
                  options={data.seasons.map((season) => ({ value: season.id, label: season.name }))}
                  className="w-full"
                />
              </Field>
              <Field label="Start date" htmlFor="comp-start">
                <Input
                  id="comp-start"
                  type="date"
                  value={form.startDate}
                  onChange={(event) => setForm({ ...form, startDate: event.target.value })}
                />
              </Field>
              <Field label="End date" htmlFor="comp-end">
                <Input
                  id="comp-end"
                  type="date"
                  value={form.endDate}
                  onChange={(event) => setForm({ ...form, endDate: event.target.value })}
                />
              </Field>
              <label className="sm:col-span-2 flex cursor-pointer items-center gap-2 text-xs text-ink-muted">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[rgb(var(--color-accent))]"
                  checked={form.publicVisible}
                  onChange={(event) => setForm({ ...form, publicVisible: event.target.checked })}
                />
                Publish on the public site
              </label>
              {formError ? (
                <p className="sm:col-span-2 text-xs text-danger" role="alert">
                  {formError}
                </p>
              ) : null}
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  )
}
