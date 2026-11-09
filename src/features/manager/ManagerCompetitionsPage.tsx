import { Trophy, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { SkeletonCard } from '@/components/ui/skeleton'
import { StatusPill } from '@/components/stats/status-pill'
import { repositories } from '@/services/repositories'
import { useAsync } from '@/hooks/useAsync'
import { useTeamScope } from '@/features/teams/TeamScopeContext'
import type { Competition, Match, Season, Team } from '@/types/domain'
import { formatDate } from '@/utils/format'

interface CompetitionsData {
  competitions: Competition[]
  seasons: Season[]
  matches: Match[]
  teams: Team[]
  teamId: string
}

async function loadCompetitions(teamId: string): Promise<CompetitionsData> {
  const [competitions, seasons, matches, teams] = await Promise.all([
    repositories.competitions.list(),
    repositories.competitions.listSeasons(),
    repositories.matches.listByTeam(teamId),
    repositories.teams.list(),
  ])
  return { competitions, seasons, matches, teams, teamId }
}

export function ManagerCompetitionsPage() {
  const { teamId, loading: scopeLoading } = useTeamScope()
  const { data, loading, error, reload } = useAsync<CompetitionsData | null>(
    () => (teamId ? loadCompetitions(teamId) : Promise.resolve(null)),
    [teamId],
  )

  if (scopeLoading || loading) {
    return (
      <div className="space-y-4">
        <SkeletonCard lines={2} />
        <div className="grid gap-4 lg:grid-cols-2">
          <SkeletonCard lines={5} />
          <SkeletonCard lines={5} />
        </div>
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

  if (!data) {
    return (
      <EmptyState
        icon={Users}
        title="No team assigned"
        description="This account is not linked to a team yet."
      />
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Competition management"
        title="Competitions & seasons"
        description="Every fixture belongs to a competition and a season. Competition setup is managed by the system administrator."
      />

      <p className="rounded-card border border-line bg-surface/60 px-4 py-3 text-xs leading-relaxed text-ink-muted">
        You can review competition details, fixtures and results here. Creating competitions and publishing
        fixtures is handled by the system administrator from the admin workspace.
      </p>

      <div className="space-y-4">
        {data.competitions.map((competition) => {
          const season = data.seasons.find((entry) => entry.id === competition.seasonId)
          const matches = data.matches
            .filter((match) => match.competitionId === competition.id)
            .sort((a, b) => a.tipoff.localeCompare(b.tipoff))
          const completed = matches.filter((match) => match.status === 'completed').length

          return (
            <Card key={competition.id}>
              <CardHeader>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle>{competition.name}</CardTitle>
                    <Badge tone={competition.type === 'league' ? 'accent' : 'warning'}>
                      {competition.type === 'league' ? 'League' : 'Tournament'}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-ink-muted">
                    {season?.name ?? 'Season not set'} · {formatDate(competition.startDate)} –{' '}
                    {formatDate(competition.endDate)}
                  </p>
                </div>
                <Badge tone={competition.publicVisible ? 'success' : 'neutral'}>
                  {competition.publicVisible ? 'Public' : 'Hidden'}
                </Badge>
              </CardHeader>
              <CardContent className="pt-3">
                {matches.length === 0 ? (
                  <p className="rounded-control border border-dashed border-line px-3 py-6 text-center text-xs text-ink-faint">
                    No fixtures for this competition yet.
                  </p>
                ) : (
                  <>
                    <div className="mb-2 flex items-center justify-between text-[11px] text-ink-faint">
                      <span>{matches.length} fixtures · {completed} completed</span>
                      <span>All times SAST</span>
                    </div>
                    <ul className="space-y-1">
                      {matches.map((match) => {
                        const opponentId =
                          match.homeTeamId === data.teamId ? match.awayTeamId : match.homeTeamId
                        const opponent = data.teams.find((team) => team.id === opponentId)
                        const isHome = match.homeTeamId === data.teamId
                        return (
                          <li
                            key={match.id}
                            className="flex flex-wrap items-center gap-2 rounded-control border border-line/70 px-2.5 py-2"
                          >
                            <span className="stat-num w-16 shrink-0 text-[11px] text-ink-faint">
                              {formatDate(match.tipoff, { day: 'numeric', month: 'short' })}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink">
                              {isHome ? 'vs' : '@'} {opponent?.name ?? 'Opponent'}
                            </span>
                            <Badge tone="neutral">{match.round ?? 'Fixture'}</Badge>
                            <StatusPill status={match.status} />
                          </li>
                        )
                      })}
                    </ul>
                  </>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Button asChild variant="secondary">
        <Link to="/manager/matches">Back to matches</Link>
      </Button>
    </div>
  )
}
