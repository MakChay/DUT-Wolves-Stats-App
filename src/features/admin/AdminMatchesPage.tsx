import { useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { repositories } from '@/services/repositories'
import { useToast } from '@/components/ui/toast'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { StatusPill } from '@/components/stats/status-pill'
import { Table, TableWrap, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty-state'
import { SkeletonCard } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useAdminData } from '@/features/admin/useAdminData'
import { matchScore } from '@/services/analytics/stats'
import { formatDate, formatTime } from '@/utils/format'

export function AdminMatchesPage() {
  const { data, loading, error, reload } = useAdminData()
  const { toast } = useToast()
  const [status, setStatus] = useState('all')
  const [publishingId, setPublishingId] = useState<string | null>(null)

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

  const shown = [...data.matches]
    .filter((match) => status === 'all' || match.status === status)
    .sort((a, b) => b.tipoff.localeCompare(a.tipoff))

  const publishDraft = async (matchId: string) => {
    setPublishingId(matchId)
    try {
      const updated = await repositories.matches.update(matchId, {
        isDraft: false,
        publicVisible: true,
      })
      if (!updated) throw new Error('The fixture could not be found.')
      toast({
        title: 'Fixture published',
        description: 'It is now visible on the public schedule.',
        tone: 'success',
      })
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

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Matches"
        title="All matches"
        description="Review imported fixtures before publishing them to the public schedule."
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
                    <TD>
                      <StatusPill status={match.status} />
                    </TD>
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
                  </TR>
                )
              })}
            </TBody>
          </Table>
        </TableWrap>
      )}
    </div>
  )
}
