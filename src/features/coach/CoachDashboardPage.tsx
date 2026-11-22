import { Link } from 'react-router-dom'
import { ArrowRight, BarChart3, CalendarDays, Trophy, TrendingUp, Users } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatCard } from '@/components/stats/stat-card'
import { Scoreboard } from '@/components/stats/scoreboard'
import { BarList, DonutStat, TrendChart } from '@/components/stats/charts'
import { TeamAnalyticsGate } from '@/features/statistics/TeamAnalyticsGate'
import {
  ArchivedPlayersToggle,
  useArchivedPlayers,
  visiblePlayerRows,
} from '@/features/statistics/archivedPlayers'
import { matchScore } from '@/services/analytics/stats'
import { formatDate, formatTime } from '@/utils/format'

export function CoachDashboardPage() {
  const [showArchived, setShowArchived] = useArchivedPlayers()

  return (
    <TeamAnalyticsGate>
      {(analytics) => {
        const { team, record, liveMatch, upcoming, completed, eventsByMatch, opponentById, recentForm, teamTotals } =
          analytics
        const playerRows = visiblePlayerRows(analytics.playerRows, showArchived)
        const hiddenPlayers = analytics.playerRows.length - playerRows.length
        const liveScores = liveMatch ? matchScore(eventsByMatch.get(liveMatch.id) ?? [], liveMatch) : null

        return (
          <div className="space-y-6">
            <PageHeader
              eyebrow="Coach overview"
              title={team.name}
              description="Read-only performance analysis. Match events and official statistics are managed by the team manager."
              actions={
                <>
                  <Button asChild variant="secondary" size="md">
                    <Link to="/coach/analytics">
                      <BarChart3 className="h-4 w-4" aria-hidden="true" />
                      Compare players
                    </Link>
                  </Button>
                  <Button asChild size="md">
                    <Link to="/coach/matches">
                      <CalendarDays className="h-4 w-4" aria-hidden="true" />
                      Match history
                    </Link>
                  </Button>
                </>
              }
            />

            {liveMatch && liveScores && (
              <section className="rounded-card border border-danger/25 bg-surface p-4 shadow-card">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Badge tone="live">Live now</Badge>
                    <span className="text-xs text-ink-muted">{liveMatch.round}</span>
                  </div>
                  <Button asChild size="sm" variant="secondary">
                    <Link to="/live">
                      Public scoreboard
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
                <Scoreboard
                  homeTeam={opponentById.get(liveMatch.homeTeamId) ?? team}
                  awayTeam={opponentById.get(liveMatch.awayTeamId) ?? team}
                  homeScore={liveScores.home}
                  awayScore={liveScores.away}
                  period={liveMatch.period}
                  clockSeconds={liveMatch.clockSeconds}
                  status={liveMatch.status}
                  competition={liveMatch.round}
                />
              </section>
            )}

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Season record"
                value={`${record.wins}–${record.losses}`}
                hint={`${record.played} matches completed`}
                icon={Trophy}
                accent
              />
              <StatCard
                label="Points per game"
                value={record.ppg.toFixed(1)}
                hint={`Opponents ${record.oppPpg.toFixed(1)}`}
                icon={TrendingUp}
              />
              <StatCard
                label="Rebounds per game"
                value={teamTotals.rpg.toFixed(1)}
                hint={`${teamTotals.rebounds} total rebounds`}
                icon={Users}
              />
              <StatCard
                label="Assists per game"
                value={teamTotals.apg.toFixed(1)}
                hint={`${teamTotals.turnovers} turnovers recorded`}
                icon={BarChart3}
              />
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Scoring trend</CardTitle>
                    <p className="mt-0.5 text-xs text-ink-muted">Team points in recent completed matches</p>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <TrendChart points={recentForm} height={140} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Shooting profile</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-2 pt-3">
                  <DonutStat value={teamTotals.fgPct} label="FG" sublabel={`${teamTotals.fgm}/${teamTotals.fga}`} />
                  <DonutStat value={teamTotals.tpPct} label="3PT" sublabel={`${teamTotals.tpm}/${teamTotals.tpa}`} />
                  <DonutStat value={teamTotals.ftPct} label="FT" sublabel={`${teamTotals.ftm}/${teamTotals.fta}`} />
                </CardContent>
              </Card>
            </section>

            <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Player rankings</CardTitle>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      Season points per game
                      {hiddenPlayers > 0 && !showArchived ? ` · ${hiddenPlayers} archived hidden` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <ArchivedPlayersToggle showArchived={showArchived} onChange={setShowArchived} />
                    <Button asChild variant="ghost" size="sm">
                      <Link to="/coach/players">Squad</Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-3">
                  {playerRows.length === 0 ? (
                    <p className="rounded-control border border-dashed border-line px-3 py-6 text-center text-xs text-ink-faint">
                      Player statistics appear after the first completed match.
                    </p>
                  ) : (
                    <BarList
                      items={playerRows.slice(0, 6).map((row) => ({
                        label: `#${row.player.jerseyNumber} ${row.player.lastName}`,
                        value: row.totals.ppg,
                        meta: 'PPG',
                      }))}
                    />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Next fixtures</CardTitle>
                    <p className="mt-0.5 text-xs text-ink-muted">Upcoming opponents</p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 pt-3">
                  {upcoming.length === 0 ? (
                    <p className="rounded-control border border-dashed border-line px-3 py-6 text-center text-xs text-ink-faint">
                      No fixtures scheduled.
                    </p>
                  ) : (
                    upcoming.slice(0, 4).map((match) => {
                      const opponent = opponentById.get(
                        match.homeTeamId === team.id ? match.awayTeamId : match.homeTeamId,
                      )
                      return (
                        <div
                          key={match.id}
                          className="flex items-center gap-3 rounded-control border border-line px-3 py-2.5"
                        >
                          <div className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-control bg-canvas/60 text-center">
                            <span className="text-[9px] font-semibold uppercase text-ink-faint">
                              {formatDate(match.tipoff, { month: 'short' }).toUpperCase()}
                            </span>
                            <span className="stat-num text-sm leading-none text-ink">
                              {formatDate(match.tipoff, { day: 'numeric' })}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-ink">
                              {match.homeTeamId === team.id ? 'vs' : '@'} {opponent?.shortName ?? 'Opponent'}
                            </p>
                            <p className="truncate text-[11px] text-ink-faint">
                              {match.round} · {formatTime(match.tipoff)} · {match.venue}
                            </p>
                          </div>
                        </div>
                      )
                    })
                  )}
                </CardContent>
              </Card>
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-ink">Recent results</h2>
                <Link to="/coach/matches" className="text-xs font-semibold text-accent hover:underline">
                  All matches
                </Link>
              </div>
              {completed.length === 0 ? (
                <p className="rounded-control border border-dashed border-line px-3 py-8 text-center text-xs text-ink-faint">
                  Results appear once a match is completed.
                </p>
              ) : (
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {completed
                    .slice(-6)
                    .reverse()
                    .map((match) => {
                      const opponent = opponentById.get(
                        match.homeTeamId === team.id ? match.awayTeamId : match.homeTeamId,
                      )
                      const score = matchScore(eventsByMatch.get(match.id) ?? [], match)
                      const isHome = match.homeTeamId === team.id
                      const own = isHome ? score.home : score.away
                      const opp = isHome ? score.away : score.home
                      const won = own > opp
                      return (
                        <div
                          key={match.id}
                          className="flex items-center gap-3 rounded-card border border-line bg-surface px-3 py-3"
                        >
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                              won ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'
                            }`}
                          >
                            {won ? 'W' : 'L'}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-ink">
                              {isHome ? 'vs' : '@'} {opponent?.shortName ?? 'Opponent'}
                            </p>
                            <p className="truncate text-[11px] text-ink-faint">{formatDate(match.tipoff)}</p>
                          </div>
                          <span className="stat-num text-sm text-ink">
                            {own}–{opp}
                          </span>
                        </div>
                      )
                    })}
                </div>
              )}
            </section>
          </div>
        )
      }}
    </TeamAnalyticsGate>
  )
}
