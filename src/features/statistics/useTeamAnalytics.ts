import type {
  Competition,
  Match,
  MatchEvent,
  Player,
  PlayerGameStats,
  Team,
} from '@/types/domain'
import type { AggregatedStats } from '@/services/analytics/stats'
import { aggregate, derivePlayerGameStats, deriveTeamGameStats, matchScore } from '@/services/analytics/stats'
import { repositories } from '@/services/repositories'
import { useAsync } from '@/hooks/useAsync'
import { formatDate } from '@/utils/format'

export interface PlayerSeasonRow {
  player: Player
  perGame: PlayerGameStats[]
  totals: AggregatedStats
}

export interface TeamAnalytics {
  team: Team
  players: Player[]
  allTeams: Team[]
  matches: Match[]
  completed: Match[]
  upcoming: Match[]
  liveMatch: Match | null
  competitions: Competition[]
  eventsByMatch: Map<string, MatchEvent[]>
  record: {
    played: number
    wins: number
    losses: number
    pointsFor: number
    pointsAgainst: number
    ppg: number
    oppPpg: number
  }
  teamTotals: AggregatedStats
  playerRows: PlayerSeasonRow[]
  recentForm: { label: string; value: number }[]
  opponentById: Map<string, Team>
}

async function loadTeamAnalytics(teamId: string): Promise<TeamAnalytics | null> {
  const [team, players, allTeams, matches, competitions] = await Promise.all([
    repositories.teams.getById(teamId),
    repositories.players.listByTeam(teamId),
    repositories.teams.list(),
    repositories.matches.listByTeam(teamId),
    repositories.competitions.list(),
  ])

  if (!team) return null

  const eventLists = await Promise.all(
    matches.map((match) => repositories.events.listByMatch(match.id)),
  )
  const eventsByMatch = new Map<string, MatchEvent[]>()
  matches.forEach((match, index) => eventsByMatch.set(match.id, eventLists[index] ?? []))

  const completed = matches.filter((match) => match.status === 'completed')
  const upcoming = matches
    .filter((match) => match.status === 'scheduled')
    .sort((a, b) => a.tipoff.localeCompare(b.tipoff))
  const liveMatch = matches.find((match) => match.status === 'live' || match.status === 'paused') ?? null

  let wins = 0
  let losses = 0
  let pointsFor = 0
  let pointsAgainst = 0

  completed.forEach((match) => {
    const score = matchScore(eventsByMatch.get(match.id) ?? [], match)
    const isHome = match.homeTeamId === teamId
    const own = isHome ? score.home : score.away
    const opp = isHome ? score.away : score.home
    pointsFor += own
    pointsAgainst += opp
    if (own > opp) wins += 1
    else if (opp > own) losses += 1
  })

  const teamGameStats = completed.map((match) =>
    deriveTeamGameStats(eventsByMatch.get(match.id) ?? [], teamId, match.id),
  )
  const teamTotals = aggregate(teamGameStats)

  const playerRows = players
    .map((player) => {
      const perGame = completed.map((match) =>
        derivePlayerGameStats(eventsByMatch.get(match.id) ?? [], player.id, teamId, match.id),
      )
      return { player, perGame, totals: aggregate(perGame) }
    })
    .sort((a, b) => b.totals.ppg - a.totals.ppg)

  const recentForm = completed.slice(-6).map((match) => {
    const score = matchScore(eventsByMatch.get(match.id) ?? [], match)
    const isHome = match.homeTeamId === teamId
    return {
      label: formatDate(match.tipoff, { day: 'numeric', month: 'short' }),
      value: isHome ? score.home : score.away,
    }
  })

  return {
    team,
    players,
    allTeams,
    matches,
    completed,
    upcoming,
    liveMatch,
    competitions,
    eventsByMatch,
    record: {
      played: completed.length,
      wins,
      losses,
      pointsFor,
      pointsAgainst,
      ppg: completed.length ? Math.round((pointsFor / completed.length) * 10) / 10 : 0,
      oppPpg: completed.length ? Math.round((pointsAgainst / completed.length) * 10) / 10 : 0,
    },
    teamTotals,
    playerRows,
    recentForm,
    opponentById: new Map(allTeams.map((entry) => [entry.id, entry])),
  }
}

export function useTeamAnalytics(teamId: string | null) {
  return useAsync<TeamAnalytics | null>(
    () => (teamId ? loadTeamAnalytics(teamId) : Promise.resolve(null)),
    [teamId],
  )
}

export { loadTeamAnalytics }
