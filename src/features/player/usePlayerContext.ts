import type { Match, MatchEventData, Player, PlayerGameStats, Team } from '@/types/domain'
import type { AggregatedStats } from '@/services/analytics/stats'
import {
  aggregate,
  derivePlayerGameStats,
  deriveTeamGameStats,
  matchScore,
} from '@/services/analytics/stats'
import { repositories } from '@/services/repositories'
import { useAsync } from '@/hooks/useAsync'

export interface PlayerGameLogEntry {
  match: Match
  opponent: Team | null
  isHome: boolean
  ownScore: number
  oppScore: number
  won: boolean
  stats: PlayerGameStats
}

export interface PlayerContext {
  player: Player
  team: Team
  teammates: Player[]
  matches: Match[]
  completed: Match[]
  upcoming: Match[]
  liveMatch: Match | null
  gameLog: PlayerGameLogEntry[]
  totals: AggregatedStats
  teamRecord: {
    played: number
    wins: number
    losses: number
    ppg: number
    oppPpg: number
    fgPct: number
    rpg: number
    apg: number
  }
  eventsByMatch: Map<string, MatchEventData[]>
  opponentById: Map<string, Team>
}

async function loadPlayerContext(playerId: string): Promise<PlayerContext | null> {
  const player = await repositories.players.getById(playerId)
  if (!player) return null

  const [team, publicTeammates, matches, allTeams] = await Promise.all([
    repositories.teams.getById(player.teamId),
    repositories.players.listPublicByTeam(player.teamId),
    repositories.matches.listByTeam(player.teamId),
    repositories.teams.list(),
  ])
  if (!team) return null

  const eventLists = await Promise.all(
    matches.map((match) => repositories.events.listPublicByMatch(match.id)),
  )
  const eventsByMatch = new Map<string, MatchEventData[]>()
  matches.forEach((match, index) => eventsByMatch.set(match.id, eventLists[index] ?? []))

  const teammates = [
    ...publicTeammates.filter((teammate) => teammate.id !== player.id),
    player,
  ]
  const opponentById = new Map(allTeams.map((entry) => [entry.id, entry]))
  const completed = matches.filter((match) => match.status === 'completed')
  const upcoming = matches
    .filter((match) => match.status === 'scheduled')
    .sort((a, b) => a.tipoff.localeCompare(b.tipoff))
  const liveMatch = matches.find((match) => match.status === 'live' || match.status === 'paused') ?? null

  const gameLog = completed.map((match) => {
    const isHome = match.homeTeamId === player.teamId
    const score = matchScore(eventsByMatch.get(match.id) ?? [], match)
    const ownScore = isHome ? score.home : score.away
    const oppScore = isHome ? score.away : score.home
    return {
      match,
      opponent: opponentById.get(isHome ? match.awayTeamId : match.homeTeamId) ?? null,
      isHome,
      ownScore,
      oppScore,
      won: ownScore > oppScore,
      stats: derivePlayerGameStats(
        eventsByMatch.get(match.id) ?? [],
        player.id,
        player.teamId,
        match.id,
      ),
    }
  })

  const totals = aggregate(gameLog.map((entry) => entry.stats))
  const teamTotals = completed.map((match) =>
    deriveTeamGameStats(eventsByMatch.get(match.id) ?? [], player.teamId, match.id),
  )
  const teamAggregate = aggregate(teamTotals)

  let wins = 0
  let losses = 0
  let pointsFor = 0
  let pointsAgainst = 0
  completed.forEach((match) => {
    const score = matchScore(eventsByMatch.get(match.id) ?? [], match)
    const isHome = match.homeTeamId === player.teamId
    const own = isHome ? score.home : score.away
    const opp = isHome ? score.away : score.home
    pointsFor += own
    pointsAgainst += opp
    if (own > opp) wins += 1
    else if (opp > own) losses += 1
  })

  return {
    player,
    team,
    teammates,
    matches,
    completed,
    upcoming,
    liveMatch,
    gameLog,
    totals,
    teamRecord: {
      played: completed.length,
      wins,
      losses,
      ppg: completed.length ? Math.round((pointsFor / completed.length) * 10) / 10 : 0,
      oppPpg: completed.length ? Math.round((pointsAgainst / completed.length) * 10) / 10 : 0,
      fgPct: teamAggregate.fgPct,
      rpg: teamAggregate.rpg,
      apg: teamAggregate.apg,
    },
    eventsByMatch,
    opponentById,
  }
}

export function usePlayerContext(playerId: string | undefined) {
  return useAsync<PlayerContext | null>(
    () => (playerId ? loadPlayerContext(playerId) : Promise.resolve(null)),
    [playerId],
  )
}
