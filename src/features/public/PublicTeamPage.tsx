import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarDays,
  Image as ImageIcon,
  Shield,
  Trophy,
  UserRound,
  Users,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { PlayerAvatar } from '@/components/stats/player-avatar'
import { PublicGate } from '@/features/public/PublicGate'
import {
  genderLabel,
  heroMediaForTeam,
  mediaForTeam,
  scoreOf,
  standingsForGender,
} from '@/features/public/publicUtils'
import type { PublicData } from '@/features/public/usePublicData'
import type { Team } from '@/types/domain'
import { OFFICIAL_STAFF } from '@/data/roster'
import { formatDate, formatTime } from '@/utils/format'

function staffFor(team: Team) {
  if (team.id === 'team-men') {
    return [
      ...OFFICIAL_STAFF.menCoaches.map((coach) => ({ name: coach.name, title: coach.title })),
      { name: OFFICIAL_STAFF.menManager.name, title: 'Team Manager' },
    ]
  }
  if (team.id === 'team-women') {
    return [
      ...OFFICIAL_STAFF.womenCoaches.map((coach) => ({ name: coach.name, title: coach.title })),
      { name: OFFICIAL_STAFF.womenManager.name, title: 'Team Manager' },
    ]
  }
  return []
}

function TeamDetailContent({ data, team }: { data: PublicData; team: Team }) {
  const hero = heroMediaForTeam(data, team.id)
  const gallery = mediaForTeam(data, team.id)
  const roster = data.players.filter((player) => player.teamId === team.id)
  const publicRoster = roster.filter((player) => player.publicVisible && player.isActive)
  const standing = standingsForGender(data, team.gender).find((row) => row.teamId === team.id)
  const matches = data.matches
    .filter((match) => match.homeTeamId === team.id || match.awayTeamId === team.id)
    .sort((a, b) => a.tipoff.localeCompare(b.tipoff))
  const upcoming = matches.filter((match) => match.status === 'scheduled' || match.status === 'live')
  const results = matches
    .filter((match) => match.status === 'completed')
    .sort((a, b) => b.tipoff.localeCompare(a.tipoff))
  const staff = staffFor(team)
  const isDut = team.id === 'team-men' || team.id === 'team-women'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/teams">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            All teams
          </Link>
        </Button>
        <Badge tone={isDut ? 'accent' : 'neutral'}>
          {isDut ? 'DUT Wolves' : 'Opponent'} · {genderLabel(team.gender)}
        </Badge>
      </div>

      <section className="relative overflow-hidden rounded-card border border-line bg-sidebar">
        {hero ? (
          <img
            src={hero.url}
            alt={hero.caption ?? team.name}
            className="absolute inset-0 h-full w-full object-cover opacity-45"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-r from-sidebar via-sidebar/85 to-sidebar/40" aria-hidden="true" />
        <div className="relative grid gap-6 p-5 sm:p-8 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-accent">
              {team.homeVenue ?? 'DUT Wolves Basketball'}
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink text-balance sm:text-4xl">
              {team.name}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-muted">
              {team.description ??
                `${genderLabel(team.gender)} squad profile, fixtures, results and published player statistics.`}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {standing ? (
                <>
                  <span className="rounded-control border border-line bg-canvas/60 px-3 py-1.5 text-xs font-semibold text-ink">
                    {standing.wins}–{standing.losses}
                  </span>
                  <span className="rounded-control border border-line bg-canvas/60 px-3 py-1.5 text-xs text-ink-muted">
                    {standing.played} played
                  </span>
                  <span className="rounded-control border border-line bg-canvas/60 px-3 py-1.5 text-xs text-ink-muted">
                    {standing.pointsFor} PF · {standing.pointsAgainst} PA
                  </span>
                </>
              ) : (
                <span className="rounded-control border border-line bg-canvas/60 px-3 py-1.5 text-xs text-ink-faint">
                  No completed matches
                </span>
              )}
              {team.coachIds.length ? (
                <span className="inline-flex items-center gap-1 rounded-control border border-line bg-canvas/60 px-3 py-1.5 text-xs text-ink-muted">
                  <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                  {team.coachIds.length} coach{team.coachIds.length === 1 ? '' : 'es'}
                </span>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Squad', value: publicRoster.length },
              { label: 'Fixtures', value: upcoming.length },
              { label: 'Results', value: results.length },
            ].map((item) => (
              <div key={item.label} className="rounded-control border border-line bg-canvas/60 px-3 py-2.5 text-center">
                <p className="stat-num text-2xl text-ink">{item.value}</p>
                <p className="text-[10px] uppercase tracking-wider text-ink-faint">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Public roster</CardTitle>
            <Badge tone="neutral">{publicRoster.length}</Badge>
          </CardHeader>
          <CardContent className="pt-3">
            {publicRoster.length === 0 ? (
              <p className="py-6 text-center text-xs text-ink-faint">
                No public player profiles for this team yet.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {publicRoster.map((player) => (
                  <Link
                    key={player.id}
                    to={`/players/${player.id}`}
                    className="flex items-center gap-2.5 rounded-control border border-line/70 px-2.5 py-2 transition hover:border-accent/50"
                  >
                    <PlayerAvatar player={player} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-ink">
                        {player.firstName} {player.lastName}
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-ink-faint">
                        {player.jerseyNumber !== null ? `#${player.jerseyNumber}` : 'No jersey'}
                        {player.position ? ` · ${player.position}` : ''}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            {roster.length > publicRoster.length ? (
              <p className="mt-2 text-[11px] text-ink-faint">
                {roster.length - publicRoster.length} squad member
                {roster.length - publicRoster.length === 1 ? '' : 's'} have not published a public
                profile.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {staff.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Team staff</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-3">
                {staff.map((member) => (
                  <div
                    key={`${member.name}-${member.title}`}
                    className="flex items-center justify-between gap-2 rounded-control border border-line/70 px-3 py-2"
                  >
                    <p className="text-xs font-medium text-ink">{member.name}</p>
                    <p className="text-[10px] uppercase tracking-wider text-ink-faint">
                      {member.title}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Team photography</CardTitle>
              <Badge tone="neutral">{gallery.length}</Badge>
            </CardHeader>
            <CardContent className="pt-3">
              {gallery.length === 0 ? (
                <p className="flex flex-col items-center gap-2 py-6 text-center text-xs text-ink-faint">
                  <ImageIcon className="h-5 w-5" aria-hidden="true" />
                  No published team photography yet.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {gallery.slice(0, 4).map((asset) => (
                    <img
                      key={asset.id}
                      src={asset.thumbnailUrl ?? asset.url}
                      alt={asset.caption ?? asset.title}
                      className="aspect-square w-full rounded-control object-cover"
                      loading="lazy"
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming</CardTitle>
            <CalendarDays className="h-4 w-4 text-ink-faint" aria-hidden="true" />
          </CardHeader>
          <CardContent className="space-y-2 pt-3">
            {upcoming.length === 0 ? (
              <p className="py-4 text-center text-xs text-ink-faint">No upcoming fixtures.</p>
            ) : (
              upcoming.slice(0, 5).map((match) => {
                const opponentId = match.homeTeamId === team.id ? match.awayTeamId : match.homeTeamId
                const opponent = data.teamById.get(opponentId)
                return (
                  <div
                    key={match.id}
                    className="flex items-center justify-between gap-2 rounded-control border border-line/70 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-ink">
                        {match.homeTeamId === team.id ? 'vs' : 'at'}{' '}
                        {opponent?.name ?? 'Opponent'}
                      </p>
                      <p className="text-[10px] text-ink-faint">
                        {formatDate(match.tipoff, { day: 'numeric', month: 'short' })} ·{' '}
                        {formatTime(match.tipoff)} · {match.venue}
                      </p>
                    </div>
                    {match.status === 'live' || match.status === 'paused' ? (
                      <Badge tone="danger">Live</Badge>
                    ) : (
                      <Badge tone="neutral">{match.round ?? 'Fixture'}</Badge>
                    )}
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent results</CardTitle>
            <Trophy className="h-4 w-4 text-ink-faint" aria-hidden="true" />
          </CardHeader>
          <CardContent className="space-y-2 pt-3">
            {results.length === 0 ? (
              <p className="py-4 text-center text-xs text-ink-faint">No completed matches.</p>
            ) : (
              results.slice(0, 5).map((match) => {
                const score = scoreOf(data, match)
                const isHome = match.homeTeamId === team.id
                const own = isHome ? score.home : score.away
                const other = isHome ? score.away : score.home
                const opponentId = isHome ? match.awayTeamId : match.homeTeamId
                const opponent = data.teamById.get(opponentId)
                return (
                  <div
                    key={match.id}
                    className="flex items-center justify-between gap-2 rounded-control border border-line/70 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-ink">
                        {isHome ? 'vs' : 'at'} {opponent?.shortName ?? 'Opponent'}
                      </p>
                      <p className="text-[10px] text-ink-faint">
                        {formatDate(match.tipoff, { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <span
                      className={
                        own > other
                          ? 'stat-num text-sm font-semibold text-success'
                          : own < other
                            ? 'stat-num text-sm font-semibold text-danger'
                            : 'stat-num text-sm font-semibold text-ink-muted'
                      }
                    >
                      {own}–{other}
                    </span>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>

      <p className="flex items-center gap-2 text-[11px] text-ink-faint">
        <Users className="h-3.5 w-3.5" aria-hidden="true" />
        Public team pages show published profiles only. Private player data stays in the workspace.
      </p>
    </div>
  )
}

export function PublicTeamPage() {
  const { teamId } = useParams()
  return (
    <PublicGate>
      {(data) => {
        const team = teamId ? data.teamById.get(teamId) : null
        if (!team || !team.publicVisible) {
          return (
            <EmptyState
              icon={Shield}
              title="Team not found"
              description="This team is not published on the public site."
              action={
                <Button asChild>
                  <Link to="/teams">Back to teams</Link>
                </Button>
              }
            />
          )
        }
        return <TeamDetailContent data={data} team={team} />
      }}
    </PublicGate>
  )
}
