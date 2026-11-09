import type {
  Match,
  PostMatchReportSummary,
  PostMatchTeamReport,
  Team,
} from '@/types/domain'
import { repositories } from '@/services/repositories'

/**
 * DUT teams whose matches require a mandatory post-match team report.
 * Opponent-only fixtures do not require a DUT report.
 */
export const DUT_TEAM_IDS = ['team-men', 'team-women'] as const

export function isDutTeam(teamId: string): boolean {
  return (DUT_TEAM_IDS as readonly string[]).includes(teamId)
}

export function requiredReportTeamIds(match: Match): string[] {
  return [match.homeTeamId, match.awayTeamId].filter(isDutTeam)
}

export function reportForTeam<T extends Pick<PostMatchReportSummary, 'matchId' | 'teamId'>>(
  reports: T[],
  matchId: string,
  teamId: string,
): T | null {
  return (
    reports.find((report) => report.matchId === matchId && report.teamId === teamId) ??
    null
  )
}

export function missingReportTeamIds(
  match: Match,
  reports: Array<Pick<PostMatchReportSummary, 'matchId' | 'teamId'>>,
): string[] {
  return requiredReportTeamIds(match).filter(
    (teamId) => !reportForTeam(reports, match.id, teamId),
  )
}

/** A DUT match is only administratively complete once every required report exists. */
export function canAdministrativelyComplete(
  match: Match,
  reports: Array<Pick<PostMatchReportSummary, 'matchId' | 'teamId'>>,
): boolean {
  return missingReportTeamIds(match, reports).length === 0
}

/**
 * Recomputes and persists the `adminComplete` flag from the reports on file.
 * Originals are never overwritten: the report repository owns amendments.
 */
export async function syncMatchAdminComplete(matchId: string): Promise<Match | null> {
  const [match, reports] = await Promise.all([
    repositories.matches.getById(matchId),
    repositories.reports.listStatusByMatch(matchId),
  ])
  if (!match) return null
  const adminComplete = canAdministrativelyComplete(match, reports)
  if (match.adminComplete === adminComplete) return match
  return repositories.matches.update(matchId, { adminComplete })
}

export function reportStatusLabel(
  match: Match,
  report: PostMatchTeamReport | null,
): 'not required' | 'outstanding' | 'submitted' | 'amended' {
  if (requiredReportTeamIds(match).length === 0) return 'not required'
  if (!report) return 'outstanding'
  return report.status
}

export function teamName(teams: Team[], teamId: string): string {
  return teams.find((team) => team.id === teamId)?.shortName ?? teamId
}
