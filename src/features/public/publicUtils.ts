import type {
  Match,
  MatchEventData,
  MediaAsset,
  PlayerAvailability,
  StandingRow,
  Team,
  TeamGender,
} from '@/types/domain'
import { buildStandings, matchScore } from '@/services/analytics/stats'
import type { PublicData } from './usePublicData'

export function flattenEvents(data: PublicData): MatchEventData[] {
  return [...data.eventsByMatch.values()].flat()
}

export function teamsForGender(data: PublicData, gender: TeamGender): Team[] {
  return data.teams.filter((team) => team.gender === gender)
}

export function matchesForGender(data: PublicData, gender: TeamGender): Match[] {
  const ids = new Set(teamsForGender(data, gender).map((team) => team.id))
  return data.matches.filter((match) => ids.has(match.homeTeamId) && ids.has(match.awayTeamId))
}

export function standingsForGender(data: PublicData, gender: TeamGender): StandingRow[] {
  return buildStandings(teamsForGender(data, gender), matchesForGender(data, gender), flattenEvents(data))
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
