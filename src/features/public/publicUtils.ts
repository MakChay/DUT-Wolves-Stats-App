import type {
  Match,
  MatchEventData,
  MediaAsset,
  PlayerAvailability,
  StandingRow,
  Team,
  TeamGender,
} from '@/types/domain'
import { isDutTeamId } from '@/types/domain'
import { buildStandings, matchScore } from '@/services/analytics/stats'
import type { PublicData } from './usePublicData'

export function flattenEvents(data: PublicData): MatchEventData[] {
  return [...data.eventsByMatch.values()].flat()
}

export function teamsForGender(data: PublicData, gender: TeamGender): Team[] {
  return data.teams.filter((team) => isDutTeamId(team.id) && team.gender === gender)
}

export function matchesForGender(data: PublicData, gender: TeamGender): Match[] {
  const ids = new Set(teamsForGender(data, gender).map((team) => team.id))
  return data.matches.filter((match) => ids.has(match.homeTeamId) || ids.has(match.awayTeamId))
}

/** Every published match in a gender, including opponent-vs-opponent games. */
export function allMatchesForGender(data: PublicData, gender: TeamGender): Match[] {
  return data.matches.filter((match) => {
    const home = data.teamById.get(match.homeTeamId)
    const away = data.teamById.get(match.awayTeamId)
    return home?.gender === gender && away?.gender === gender
  })
}

export function standingsForGender(data: PublicData, gender: TeamGender): StandingRow[] {
  const matches = allMatchesForGender(data, gender)
  const involvedIds = new Set(matches.flatMap((match) => [match.homeTeamId, match.awayTeamId]))
  const involvedTeams = [...data.teamById.values()].filter((team) => involvedIds.has(team.id))
  return buildStandings(involvedTeams, matches, flattenEvents(data))
}

export function scoreOf(data: PublicData, match: Match) {
  return matchScore(data.eventsByMatch.get(match.id) ?? [], match)
}

export function genderLabel(gender: TeamGender): string {
  return gender === 'men' ? "Men's" : "Women's"
}

/**
 * Public availability never reveals injury details. An injured player is shown
 * simply as unavailable, matching the privacy rules for the public site.
 */
export function publicAvailabilityLabel(availability: PlayerAvailability): string {
  switch (availability) {
    case 'active':
      return 'Available'
    case 'inactive':
      return 'Inactive'
    case 'injured':
    case 'unavailable':
    default:
      return 'Unavailable'
  }
}

export function mediaForTeam(data: PublicData, teamId: string): MediaAsset[] {
  return data.media.filter((asset) => asset.teamId === teamId)
}

export function mediaForPlayer(data: PublicData, playerId: string): MediaAsset[] {
  return data.media.filter((asset) => asset.playerId === playerId)
}

export function mediaForMatch(data: PublicData, matchId: string): MediaAsset[] {
  return data.media.filter((asset) => asset.matchId === matchId)
}

/** Team photo / hero fallback for a team page. */
export function heroMediaForTeam(data: PublicData, teamId: string): MediaAsset | null {
  const assets = mediaForTeam(data, teamId)
  return (
    assets.find((asset) => asset.category === 'team_photo' && asset.featured) ??
    assets.find((asset) => asset.category === 'team_photo') ??
    null
  )
}
