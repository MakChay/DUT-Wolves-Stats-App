import type { Match, MatchEvent, MatchRoster, Player, Team } from '@/types/domain'
import { EVENT_POINTS } from '@/types/domain'
import {
  derivePlayerGameStats,
  deriveTeamGameStats,
  matchScore,
} from '@/services/analytics/stats'
import { Scoreboard } from '@/components/stats/scoreboard'
import { Table, TableWrap, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { formatDate, formatTime } from '@/utils/format'
import { isDutTeamId } from '@/types/domain'

export interface BoxScoreRow {
  player: Player
  stats: ReturnType<typeof derivePlayerGameStats>
}

export function buildBoxScore(
  match: Match,
  events: MatchEvent[],
  rosters: MatchRoster[],
  players: Player[],
  teamId: string,
): BoxScoreRow[] {
  const roster = rosters.filter((entry) => entry.matchId === match.id && entry.teamId === teamId)
  return roster
    .map((entry) => {
      const player = players.find((row) => row.id === entry.playerId) ?? {
        id: entry.playerId,
        teamId: entry.teamId,
        firstName: '',
        lastName: '',
        jerseyNumber: entry.jerseyNumber,
        position: null,
        availability: entry.isActive ? 'active' : 'unavailable',
        isActive: entry.isActive,
        publicVisible: false,
        numberOnly: true,
      }
      return {
        player,
        stats: derivePlayerGameStats(events, player.id, teamId, match.id),
      }
    })
    .filter((row): row is BoxScoreRow => Boolean(row))
    .sort((a, b) => b.stats.points - a.stats.points)
}

export function periodScores(match: Match, events: MatchEvent[]) {
  return [1, 2, 3, 4].map((period) => {
    const periodEvents = events.filter(
      (event) => event.matchId === match.id && !event.voided && event.period === period,
    )
    const sum = (teamId: string) =>
      periodEvents
        .filter((event) => event.teamId === teamId)
        .reduce((total, event) => total + (event.points ?? EVENT_POINTS[event.type] ?? 0), 0)
    return {
      period,
      home: sum(match.homeTeamId),
      away: sum(match.awayTeamId),
    }
  })
}

interface MatchReportProps {
  match: Match
  events: MatchEvent[]
  rosters: MatchRoster[]
  players: Player[]
  homeTeam: Team
  awayTeam: Team
  compact?: boolean
}

function TeamBoxScore({
  team,
  rows,
  match,
  events,
}: {
  team: Team
  rows: BoxScoreRow[]
  match: Match
  events: MatchEvent[]
}) {
  const totals = deriveTeamGameStats(events, team.id, match.id)
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-ink">{team.name}</h3>
        <span className="stat-num text-sm text-accent">{totals.points} PTS</span>
      </div>
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
              <TH className="text-center">FG</TH>
              <TH className="text-center">3PT</TH>
              <TH className="text-center">FT</TH>
            </tr>
          </THead>
          <TBody>
            {rows.map((row) => (
              <TR key={row.player.id}>
                <TD>
                  <span className="inline-flex items-baseline gap-1.5">
                    <span className="stat-num text-[11px] text-ink-faint">#{row.player.jerseyNumber}</span>
                    <span className="font-medium text-ink">
                      {row.player.firstName} {row.player.lastName}
                    </span>
                  </span>
                </TD>
                <TD className="stat-num text-center text-ink">{row.stats.points}</TD>
                <TD className="stat-num text-center">{row.stats.reb}</TD>
                <TD className="stat-num text-center">{row.stats.ast}</TD>
                <TD className="stat-num text-center">{row.stats.stl}</TD>
                <TD className="stat-num text-center">{row.stats.blk}</TD>
                <TD className="stat-num text-center">{row.stats.tov}</TD>
                <TD className="stat-num text-center">{row.stats.pf}</TD>
                <TD className="stat-num text-center">
                  {row.stats.fgm}/{row.stats.fga}
                </TD>
                <TD className="stat-num text-center">
                  {row.stats.tpm}/{row.stats.tpa}
                </TD>
                <TD className="stat-num text-center">
                  {row.stats.ftm}/{row.stats.fta}
                </TD>
              </TR>
            ))}
            <TR className="bg-canvas/40">
              <TD className="font-semibold text-ink">Team totals</TD>
              <TD className="stat-num text-center font-semibold text-ink">{totals.points}</TD>
              <TD className="stat-num text-center font-semibold text-ink">{totals.reb}</TD>
              <TD className="stat-num text-center font-semibold text-ink">{totals.ast}</TD>
              <TD className="stat-num text-center font-semibold text-ink">{totals.stl}</TD>
              <TD className="stat-num text-center font-semibold text-ink">{totals.blk}</TD>
              <TD className="stat-num text-center font-semibold text-ink">{totals.tov}</TD>
              <TD className="stat-num text-center font-semibold text-ink">{totals.pf}</TD>
              <TD className="stat-num text-center font-semibold text-ink">
                {totals.fgm}/{totals.fga}
              </TD>
              <TD className="stat-num text-center font-semibold text-ink">
                {totals.tpm}/{totals.tpa}
              </TD>
              <TD className="stat-num text-center font-semibold text-ink">
                {totals.ftm}/{totals.fta}
              </TD>
            </TR>
          </TBody>
        </Table>
      </TableWrap>
    </div>
  )
}

export function MatchReport({ match, events, rosters, players, homeTeam, awayTeam, compact }: MatchReportProps) {
  const score = matchScore(events, match)
  const dutTeam = isDutTeamId(homeTeam.id) ? homeTeam : awayTeam
  const dutRows = buildBoxScore(match, events, rosters, players, dutTeam.id)
  const periods = periodScores(match, events)

  return (
    <div className="space-y-5">
      <Scoreboard
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        homeScore={score.home}
        awayScore={score.away}
        period={match.period}
        clockSeconds={match.clockSeconds}
        status={match.status}
        competition={`${match.round ?? 'Match'} · ${formatDate(match.tipoff)} · ${formatTime(match.tipoff)}`}
        compact={compact}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <TableWrap>
          <Table>
            <THead>
              <tr>
                <TH>Period</TH>
                <TH className="text-center">{homeTeam.shortName}</TH>
                <TH className="text-center">{awayTeam.shortName}</TH>
              </tr>
            </THead>
            <TBody>
              {periods.map((row) => (
                <TR key={row.period}>
                  <TD className="text-ink">Q{row.period}</TD>
                  <TD className="stat-num text-center">{row.home}</TD>
                  <TD className="stat-num text-center">{row.away}</TD>
                </TR>
              ))}
              <TR className="bg-canvas/40">
                <TD className="font-semibold text-ink">Final</TD>
                <TD className="stat-num text-center font-semibold text-ink">{score.home}</TD>
                <TD className="stat-num text-center font-semibold text-ink">{score.away}</TD>
              </TR>
            </TBody>
          </Table>
        </TableWrap>

        <div className="rounded-card border border-line bg-surface p-4">
          <p className="label-caps mb-2">Opponent tracking</p>
          <p className="text-sm font-semibold text-ink">{dutTeam.id === homeTeam.id ? awayTeam.name : homeTeam.name}</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">
            Final and period scores are tracked for this opponent. Player-level opponent statistics are not collected.
          </p>
          <p className="mt-3 border-t border-line pt-2 text-[11px] text-ink-faint">
            {match.venue} · {homeTeam.shortName} vs {awayTeam.shortName}
          </p>
        </div>
      </div>

      <TeamBoxScore team={dutTeam} rows={dutRows} match={match} events={events} />
    </div>
  )
}
