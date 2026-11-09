import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  ShieldCheck,
  Trophy,
  Users,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatCard } from '@/components/stats/stat-card'
import { StatusPill } from '@/components/stats/status-pill'
import { EmptyState } from '@/components/ui/empty-state'
import { SkeletonCard } from '@/components/ui/skeleton'
import { useAdminData } from '@/features/admin/useAdminData'
import { matchScore } from '@/services/analytics/stats'
import { dataMode } from '@/services/repositories'
import { formatDate, formatTime } from '@/utils/format'

export function AdminOverviewPage() {
  const { data, loading, error, reload } = useAdminData()

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonCard lines={2} />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonCard key={index} lines={1} />
          ))}
        </div>
        <SkeletonCard lines={8} />
      </div>
    )
  }

  if (error) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Administration data could not be loaded"
        description={error}
        action={<Button onClick={reload}>Try again</Button>}
      />
    )
  }

  if (!data) {
    return (
      <EmptyState icon={ShieldCheck} title="No data" description="Administration data is unavailable." />
    )
  }

  const dutTeams = data.teams.filter((team) => team.id === 'team-men' || team.id === 'team-women')
  const liveMatches = data.matches.filter(
    (match) => match.status === 'live' || match.status === 'paused',
  )
  const upcoming = data.matches
    .filter((match) => match.status === 'scheduled')
    .sort((a, b) => a.tipoff.localeCompare(b.tipoff))
  const recent = data.matches
    .filter((match) => match.status === 'completed')
    .sort((a, b) => b.tipoff.localeCompare(a.tipoff))

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="System administration"
        title="Platform overview"
        description="Teams, users, competitions and match activity across the DUT Wolves programme."
        actions={
          <Badge tone={dataMode === 'firebase' ? 'success' : 'warning'}>
            {dataMode === 'firebase' ? 'Live' : 'Mock data'}
          </Badge>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Teams" value={dutTeams.length} hint="DUT Wolves men & women" icon={Users} accent />
        <StatCard label="Registered users" value={data.users.length} hint={`${data.users.filter((user) => user.role === 'player').length} player accounts`} icon={ShieldCheck} />
        <StatCard label="Competitions" value={data.competitions.length} hint={`${data.seasons.length} seasons configured`} icon={Trophy} />
        <StatCard label="Matches" value={data.matches.length} hint={`${recent.length} completed · ${upcoming.length} scheduled`} icon={CalendarDays} />
      </section>

      {liveMatches.length > 0 && (
        <section>
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
            <span className="h-1.5 w-1.5 animate-pulse-live rounded-full bg-danger" />
            Live now
          </h2>
          <div className="grid gap-2 md:grid-cols-2">
            {liveMatches.map((match) => {
              const home = data.teams.find((team) => team.id === match.homeTeamId)
              const away = data.teams.find((team) => team.id === match.awayTeamId)
              const score = matchScore(data.eventsByMatch.get(match.id) ?? [], match)
              if (!home || !away) return null
              return (
                <Card key={match.id}>
                  <CardContent className="flex items-center gap-3 pt-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">
                        {home.shortName} {score.home} – {score.away} {away.shortName}
                      </p>
                      <p className="text-[11px] text-ink-faint">
                        Q{match.period} · {match.round} · {match.venue}
                      </p>
                    </div>
                    <StatusPill status={match.status} />
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Recent fixtures</CardTitle>
              <p className="mt-0.5 text-xs text-ink-muted">Latest results across all teams</p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin/matches">
                All matches
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-3">
            {recent.length === 0 ? (
              <p className="rounded-control border border-dashed border-line px-3 py-6 text-center text-xs text-ink-faint">
                No completed matches.
              </p>
            ) : (
              <div className="space-y-2">
                {recent.slice(0, 6).map((match) => {
                  const home = data.teams.find((team) => team.id === match.homeTeamId)
                  const away = data.teams.find((team) => team.id === match.awayTeamId)
                  const score = matchScore(data.eventsByMatch.get(match.id) ?? [], match)
                  return (
                    <div
                      key={match.id}
                      className="flex items-center gap-3 rounded-control border border-line px-3 py-2.5"
                    >
                      <span className="stat-num w-16 shrink-0 text-[11px] text-ink-faint">
                        {formatDate(match.tipoff, { day: 'numeric', month: 'short' })}
                      </span>
                      <p className="min-w-0 flex-1 truncate text-xs text-ink">
                        {home?.shortName} <span className="stat-num text-ink-muted">{score.home}–{score.away}</span>{' '}
                        {away?.shortName}
                      </p>
                      <Badge tone="neutral">{match.round}</Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Upcoming fixtures</CardTitle>
              <p className="mt-0.5 text-xs text-ink-muted">Next scheduled matches</p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin/matches">Manage</Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-3">
            {upcoming.length === 0 ? (
              <p className="rounded-control border border-dashed border-line px-3 py-6 text-center text-xs text-ink-faint">
                Nothing scheduled.
              </p>
            ) : (
              <div className="space-y-2">
                {upcoming.slice(0, 6).map((match) => {
                  const home = data.teams.find((team) => team.id === match.homeTeamId)
                  const away = data.teams.find((team) => team.id === match.awayTeamId)
                  return (
                    <div
                      key={match.id}
                      className="flex items-center gap-3 rounded-control border border-line px-3 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-ink">
                          {home?.shortName} vs {away?.shortName}
                        </p>
                        <p className="truncate text-[11px] text-ink-faint">
                          {formatDate(match.tipoff)} · {formatTime(match.tipoff)} · {match.round}
                        </p>
                      </div>
                      <Badge tone="accent">Upcoming</Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Role coverage</CardTitle>
            <p className="mt-0.5 text-xs text-ink-muted">Accounts by role</p>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 pt-3 sm:grid-cols-4">
          {(['admin', 'manager', 'coach', 'player'] as const).map((role) => (
            <div key={role} className="rounded-control border border-line bg-canvas/40 p-3">
              <p className="stat-num text-xl text-ink">
                {data.users.filter((user) => user.role === role).length}
              </p>
              <p className="mt-0.5 text-[11px] capitalize tracking-wide text-ink-faint">{role}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <p className="flex items-center gap-2 text-[11px] text-ink-faint">
        <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
        Administration is read-only in Stage 1. User creation, role assignment and competition editing arrive
        with Firebase and Firestore security rules.
      </p>
    </div>
  )
}
