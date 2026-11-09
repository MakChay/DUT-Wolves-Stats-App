import { Link } from 'react-router-dom'
import { Trophy } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { PublicGate } from '@/features/public/PublicGate'
import { PublicTeamSwitch, usePublicGender } from '@/features/public/PublicTeamSwitch'
import { genderLabel, matchesForGender, scoreOf } from '@/features/public/publicUtils'
import type { PublicData } from '@/features/public/usePublicData'
import type { TeamGender } from '@/types/domain'
import { formatDate, formatTime } from '@/utils/format'
import { cn } from '@/utils/cn'

function ResultsContent({
  data,
  gender,
  setGender,
}: {
  data: PublicData
  gender: TeamGender
  setGender: (gender: TeamGender) => void
}) {
  const results = matchesForGender(data, gender)
    .filter((match) => match.status === 'completed')
    .sort((a, b) => b.tipoff.localeCompare(a.tipoff))

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Results"
        title={`${genderLabel(gender)} results`}
        description="Final scores derived from recorded match events. Corrections are logged rather than overwriting history."
        actions={<PublicTeamSwitch gender={gender} onChange={setGender} />}
      />

      {results.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No results yet"
          description={`No completed ${genderLabel(gender).toLowerCase()} matches have been published.`}
          action={
            <Button asChild variant="secondary">
              <Link to="/fixtures">View fixtures</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {results.map((match) => {
            const home = data.teamById.get(match.homeTeamId)
            const away = data.teamById.get(match.awayTeamId)
            const competition = data.competitionById.get(match.competitionId)
            const score = scoreOf(data, match)
            const homeWon = score.home > score.away
            const awayWon = score.away > score.home
            return (
              <Card key={match.id}>
                <CardContent className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-3 sm:w-44">
                    <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-control bg-canvas/60">
                      <span className="text-[9px] font-semibold uppercase text-ink-faint">
                        {formatDate(match.tipoff, { month: 'short' })}
                      </span>
                      <span className="stat-num text-sm leading-none text-ink">
                        {formatDate(match.tipoff, { day: 'numeric' })}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-ink">{formatTime(match.tipoff)}</p>
                      <p className="text-[11px] text-ink-faint">{match.round ?? 'Match'}</p>
                    </div>
                  </div>

                  <div className="flex flex-1 items-center gap-3">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <p
                        className={cn(
                          'truncate text-sm',
                          homeWon ? 'font-semibold text-ink' : 'text-ink-muted',
                        )}
                      >
                        {home?.name ?? 'Home'}
                      </p>
                      <p
                        className={cn(
                          'truncate text-sm',
                          awayWon ? 'font-semibold text-ink' : 'text-ink-muted',
                        )}
                      >
                        {away?.name ?? 'Away'}
                      </p>
                    </div>
                    <div className="stat-num shrink-0 space-y-1.5 text-right text-base">
                      <p className={homeWon ? 'text-ink' : 'text-ink-muted'}>{score.home}</p>
                      <p className={awayWon ? 'text-ink' : 'text-ink-muted'}>{score.away}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-line pt-2 sm:w-44 sm:flex-col sm:items-end sm:border-0 sm:pt-0">
                    <Badge tone="neutral">{competition?.shortName ?? 'Competition'}</Badge>
                    <span className="text-[11px] text-ink-faint">{match.venue}</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function PublicResultsPage() {
  const [gender, setGender] = usePublicGender()
  return (
    <PublicGate>
      {(data) => <ResultsContent data={data} gender={gender} setGender={setGender} />}
    </PublicGate>
  )
}
