import type {
  Match,
  MatchEventData,
  PlayerGameStats,
  StandingRow,
  TeamGameStats,
  Team,
} from '@/types/domain'
import { EVENT_POINTS } from '@/types/domain'

export function emptyPlayerGameStats(
  playerId: string,
  teamId: string,
  matchId: string,
): PlayerGameStats {
  return {
    playerId,
    teamId,
    matchId,
    points: 0,
    fgm: 0,
    fga: 0,
    tpm: 0,
    tpa: 0,
    ftm: 0,
    fta: 0,
    rebOff: 0,
    rebDef: 0,
    reb: 0,
    ast: 0,
    stl: 0,
    blk: 0,
    tov: 0,
    pf: 0,
  }
}

export function emptyTeamGameStats(teamId: string, matchId: string): TeamGameStats {
  return {
    teamId,
    matchId,
    points: 0,
    fgm: 0,
    fga: 0,
    tpm: 0,
    tpa: 0,
    ftm: 0,
    fta: 0,
    rebOff: 0,
    rebDef: 0,
    reb: 0,
    ast: 0,
    stl: 0,
    blk: 0,
    tov: 0,
    pf: 0,
  }
}

function applyEvent(stats: PlayerGameStats | TeamGameStats, event: MatchEventData): void {
  switch (event.type) {
    case 'FG2_MADE':
      stats.points += 2
      stats.fgm += 1
      stats.fga += 1
      break
    case 'FG3_MADE':
      stats.points += 3
      stats.fgm += 1
      stats.fga += 1
      stats.tpm += 1
      stats.tpa += 1
      break
    case 'FT_MADE':
      stats.points += 1
      stats.ftm += 1
      stats.fta += 1
      break
    case 'FG2_MISS':
    case 'FG3_MISS':
      stats.fga += 1
      if (event.type === 'FG3_MISS') stats.tpa += 1
      break
    case 'FT_MISS':
      stats.fta += 1
      break
    case 'REB_OFF':
      stats.rebOff += 1
      stats.reb += 1
      break
    case 'REB_DEF':
      stats.rebDef += 1
      stats.reb += 1
      break
    case 'ASSIST':
      stats.ast += 1
      break
    case 'STEAL':
      stats.stl += 1
      break
    case 'BLOCK':
      stats.blk += 1
      break
    case 'TURNOVER':
      stats.tov += 1
      break
    case 'FOUL':
      stats.pf += 1
      break
    default:
      break
  }
}

/** Events are the source of truth. Voided events are excluded from all derivations. */
export function activeEvents(events: MatchEventData[], matchId?: string): MatchEventData[] {
  return events.filter((event) => !event.voided && (!matchId || event.matchId === matchId))
}

export function derivePlayerGameStats(
  events: MatchEventData[],
  playerId: string,
  teamId: string,
  matchId: string,
): PlayerGameStats {
  const stats = emptyPlayerGameStats(playerId, teamId, matchId)
  activeEvents(events, matchId)
    .filter((event) => event.playerId === playerId)
    .forEach((event) => applyEvent(stats, event))
  return stats
}

export function deriveTeamGameStats(
  events: MatchEventData[],
  teamId: string,
  matchId: string,
): TeamGameStats {
  const stats = emptyTeamGameStats(teamId, matchId)
  activeEvents(events, matchId)
    .filter((event) => event.teamId === teamId)
    .forEach((event) => applyEvent(stats, event))
  return stats
}

export function teamScore(events: MatchEventData[], teamId: string, matchId?: string): number {
  return activeEvents(events, matchId)
    .filter((event) => event.teamId === teamId)
    .reduce((total, event) => total + (event.points ?? EVENT_POINTS[event.type] ?? 0), 0)
}

export function matchScore(
  events: MatchEventData[],
  match: Pick<Match, 'id' | 'homeTeamId' | 'awayTeamId'>,
): { home: number; away: number } {
  return {
    home: teamScore(events, match.homeTeamId, match.id),
    away: teamScore(events, match.awayTeamId, match.id),
  }
}

export function pct(made: number, attempted: number): number {
  if (attempted === 0) return 0
  return Math.round((made / attempted) * 1000) / 10
}

export interface AggregatedStats {
  games: number
  points: number
  rebounds: number
  assists: number
  steals: number
  blocks: number
  turnovers: number
  fouls: number
  fgm: number
  fga: number
  tpm: number
  tpa: number
  ftm: number
  fta: number
  ppg: number
  rpg: number
  apg: number
  fgPct: number
  tpPct: number
  ftPct: number
}

export function aggregate(rows: PlayerGameStats[] | TeamGameStats[]): AggregatedStats {
  const totals = rows.reduce(
    (acc, row) => {
      acc.points += row.points
      acc.rebounds += row.reb
      acc.assists += row.ast
      acc.steals += row.stl
      acc.blocks += row.blk
      acc.turnovers += row.tov
      acc.fouls += row.pf
      acc.fgm += row.fgm
      acc.fga += row.fga
      acc.tpm += row.tpm
      acc.tpa += row.tpa
      acc.ftm += row.ftm
      acc.fta += row.fta
      return acc
    },
    {
      points: 0,
      rebounds: 0,
      assists: 0,
      steals: 0,
      blocks: 0,
      turnovers: 0,
      fouls: 0,
      fgm: 0,
      fga: 0,
      tpm: 0,
      tpa: 0,
      ftm: 0,
      fta: 0,
    },
  )
  const games = rows.length
  return {
    games,
    ...totals,
    ppg: games ? Math.round((totals.points / games) * 10) / 10 : 0,
    rpg: games ? Math.round((totals.rebounds / games) * 10) / 10 : 0,
    apg: games ? Math.round((totals.assists / games) * 10) / 10 : 0,
    fgPct: pct(totals.fgm, totals.fga),
    tpPct: pct(totals.tpm, totals.tpa),
    ftPct: pct(totals.ftm, totals.fta),
  }
}

export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function buildStandings(
  teams: Team[],
  matches: Match[],
  events: MatchEventData[],
): StandingRow[] {
  const rows = new Map<string, StandingRow>()
  teams.forEach((team) => {
    rows.set(team.id, {
      teamId: team.id,
      played: 0,
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      diff: 0,
      streak: '—',
    })
  })

  const completed = matches.filter(
    (match) =>
      match.status === 'completed' &&
      rows.has(match.homeTeamId) &&
      rows.has(match.awayTeamId),
  )

  completed.forEach((match) => {
    const home = rows.get(match.homeTeamId)
    const away = rows.get(match.awayTeamId)
    if (!home || !away) return

    const score = matchScore(events, match)
    home.played += 1
    away.played += 1
    home.pointsFor += score.home
    home.pointsAgainst += score.away
    away.pointsFor += score.away
    away.pointsAgainst += score.home
    if (score.home > score.away) {
      home.wins += 1
      away.losses += 1
    } else if (score.away > score.home) {
      away.wins += 1
      home.losses += 1
    }
  })

  const standings = [...rows.values()].map((row) => ({
    ...row,
    diff: row.pointsFor - row.pointsAgainst,
  }))

  standings.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins
    return b.diff - a.diff
  })

  return standings.map((row, index) => {
    const teamMatches = completed
      .filter((match) => match.homeTeamId === row.teamId || match.awayTeamId === row.teamId)
      .sort((a, b) => a.tipoff.localeCompare(b.tipoff))
    const last = teamMatches[teamMatches.length - 1]
    let streak: string = '—'
    if (last) {
      const score = matchScore(events, last)
      const isHome = last.homeTeamId === row.teamId
      const won = isHome ? score.home > score.away : score.away > score.home
      streak = won ? 'W1' : 'L1'
    }
    return { ...row, streak, seed: index + 1 } as StandingRow & { seed: number }
  })
}
