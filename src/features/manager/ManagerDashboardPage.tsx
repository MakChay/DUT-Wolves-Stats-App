import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  ClipboardList,
  Radio,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatCard } from '@/components/stats/stat-card'
import { Scoreboard } from '@/components/stats/scoreboard'
import { MatchCard } from '@/components/stats/match-card'
import { BarList, TrendChart } from '@/components/stats/charts'
import { EmptyState } from '@/components/ui/empty-state'
import { SkeletonCard } from '@/components/ui/skeleton'
import { useTeamScope } from '@/features/teams/TeamScopeContext'
import { useTeamAnalytics } from '@/features/statistics/useTeamAnalytics'
import { matchScore } from '@/services/analytics/stats'
import { formatDate, formatTime } from '@/utils/format'

export function ManagerDashboardPage() {
  const { teamId, loading: scopeLoading } = useTeamScope()
  const { data, loading, error, reload } = useTeamAnalytics(teamId)

  if (scopeLoading || loading) {
    return (
      <div className="space-y-5">
        <div className="h-16 w-64 animate-pulse rounded-card bg-white/5" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonCard key={index} lines={2} />
          ))}
        </div>
        <SkeletonCard lines={5} />
      </div>
    )
  }

  if (error) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Could not load the dashboard"
        description={error}
        action={<Button onClick={reload}>Try again</Button>}
      />
    )
  }

  if (!data) {
    return (
      <EmptyState
        icon={Users}
        title="No team assigned"
        description="This account is not linked to a team yet. An administrator can assign a team in the admin area."
      />
    )
  }

  const { team, liveMatch, upcoming, completed, record, playerRows, recentForm, eventsByMatch, opponentById } =
    data
  const liveScores = liveMatch ? matchScore(eventsByMatch.get(liveMatch.id) ?? [], liveMatch) : null
  const liveOpponent = liveMatch
    ? opponentById.get(liveMatch.homeTeamId === team.id ? liveMatch.awayTeamId : liveMatch.homeTeamId)
    : null

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Team overview"
        title={team.name}
        description="Live match control, squad readiness and season performance at a glance."
        actions={
          <>
            <Button asChild variant="secondary" size="md">
              <Link to="/manager/matches">
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                All matches
              </Link>
            </Button>
            <Button asChild size="md">
              <Link to="/manager/live">
                <Radio className="h-4 w-4" aria-hidden="true" />
                Live Match Centre
              </Link>
            </Button>
          </>
        }
      />

      {liveMatch && liveScores && liveOpponent ? (
        <section className="grid gap-3 lg:grid-cols-[1.6fr_1fr]">
          <div className="rounded-card border border-danger/25 bg-surface p-4 shadow-card">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Badge tone="live">Live now</Badge>
                <span className="text-xs text-ink-muted">{liveMatch.round}</span>
              </div>
              <span className="text-[11px] text-ink-faint">{liveMatch.venue}</span>
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
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-ink-muted">
                Recording is open. Continue the match to capture the next event.
              </p>
              <Button asChild size="md" className="sm:shrink-0">
                <Link to={`/manager/match/${liveMatch.id}`}>
                  Resume live match
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Match night actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 pt-3">
              <Link
                to={`/manager/match/${liveMatch.id}`}
                className="flex items-center gap-2.5 rounded-control border border-line px-2.5 py-2.5 text-xs font-medium text-ink transition hover:border-accent/40 hover:bg-accent/[0.06]"
              >
                <Radio className="h-4 w-4 text-accent" aria-hidden="true" />
                Record next event
                <ArrowRight className="ml-auto h-3.5 w-3.5 text-ink-faint" aria-hidden="true" />
              </Link>
              <Link
                to="/manager/rosters"
                className="flex items-center gap-2.5 rounded-control border border-line px-2.5 py-2.5 text-xs font-medium text-ink transition hover:border-accent/40 hover:bg-accent/[0.06]"
              >
                <ClipboardList className="h-4 w-4 text-ink-muted" aria-hidden="true" />
                Check match roster
                <ArrowRight className="ml-auto h-3.5 w-3.5 text-ink-faint" aria-hidden="true" />
              </Link>
              <Link
                to="/manager/stats"
                className="flex items-center gap-2.5 rounded-control border border-line px-2.5 py-2.5 text-xs font-medium text-ink transition hover:border-accent/40 hover:bg-accent/[0.06]"
              >
                <BarChart3 className="h-4 w-4 text-ink-muted" aria-hidden="true" />
                Review box score
                <ArrowRight className="ml-auto h-3.5 w-3.5 text-ink-faint" aria-hidden="true" />
              </Link>
            </CardContent>
          </Card>
        </section>
      ) : null}

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
          hint={`Opponents average ${record.oppPpg.toFixed(1)}`}
          icon={TrendingUp}
        />
        <StatCard
          label="Registered players"
          value={data.players.length}
          hint={`${data.players.filter((player) => player.isActive).length} active`}
          icon={Users}
        />
        <StatCard
          label="Team FG%"
          value={`${data.teamTotals.fgPct}%`}
          hint={`${data.teamTotals.fgm}/${data.teamTotals.fga} field goals`}
          icon={BarChart3}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Upcoming fixtures</CardTitle>
              <p className="mt-0.5 text-xs text-ink-muted">Next matches for {team.shortName}</p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/manager/matches">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 pt-3">
            {upcoming.length === 0 ? (
              <p className="rounded-control border border-dashed border-line px-3 py-6 text-center text-xs text-ink-faint">
                No fixtures scheduled. Add the next competition round.
              </p>
            ) : (
              upcoming.slice(0, 3).map((match) => {
                const opponent = opponentById.get(
                  match.homeTeamId === team.id ? match.awayTeamId : match.homeTeamId,
                )
                if (!opponent) return null
                return (
                  <div
                    key={match.id}
                    className="flex items-center gap-3 rounded-control border border-line px-3 py-2.5"
                  >
                    <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-control bg-canvas/60 text-center">
                      <span className="text-[9px] font-semibold uppercase text-ink-faint">
                        {formatDate(match.tipoff, { month: 'short' }).toUpperCase()}
                      </span>
                      <span className="stat-num text-sm leading-none text-ink">
                        {formatDate(match.tipoff, { day: 'numeric' })}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">vs {opponent.name}</p>
                      <p className="truncate text-[11px] text-ink-faint">
                        {match.round} · {formatTime(match.tipoff)} · {match.venue}
                      </p>
                    </div>
                    <Badge tone="accent">Upcoming</Badge>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Recent results</CardTitle>
              <p className="mt-0.5 text-xs text-ink-muted">Last completed matches</p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/manager/matches">History</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 pt-3">
            {completed.length === 0 ? (
              <p className="rounded-control border border-dashed border-line px-3 py-6 text-center text-xs text-ink-faint">
                Results appear once a match is completed.
              </p>
            ) : (
              completed
                .slice(-3)
                .reverse()
                .map((match) => {
                  const opponent = opponentById.get(
                    match.homeTeamId === team.id ? match.awayTeamId : match.homeTeamId,
                  )
                  if (!opponent) return null
                  const score = matchScore(eventsByMatch.get(match.id) ?? [], match)
                  const isHome = match.homeTeamId === team.id
                  const own = isHome ? score.home : score.away
                  const opp = isHome ? score.away : score.home
                  const won = own > opp
                  return (
                    <div
                      key={match.id}
                      className="flex items-center gap-3 rounded-control border border-line px-3 py-2.5"
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          won ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'
                        }`}
                      >
                        {won ? 'W' : 'L'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{opponent.shortName}</p>
                        <p className="truncate text-[11px] text-ink-faint">{formatDate(match.tipoff)}</p>
                      </div>
                      <span className="stat-num text-sm text-ink">
                        {own}–{opp}
                      </span>
                    </div>
                  )
                })
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Scoring trend</CardTitle>
              <p className="mt-0.5 text-xs text-ink-muted">Team points across recent matches</p>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <TrendChart points={recentForm} height={140} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Top performers</CardTitle>
              <p className="mt-0.5 text-xs text-ink-muted">Season points per game</p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/manager/stats">Full stats</Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-3">
            {playerRows.length === 0 ? (
              <p className="rounded-control border border-dashed border-line px-3 py-6 text-center text-xs text-ink-faint">
                Player statistics appear after the first completed match.
              </p>
            ) : (
              <BarList
                items={playerRows.slice(0, 5).map((row) => ({
                  label: `#${row.player.jerseyNumber} ${row.player.firstName} ${row.player.lastName}`,
                  value: row.totals.ppg,
                  meta: 'PPG',
                }))}
              />
            )}
          </CardContent>
        </Card>
      </section>

      {completed.length > 0 ? (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Latest match cards</h2>
            <Link to="/manager/matches" className="text-xs font-semibold text-accent hover:underline">
              All matches
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {completed
              .slice(-3)
              .reverse()
              .map((match) => {
                const home = opponentById.get(match.homeTeamId)
                const away = opponentById.get(match.awayTeamId)
                if (!home || !away) return null
                const score = matchScore(eventsByMatch.get(match.id) ?? [], match)
                return (
                  <MatchCard
                    key={match.id}
                    match={match}
                    homeTeam={home}
                    awayTeam={away}
                    homeScore={score.home}
                    awayScore={score.away}
                    to="/manager/matches"
                  />
                )
              })}
          </div>
        </section>
      ) : null}
    </div>
  )
}
