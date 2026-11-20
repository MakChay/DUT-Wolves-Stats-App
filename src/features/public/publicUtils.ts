import type {
  Competition,
  Match,
  MatchEventData,
  MediaAsset,
  PlayerAvailability,
  PlayerGameStats,
  StandingRow,
  Team,
  TeamGender,
} from '@/types/domain'
import { isDutTeamId } from '@/types/domain'
import { buildStandings, derivePlayerGameStats, matchScore } from '@/services/analytics/stats'
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

/** Competitions represented in a supplied match set, in date order. */
export function competitionsForMatches(data: PublicData, matches: Match[]): Competition[] {
  const ids = new Set(matches.map((match) => match.competitionId))
  return data.competitions
    .filter((competition) => ids.has(competition.id))
    .sort(
      (a, b) =>
        a.startDate.localeCompare(b.startDate) || a.name.localeCompare(b.name),
    )
}

/** Tournaments in which a DUT side has published matches for this gender. */
export function competitionsForGender(data: PublicData, gender: TeamGender): Competition[] {
  return competitionsForMatches(data, matchesForGender(data, gender))
}

/** Keep every row when no tournament is selected. */
export function filterByCompetition<T extends { competitionId: string }>(
  rows: T[],
  competitionId: string | null | undefined,
): T[] {
  return competitionId ? rows.filter((row) => row.competitionId === competitionId) : rows
}

/** Every published match in a gender, including opponent-vs-opponent games. */
export function allMatchesForGender(data: PublicData, gender: TeamGender): Match[] {
  return data.matches.filter((match) => {
    const home = data.teamById.get(match.homeTeamId)
    const away = data.teamById.get(match.awayTeamId)
    return home?.gender === gender && away?.gender === gender
  })
}

/** Build a table from a supplied set of matches only. */
function buildStandingsForMatches(data: PublicData, matches: Match[]): StandingRow[] {
  const involvedIds = new Set(matches.flatMap((match) => [match.homeTeamId, match.awayTeamId]))
  const involvedTeams = [...data.teamById.values()].filter((team) => involvedIds.has(team.id))
  return buildStandings(involvedTeams, matches, flattenEvents(data), data.snapshotsByMatch)
}

export interface CompetitionStandings {
  competition: Competition
  rows: StandingRow[]
  completed: number
}

/**
 * Standings are per competition. EMBA Finals and USSA, for example, are
 * different tournaments and must never be combined into one table.
 */
export function standingsByCompetitionForGender(
  data: PublicData,
  gender: TeamGender,
): CompetitionStandings[] {
  const matchesByCompetition = new Map<string, Match[]>()
  for (const match of allMatchesForGender(data, gender)) {
    matchesByCompetition.set(match.competitionId, [
      ...(matchesByCompetition.get(match.competitionId) ?? []),
      match,
    ])
  }

  return data.competitions
    .filter((competition) => matchesByCompetition.has(competition.id))
    .map((competition) => {
      const matches = matchesByCompetition.get(competition.id) ?? []
      return {
        competition,
        rows: buildStandingsForMatches(data, matches).filter(
          (row) => !isPlaceholderTeam(row.teamId),
        ),
        completed: matches.filter((match) => match.status === 'completed').length,
      }
    })
}

export function scoreOf(data: PublicData, match: Match) {
  const snapshot = data.snapshotsByMatch.get(match.id)
  if (snapshot) return { home: snapshot.homeScore, away: snapshot.awayScore }
  return matchScore(data.eventsByMatch.get(match.id) ?? [], match)
}

/** Prefer the frozen snapshot, then fall back to deriving from events. */
export function playerGameStats(
  data: PublicData,
  match: Match,
  playerId: string,
  teamId: string,
): PlayerGameStats {
  const snapshotRow = data.snapshotsByMatch
    .get(match.id)
    ?.playerStats.find((row) => row.playerId === playerId)
  return (
    snapshotRow ??
    derivePlayerGameStats(data.eventsByMatch.get(match.id) ?? [], playerId, teamId, match.id)
  )
}

export function genderLabel(gender: TeamGender): string {
  return gender === 'men' ? "Men's" : "Women's"
}

/**
 * Some seeded fixtures embedded the tip-off time inside `round`
 * (e.g. "Premier League 2026 Finals · 09:00"). The time is always rendered
 * from `tipoff`, so strip that suffix to avoid showing it twice.
 */
export function displayRound(round?: string): string | null {
  if (!round) return null
  return round.replace(/\s*[·–-]\s*\d{1,2}:\d{2}\s*$/, '').trim() || null
}

/** Winner placeholders are decided by earlier fixtures, not real teams yet. */
export function isPlaceholderTeam(teamId: string): boolean {
  return /^team-(winner|tbd)-\d+$/.test(teamId)
}

/** Extract the court label from a venue such as "Umlazi Indoor Courts · Court 1". */
export function courtFromVenue(venue: string): string | null {
  const parts = venue.split('·').map((part) => part.trim())
  return parts.length > 1 ? parts[parts.length - 1] : null
}

/** Strip the court suffix, leaving the venue name only. */
export function venueName(venue: string): string {
  return venue.split('·')[0].trim()
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
