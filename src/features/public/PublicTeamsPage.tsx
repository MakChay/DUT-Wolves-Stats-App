import { Link } from 'react-router-dom'
import { Users } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { PlayerAvatar } from '@/components/stats/player-avatar'
import { PublicGate } from '@/features/public/PublicGate'
import { PublicTeamSwitch, usePublicGender } from '@/features/public/PublicTeamSwitch'
import {
  PublicCompetitionFilter,
  usePublicCompetitionFilter,
  usePublicHref,
} from '@/features/public/PublicCompetitionFilter'
import {
  filterByCompetition,
  genderLabel,
  matchesForGender,
  standingsByCompetitionForGender,
  teamsForGender,
} from '@/features/public/publicUtils'
import type { PublicData } from '@/features/public/usePublicData'
import type { TeamGender } from '@/types/domain'
import { jerseyLabel } from '@/types/domain'

function TeamsContent({
  data,
  gender,
  setGender,
}: {
  data: PublicData
  gender: TeamGender
  setGender: (gender: TeamGender) => void
}) {
  const href = usePublicHref()
  const { competitions, competitionId, setCompetitionId } = usePublicCompetitionFilter(data, gender)
  const competitionMatches = filterByCompetition(matchesForGender(data, gender), competitionId)
  const participatingIds = new Set(
    competitionMatches.flatMap((match) => [match.homeTeamId, match.awayTeamId]),
  )
  const teams = teamsForGender(data, gender).filter(
    (team) => !competitionId || participatingIds.has(team.id),
  )
  const standingsByCompetition = standingsByCompetitionForGender(data, gender)
  const standingsEntry = competitionId
    ? standingsByCompetition.find((entry) => entry.competition.id === competitionId)
    : standingsByCompetition.find((entry) => entry.completed > 0) ?? standingsByCompetition[0]
  const standings = standingsEntry?.rows ?? []
  const dutTeam = teams.find((team) => team.id === 'team-men' || team.id === 'team-women')

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Teams"
        title={`${genderLabel(gender)} teams`}
        description={`Squads in ${
          standingsEntry ? standingsEntry.competition.name : 'all tournaments'
        }. Only players who have opted in to a public profile are listed.`}
        actions={
          <>
            <PublicCompetitionFilter
              competitions={competitions}
              value={competitionId}
              onChange={setCompetitionId}
            />
            <PublicTeamSwitch gender={gender} onChange={setGender} />
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {teams.map((team) => {
          const roster = data.players.filter((player) => player.teamId === team.id)
          const publicRoster = roster.filter((player) => player.publicVisible && player.isActive)
          const standing = standings.find((row) => row.teamId === team.id)
          const isDut = team.id === 'team-men' || team.id === 'team-women'
          return (
            <Card key={team.id}>
              <CardHeader>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle>
                      <Link to={href(`/teams/${team.id}`)} className="transition hover:text-accent">
                        {team.name}
                      </Link>
                    </CardTitle>
                    {isDut ? <Badge tone="accent">DUT Wolves</Badge> : <Badge tone="neutral">Opponent</Badge>}
                  </div>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {standing
                      ? `${standingsEntry?.competition.shortName ?? 'Tournament'}: ${standing.wins}–${standing.losses} · ${standing.played} played`
                      : 'No completed matches'}
                    {team.id === dutTeam?.id ? ' · Home team' : ''}
                  </p>
                </div>
                <Users className="h-4 w-4 text-ink-faint" aria-hidden="true" />
              </CardHeader>
              <CardContent className="pt-3">
                {publicRoster.length === 0 ? (
                  <p className="rounded-control border border-dashed border-line px-3 py-6 text-center text-xs text-ink-faint">
                    No public player profiles for this team.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {publicRoster.map((player) => (
                      <Link
                        key={player.id}
                        to={href(`/players/${player.id}`)}
                        className="flex items-center gap-2.5 rounded-control border border-line/70 px-2.5 py-2 transition hover:border-accent/50"
                      >
                        <PlayerAvatar player={player} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-ink">
                            {player.firstName} {player.lastName}
                          </p>
                          <p className="text-[10px] uppercase tracking-wider text-ink-faint">
                            {jerseyLabel(player.jerseyNumber)}
                            {player.position ? ` · ${player.position}` : ''}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
                {roster.length > publicRoster.length ? (
                  <p className="mt-2 text-[11px] text-ink-faint">
                    {roster.length - publicRoster.length} squad members have not published a public profile.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {teams.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No teams published"
          description="Team information is not available for this tournament."
        />
      ) : null}
    </div>
  )
}

export function PublicTeamsPage() {
  const [gender, setGender] = usePublicGender()
  return (
    <PublicGate>
      {(data) => <TeamsContent data={data} gender={gender} setGender={setGender} />}
    </PublicGate>
  )
}
