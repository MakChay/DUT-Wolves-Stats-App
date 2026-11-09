import type {
  Competition,
  Match,
  MatchEvent,
  Player,
  Season,
  Team,
  User,
} from '@/types/domain'
import { isDutTeamId } from '@/types/domain'
import { repositories } from '@/services/repositories'
import { useAsync } from '@/hooks/useAsync'

export interface AdminData {
  teams: Team[]
  users: User[]
  competitions: Competition[]
  seasons: Season[]
  matches: Match[]
  players: Player[]
  eventsByMatch: Map<string, MatchEvent[]>
}

async function loadAdminData(): Promise<AdminData> {
  const [teams, users, competitions, seasons, allMatches, menPlayers, womenPlayers] = await Promise.all([
    repositories.teams.list(),
    repositories.users.list(),
    repositories.competitions.list(),
    repositories.competitions.listSeasons(),
    repositories.matches.list(),
    repositories.players.listByTeam('team-men'),
    repositories.players.listByTeam('team-women'),
  ])

  const matches = allMatches.filter(
    (match) => isDutTeamId(match.homeTeamId) || isDutTeamId(match.awayTeamId),
  )
  const players = [...menPlayers, ...womenPlayers]

  const eventLists = await Promise.all(
    matches.map((match) => repositories.events.listByMatch(match.id)),
  )
  const eventsByMatch = new Map<string, MatchEvent[]>()
  matches.forEach((match, index) => eventsByMatch.set(match.id, eventLists[index] ?? []))

  return { teams, users, competitions, seasons, matches, players, eventsByMatch }
}

export function useAdminData() {
  return useAsync<AdminData>(loadAdminData)
}
