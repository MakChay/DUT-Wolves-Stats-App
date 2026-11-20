import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, MapPin, Trophy } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Scoreboard } from '@/components/stats/scoreboard'
import { StatusPill } from '@/components/stats/status-pill'
import { Table, TableWrap, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { PublicGate } from '@/features/public/PublicGate'
import { usePublicHref } from '@/features/public/PublicCompetitionFilter'
import { playerGameStats, scoreOf } from '@/features/public/publicUtils'
import type { PublicData } from '@/features/public/usePublicData'
import { deriveTeamGameStats } from '@/services/analytics/stats'
import type { Match, PlayerGameStats, TeamGameStats } from '@/types/domain'
import { formatDate, formatTime } from '@/utils/format'

function TeamStatsRow({ stats, teamName }: { stats: TeamGameStats; teamName: string }) {
  return (
    <TR>
      <TD className="font-medium text-ink">{teamName}</TD>
      <TD className="stat-num text-center text-ink">{stats.points}</TD>
      <TD className="stat-num text-center">{stats.fgm}/{stats.fga}</TD>
      <TD className="stat-num text-center">{stats.tpm}/{stats.tpa}</TD>
      <TD className="stat-num text-center">{stats.ftm}/{stats.fta}</TD>
      <TD className="stat-num text-center">{stats.reb}</TD>
      <TD className="stat-num text-center">{stats.ast}</TD>
      <TD className="stat-num text-center">{stats.stl}</TD>
      <TD className="stat-num text-center">{stats.blk}</TD>
      <TD className="stat-num text-center">{stats.tov}</TD>
      <TD className="stat-num text-center">{stats.pf}</TD>
    </TR>
  )
}

function MatchContent({ data, match }: { data: PublicData; match: Match }) {
  const href = usePublicHref()
  const home = data.teamById.get(match.homeTeamId)
  const away = data.teamById.get(match.awayTeamId)
  const competition = data.competitionById.get(match.competitionId)
  const snapshot = data.snapshotsByMatch.get(match.id)
  const score = scoreOf(data, match)
  const events = data.eventsByMatch.get(match.id) ?? []
  const homeStats =
    snapshot?.homeStats ?? deriveTeamGameStats(events, match.homeTeamId, match.id)
  const awayStats =
    snapshot?.awayStats ?? deriveTeamGameStats(events, match.awayTeamId, match.id)

  const playerRows: PlayerGameStats[] = data.players
    .filter((player) => player.teamId === match.homeTeamId || player.teamId === match.awayTeamId)
    .map((player) => playerGameStats(data, match, player.id, player.teamId))
    .filter((row) =>
      [row.points, row.fgm, row.fga, row.reb, row.ast, row.stl, row.blk, row.tov, row.pf].some(
        (value) => value > 0,
      ),
    )
    .sort((a, b) => b.points - a.points || b.reb - a.reb)

  const completed = match.status === 'completed'
  const live = match.status === 'live' || match.status === 'paused'

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to={href(completed ? '/results' : '/fixtures')}>
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            {completed ? 'Results' : 'Fixtures'}
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <StatusPill status={match.status} />
          <Badge tone="neutral">{competition?.shortName ?? 'Competition'}</Badge>
        </div>
      </div>

      <PageHeader
        eyebrow={competition?.name ?? 'Match centre'}
        title={`${home?.name ?? 'Home'} vs ${away?.name ?? 'Away'}`}
        description={`${formatDate(match.tipoff)} · ${formatTime(match.tipoff)} · ${match.venue}`}
      />

      <Scoreboard
        homeTeam={home ?? { name: 'Home', shortName: 'Home' }}
        awayTeam={away ?? { name: 'Away', shortName: 'Away' }}
        homeScore={score.home}
        awayScore={score.away}
        period={match.period}
        clockSeconds={match.clockSeconds}
        status={match.status}
        competition={match.round ?? competition?.shortName}
      />

      <div className="grid gap-2 text-[11px] text-ink-faint sm:grid-cols-2">
        <p className="inline-flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
          {formatDate(match.tipoff)} · {formatTime(match.tipoff)}
        </p>
        <p className="inline-flex items-center gap-1.5 sm:justify-end">
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
          {match.venue}
        </p>
      </div>

      {!completed && !live ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Trophy className="mx-auto h-6 w-6 text-ink-faint" aria-hidden="true" />
            <p className="mt-2 text-sm font-semibold text-ink">Box score not available yet</p>
            <p className="mt-1 text-xs text-ink-muted">
              The match centre will show team and player statistics once the game is completed.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {snapshot?.source === 'manual' ? (
            <p className="rounded-card border border-line bg-surface/60 px-4 py-3 text-[11px] leading-relaxed text-ink-faint">
              This result was entered by the tournament administrator. Team totals are final; player-level
              statistics are available for DUT matches scored in the Live Match Centre.
            </p>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Team box score</CardTitle>
              {snapshot ? <Badge tone="success">Final snapshot</Badge> : <Badge tone="neutral">Live</Badge>}
            </CardHeader>
            <CardContent className="pt-3">
              <TableWrap>
                <Table>
                  <THead>
                    <tr>
                      <TH>Team</TH>
                      <TH className="text-center">PTS</TH>
                      <TH className="text-center">FG</TH>
                      <TH className="text-center">3P</TH>
                      <TH className="text-center">FT</TH>
                      <TH className="text-center">REB</TH>
                      <TH className="text-center">AST</TH>
                      <TH className="text-center">STL</TH>
                      <TH className="text-center">BLK</TH>
                      <TH className="text-center">TO</TH>
                      <TH className="text-center">PF</TH>
                    </tr>
                  </THead>
                  <TBody>
                    <TeamStatsRow stats={homeStats} teamName={home?.shortName ?? 'Home'} />
                    <TeamStatsRow stats={awayStats} teamName={away?.shortName ?? 'Away'} />
                  </TBody>
                </Table>
              </TableWrap>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>DUT Wolves player box score</CardTitle>
              <Badge tone="neutral">{playerRows.length} players</Badge>
            </CardHeader>
            <CardContent className="pt-3">
              {playerRows.length === 0 ? (
                <p className="py-6 text-center text-xs text-ink-faint">
                  No DUT player statistics are recorded for this game.
                </p>
              ) : (
                <TableWrap>
                  <Table>
                    <THead>
                      <tr>
                        <TH>Player</TH>
                        <TH className="text-center">PTS</TH>
                        <TH className="text-center">REB</TH>
                        <TH className="text-center">AST</TH>
                        <TH className="text-center">STL</TH>
                        <TH className="text-center">BLK</TH>
                        <TH className="text-center">TO</TH>
                        <TH className="text-center">PF</TH>
                      </tr>
                    </THead>
                    <TBody>
                      {playerRows.map((row) => {
                        const player = data.playerById.get(row.playerId)
                        return (
                          <TR key={row.playerId}>
                            <TD>
                              {player ? `${player.firstName} ${player.lastName}` : row.playerId}
                            </TD>
                            <TD className="stat-num text-center text-ink">{row.points}</TD>
                            <TD className="stat-num text-center">{row.reb}</TD>
                            <TD className="stat-num text-center">{row.ast}</TD>
                            <TD className="stat-num text-center">{row.stl}</TD>
                            <TD className="stat-num text-center">{row.blk}</TD>
                            <TD className="stat-num text-center">{row.tov}</TD>
                            <TD className="stat-num text-center">{row.pf}</TD>
                          </TR>
                        )
                      })}
                    </TBody>
                  </Table>
                </TableWrap>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <p className="text-[11px] leading-relaxed text-ink-faint">
        Public match pages show published results only. Private player information, reports and injury
        records stay inside the team workspace.
      </p>
    </div>
  )
}

export function PublicMatchPage() {
  const { matchId } = useParams()
  const href = usePublicHref()
  return (
    <PublicGate>
      {(data) => {
        const match = matchId ? data.matches.find((entry) => entry.id === matchId) : null
        if (!match) {
          return (
            <EmptyState
              icon={CalendarDays}
              title="Match not found"
              description="This match is not published, or the link is no longer valid."
              action={
                <Button asChild>
                  <Link to={href('/fixtures')}>Back to fixtures</Link>
                </Button>
              }
            />
          )
        }
        return <MatchContent data={data} match={match} />
      }}
    </PublicGate>
  )
}
