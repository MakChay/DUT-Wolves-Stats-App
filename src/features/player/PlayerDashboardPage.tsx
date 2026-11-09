import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Radio,
  Target,
  TrendingUp,
  Trophy,
  UserRound,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { SkeletonCard } from '@/components/ui/skeleton'
import { StatCard } from '@/components/stats/stat-card'
import { PlayerAvatar } from '@/components/stats/player-avatar'
import { DonutStat, TrendChart } from '@/components/stats/charts'
import { Scoreboard } from '@/components/stats/scoreboard'
import { useAuth } from '@/features/auth/AuthContext'
import { usePlayerContext } from '@/features/player/usePlayerContext'
import { matchScore } from '@/services/analytics/stats'
import { formatDate } from '@/utils/format'

export function PlayerAreaGate({ children }: { children: (context: NonNullable<ReturnType<typeof usePlayerContext>['data']>) => ReactNode }) {
  const { user } = useAuth()
  const { data, loading, error, reload } = usePlayerContext(user?.playerId)

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonCard lines={3} />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonCard key={index} lines={1} />
          ))}
        </div>
        <SkeletonCard lines={6} />
      </div>
    )
  }

  if (error) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Your statistics could not be loaded"
        description={error}
        action={<Button onClick={reload}>Try again</Button>}
      />
    )
  }

  if (!data) {
    return (
      <EmptyState
        icon={UserRound}
        title="No player profile linked"
        description="This account is not linked to a player record. Sign in with a player code or ask a manager to link your profile."
      />
    )
  }

  return <>{children(data)}</>
}

export function PlayerDashboardPage() {
  const { user } = useAuth()

  return (
    <PlayerAreaGate>
      {(ctx) => {
        const { player, team, totals, teamRecord, gameLog, liveMatch, upcoming, eventsByMatch, opponentById } = ctx
        const liveScores = liveMatch ? matchScore(eventsByMatch.get(liveMatch.id) ?? [], liveMatch) : null
        const lastFive = gameLog.slice(-5)

        return (
          <div className="space-y-6">
            <PageHeader
              eyebrow={`${team.shortName} · Player dashboard`}
              title={`${player.firstName} ${player.lastName}`}
              description={`#${player.jerseyNumber} · ${player.position}${player.heightCm ? ` · ${player.heightCm} cm` : ''} · ${totals.games} games played`}
              actions={
                <>
                  <Button asChild variant="secondary" size="md">
                    <Link to="/player/history">
                      <CalendarDays className="h-4 w-4" aria-hidden="true" />
                      Match history
                    </Link>
                  </Button>
                  <Button asChild size="md">
                    <Link to="/player/stats">
                      <BarChart3 className="h-4 w-4" aria-hidden="true" />
                      My statistics
                    </Link>
                  </Button>
                </>
              }
            />

            <Card className="overflow-hidden">
              <CardContent className="flex flex-col gap-4 pt-4 sm:flex-row sm:items-center">
                <PlayerAvatar player={player} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{team.name}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {teamRecord.wins}–{teamRecord.losses} team record · {teamRecord.ppg.toFixed(1)} team PPG ·{' '}
                    {teamRecord.fgPct}% FG
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge tone="accent">{player.position}</Badge>
                    <Badge tone="neutral">#{player.jerseyNumber}</Badge>
                    <Badge tone="success">Verified demo profile</Badge>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:w-64">
                  {[
                    ['PPG', totals.ppg.toFixed(1)],
                    ['RPG', totals.rpg.toFixed(1)],
                    ['APG', totals.apg.toFixed(1)],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-control border border-line bg-canvas/40 p-2 text-center">
                      <p className="stat-num text-lg text-ink">{value}</p>
                      <p className="text-[10px] uppercase tracking-wider text-ink-faint">{label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {liveMatch && liveScores && (
              <div className="rounded-card border border-danger/25 bg-surface p-4 shadow-card">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <Badge tone="live">Team live now</Badge>
                  <Link to="/live" className="text-xs font-semibold text-accent hover:underline">
                    Public scoreboard
                  </Link>
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
                  compact
                />
              </div>
            )}

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Points per game" value={totals.ppg.toFixed(1)} hint={`${totals.points} total points`} icon={TrendingUp} accent />
              <StatCard label="Field goal %" value={`${totals.fgPct}%`} hint={`${totals.fgm}/${totals.fga} attempts`} icon={Target} />
              <StatCard label="Rebounds" value={totals.rebounds} hint={`${totals.rpg.toFixed(1)} per game`} icon={Trophy} />
              <StatCard label="Assists" value={totals.assists} hint={`${totals.apg.toFixed(1)} per game`} icon={UserRound} />
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Scoring trend</CardTitle>
                    <p className="mt-0.5 text-xs text-ink-muted">Points in your last {lastFive.length} matches</p>
                  </div>
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/player/stats">Full log</Link>
                  </Button>
                </CardHeader>
                <CardContent className="pt-3">
                  <TrendChart
                    points={lastFive.map((entry) => ({
                      label: `vs ${entry.opponent?.shortName ?? 'OPP'}`,
                      value: entry.stats.points,
                    }))}
                    height={140}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Shooting splits</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-2 pt-3">
                  <DonutStat value={totals.fgPct} label="FG" sublabel={`${totals.fgm}/${totals.fga}`} />
                  <DonutStat value={totals.tpPct} label="3PT" sublabel={`${totals.tpm}/${totals.tpa}`} />
                  <DonutStat value={totals.ftPct} label="FT" sublabel={`${totals.ftm}/${totals.fta}`} />
                </CardContent>
              </Card>
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Recent games</CardTitle>
                    <p className="mt-0.5 text-xs text-ink-muted">Your latest recorded performances</p>
                  </div>
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/player/history">All games</Link>
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2 pt-3">
                  {gameLog.length === 0 ? (
                    <p className="rounded-control border border-dashed border-line px-3 py-6 text-center text-xs text-ink-faint">
                      No completed games yet. Your first box score appears after a match is finalised.
                    </p>
                  ) : (
                    lastFive
                      .slice()
                      .reverse()
                      .map((entry) => (
                        <div
                          key={entry.match.id}
                          className="flex items-center gap-3 rounded-control border border-line px-3 py-2.5"
                        >
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                              entry.won ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'
                            }`}
                          >
                            {entry.won ? 'W' : 'L'}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-ink">
                              {entry.isHome ? 'vs' : '@'} {entry.opponent?.shortName ?? 'Opponent'}
                            </p>
                            <p className="truncate text-[11px] text-ink-faint">
                              {formatDate(entry.match.tipoff)} · {entry.ownScore}–{entry.oppScore}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="stat-num text-sm text-ink">{entry.stats.points} PTS</p>
                            <p className="text-[10px] uppercase tracking-wider text-ink-faint">
                              {entry.stats.reb} REB · {entry.stats.ast} AST
                            </p>
                          </div>
                        </div>
                      ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Next up</CardTitle>
                    <p className="mt-0.5 text-xs text-ink-muted">Team fixtures</p>
                  </div>
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/player/team">Team</Link>
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2 pt-3">
                  {upcoming.length === 0 ? (
                    <p className="rounded-control border border-dashed border-line px-3 py-6 text-center text-xs text-ink-faint">
                      No upcoming fixtures.
                    </p>
                  ) : (
                    upcoming.slice(0, 3).map((match) => {
                      const opponent = opponentById.get(
                        match.homeTeamId === team.id ? match.awayTeamId : match.homeTeamId,
                      )
                      return (
                        <div
                          key={match.id}
                          className="rounded-control border border-line px-3 py-2.5"
                        >
                          <p className="truncate text-sm font-medium text-ink">
                            {match.homeTeamId === team.id ? 'vs' : '@'} {opponent?.shortName ?? 'Opponent'}
                          </p>
                          <p className="truncate text-[11px] text-ink-faint">
                            {formatDate(match.tipoff)} · {match.round}
                          </p>
                        </div>
                      )
                    })
                  )}
                  <div className="flex items-center gap-2 border-t border-line pt-2.5">
                    <Radio className="h-3.5 w-3.5 text-ink-faint" aria-hidden="true" />
                    <p className="text-[11px] text-ink-faint">Live scores update on the public scoreboard.</p>
                    <ArrowRight className="ml-auto h-3.5 w-3.5 text-ink-faint" aria-hidden="true" />
                  </div>
                </CardContent>
              </Card>
            </section>

            <p className="text-[11px] leading-relaxed text-ink-faint">
              Signed in as <span className="text-ink-muted">{user?.displayName}</span>. You can see your own
              record and published team information only.
            </p>
          </div>
        )
      }}
    </PlayerAreaGate>
  )
}
