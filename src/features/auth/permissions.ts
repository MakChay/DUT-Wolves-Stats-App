import type { User, UserRole } from '@/types/domain'

export function hasRole(user: User | null, ...roles: UserRole[]): boolean {
  return Boolean(user && roles.includes(user.role))
}

export function isTeamMember(user: User | null, teamId: string): boolean {
  return Boolean(user && (user.teamIds.includes(teamId) || user.role === 'admin'))
}

/** Only a team manager (or admin) may create or change official records. */
export function canManageRoster(user: User | null, teamId: string): boolean {
  return hasRole(user, 'manager', 'admin') && isTeamMember(user, teamId)
}

export function canReviewChangeRequests(user: User | null, teamId: string): boolean {
  return hasRole(user, 'manager', 'admin') && isTeamMember(user, teamId)
}

export function canSubmitChangeRequest(user: User | null, teamId: string): boolean {
  return hasRole(user, 'coach') && isTeamMember(user, teamId)
}

export function canSubmitMatchReport(user: User | null, teamId: string): boolean {
  return hasRole(user, 'manager', 'admin') && isTeamMember(user, teamId)
}

export function canManageMedia(_user: User | null): boolean {
  return false
}

/** Media managers must never be able to edit official records. */
export function canEditOfficialStats(user: User | null): boolean {
  return hasRole(user, 'manager', 'admin')
}

/** Coaches, players and media managers are read-only on official records. */
export function isReadOnlyOnOfficialRecords(user: User | null): boolean {
  return !canEditOfficialStats(user)
}
