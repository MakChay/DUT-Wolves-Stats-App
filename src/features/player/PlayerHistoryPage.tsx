import { CalendarDays, Trophy } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { PlayerAreaGate } from '@/features/player/PlayerDashboardPage'
import { formatDate, formatTime } from '@/utils/format'
import { cn } from '@/utils/cn'

export function PlayerHistoryPage() {
  return (
    <PlayerAreaGate>
      {(ctx) => {
        const { completed, upcoming, gameLog, team, opponentById } = ctx

        return (
          <div className="space-y-5">
            <PageHeader
              eyebrow="Match history"
              title="Your matches"
              description={`Results for ${team.name}, with your recorded contribution in each completed game.`}
            />

            <section>
              <h2 className="mb-2 text-sm font-semibold text-ink">Completed matches</h2>
              {gameLog.length === 0 ? (
                <EmptyState
                  icon={Trophy}
                  title="No completed matches yet"
                  description="Once a match is finalised your performance will appear here."
                />
              ) : (
                <div className="space-y-2">
                  {gameLog
                    .slice()
                    .reverse()
                    .map((entry) => (
                      <Card key={entry.match.id}>
                        <CardContent className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center">
                          <div className="flex items-center gap-3 sm:w-56">
                            <span
                              className={cn(
                                'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                                entry.won ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger',
                              )}
                            >
                              {entry.won ? 'W' : 'L'}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-ink">
                                {entry.isHome ? 'vs' : '@'} {entry.opponent?.name ?? 'Opponent'}
                              </p>
                              <p className="text-[11px] text-ink-faint">
                                {formatDate(entry.match.tipoff)} · {formatTime(entry.match.tipoff)} · {entry.match.round}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-1 flex-wrap items-center gap-2">
                            <Badge tone="neutral">
                              {team.shortName} {entry.ownScore}–{entry.oppScore} {entry.opponent?.shortName}
                            </Badge>
                            <Badge tone="accent">{entry.stats.points} PTS</Badge>
                            <Badge tone="neutral">{entry.stats.reb} REB</Badge>
                            <Badge tone="neutral">{entry.stats.ast} AST</Badge>
                            <Badge tone="neutral">
                              {entry.stats.fgm}/{entry.stats.fga} FG
                            </Badge>
                          </div>

                          <p className="text-[11px] text-ink-faint sm:text-right">
                            {entry.stats.stl} STL · {entry.stats.blk} BLK · {entry.stats.pf} PF
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="mb-2 text-sm font-semibold text-ink">Upcoming fixtures</h2>
              {upcoming.length === 0 ? (
                <EmptyState
                  icon={CalendarDays}
                  title="No upcoming fixtures"
                  description="The next competition round has not been scheduled yet."
                />
              ) : (
                <div className="grid gap-2 md:grid-cols-2">
                  {upcoming.map((match) => {
                    const opponent = opponentById.get(
                      match.homeTeamId === team.id ? match.awayTeamId : match.homeTeamId,
                    )
                    return (
                      <Card key={match.id}>
                        <CardContent className="flex items-center gap-3 pt-4">
                          <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-control bg-canvas/60">
                            <span className="text-[9px] font-semibold uppercase text-ink-faint">
                              {formatDate(match.tipoff, { month: 'short' }).toUpperCase()}
                            </span>
                            <span className="stat-num text-sm leading-none text-ink">
                              {formatDate(match.tipoff, { day: 'numeric' })}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-ink">
                              {match.homeTeamId === team.id ? 'vs' : '@'} {opponent?.name ?? 'Opponent'}
                            </p>
                            <p className="truncate text-[11px] text-ink-faint">
                              {match.round} · {formatTime(match.tipoff)} · {match.venue}
                            </p>
                          </div>
                          <Badge tone="accent">Scheduled</Badge>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
              <p className="mt-2 text-[11px] text-ink-faint">{completed.length} completed matches this season.</p>
            </section>
          </div>
        )
      }}
    </PlayerAreaGate>
  )
}
