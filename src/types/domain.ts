/** `media_manager` is retained only to recognize old profiles; it has no access. */
export type UserRole = 'admin' | 'manager' | 'coach' | 'player' | 'media_manager' | 'public'

export interface User {
  /** Firebase Auth UID. Also the `users` document id. */
  id: string
  email: string
  displayName: string
  role: UserRole
  teamIds: string[]
  playerId?: string
  avatarUrl?: string
  /** Human-readable role within the team, e.g. "Head Coach". */
  title?: string
  /** Mirrors the Auth UID for queries and admin tooling. */
  authUid?: string
  /** Invited users must choose a new password on first sign-in. */
  mustChangePassword?: boolean
  invitedAt?: string
  invitedByUserId?: string
  disabled?: boolean
  createdAt?: string
}

export type TeamGender = 'men' | 'women'

export interface Team {
  id: string
  name: string
  shortName: string
  gender: TeamGender
  managerId: string
  coachIds: string[]
  primaryColor: string
  publicVisible: boolean
  description?: string
  homeVenue?: string
}

export interface TeamMembership {
  id: string
  userId: string
  teamId: string
  role: 'manager' | 'coach' | 'player'
  seasonId: string
  startDate: string
  endDate?: string
}

export type PlayerPosition = 'PG' | 'SG' | 'SF' | 'PF' | 'C'

export type PlayerAvailability = 'active' | 'unavailable' | 'injured' | 'inactive'

export const PLAYER_POSITIONS: PlayerPosition[] = ['PG', 'SG', 'SF', 'PF', 'C']

export const AVAILABILITY_LABELS: Record<PlayerAvailability, string> = {
  active: 'Active',
  unavailable: 'Unavailable',
  injured: 'Injured',
  inactive: 'Inactive',
}

export interface Player {
  id: string
  teamId: string
  firstName: string
  lastName: string
  /** Null until a team manager assigns and verifies a jersey number. */
  jerseyNumber: number | null
  /** Null until a team manager assigns a primary position. */
  position: PlayerPosition | null
  secondaryPosition?: PlayerPosition | null
  availability: PlayerAvailability
  /** Private internal identifier. Never exposed on the public site. */
  studentNumber?: string
  /** Private campus identifier. Never exposed on the public site. Residence data is not stored. */
  campus?: string
  heightCm?: number
  dateOfBirth?: string
  isActive: boolean
  publicVisible: boolean
  photoUrl?: string
  bio?: string
  /** Opponent squads are registered by jersey number only; no personal names. */
  numberOnly?: boolean
  /** Archived players stay in history but are removed from active rosters. */
  archivedAt?: string | null
  archivedByUserId?: string
  joinedAt?: string
  registeredCompetitionIds?: string[]
  createdAt?: string
  updatedAt?: string
}

/**
 * The only player shape the public site may receive. Private identifiers are
 * structurally impossible to serialise into a public payload.
 */
export type PublicPlayer = Pick<
  Player,
  | 'id'
  | 'teamId'
  | 'firstName'
  | 'lastName'
  | 'jerseyNumber'
  | 'position'
  | 'secondaryPosition'
  | 'availability'
  | 'heightCm'
  | 'isActive'
  | 'publicVisible'
  | 'photoUrl'
  | 'bio'
>

export function playerName(player: Pick<Player, 'firstName' | 'lastName'>): string {
  return `${player.firstName} ${player.lastName}`.trim()
}

/**
 * Opponent players are number-only registrations, so the label falls back to
 * the jersey instead of inventing a name.
 */
export function playerDisplayName(
  player: Pick<Player, 'firstName' | 'lastName' | 'jerseyNumber'> & { numberOnly?: boolean },
): string {
  if (player.numberOnly || (!player.firstName && !player.lastName)) {
    return jerseyLabel(player.jerseyNumber)
  }
  return playerName(player)
}

export function toPublicPlayer(player: Player): PublicPlayer {
  return {
    id: player.id,
    teamId: player.teamId,
    firstName: player.firstName,
    lastName: player.lastName,
    jerseyNumber: player.jerseyNumber,
    position: player.position,
    secondaryPosition: player.secondaryPosition,
    availability: player.availability,
    heightCm: player.heightCm,
    isActive: player.isActive,
    publicVisible: player.publicVisible,
    photoUrl: player.photoUrl,
    bio: player.bio,
  }
}

/** Display helper for a jersey that may not have been assigned yet. */
export function jerseyLabel(jerseyNumber: number | null | undefined): string {
  return jerseyNumber === null || jerseyNumber === undefined ? '—' : `#${jerseyNumber}`
}

export interface Season {
  id: string
  name: string
  startDate: string
  endDate: string
  isCurrent: boolean
}

export type CompetitionType = 'league' | 'tournament'

export interface Competition {
  id: string
  name: string
  shortName: string
  seasonId: string
  type: CompetitionType
  startDate: string
  endDate: string
  publicVisible: boolean
}

export type RegistrationStatus = 'registered' | 'pending' | 'withdrawn'

export interface PlayerRegistration {
  id: string
  playerId: string
  teamId: string
  competitionId: string
  seasonId: string
  status: RegistrationStatus
  registeredAt: string
  registeredByUserId: string
  notes?: string
}

export type MatchStatus = 'scheduled' | 'live' | 'paused' | 'completed' | 'postponed'

export interface Match {
  id: string
  competitionId: string
  seasonId: string
  homeTeamId: string
  awayTeamId: string
  venue: string
  tipoff: string
  status: MatchStatus
  period: number
  clockSeconds: number
  publicVisible: boolean
  round?: string
  /** A DUT team's match cannot be administratively completed without a report. */
  reportRequired?: boolean
  /** Set only when the required post-match team reports are submitted. */
  adminComplete?: boolean
  /** Imported draft fixtures stay hidden from public listings until reviewed. */
  isDraft?: boolean
}

export interface MatchRoster {
  id: string
  matchId: string
  teamId: string
  playerId: string
  jerseyNumber: number | null
  isStarter: boolean
  isActive: boolean
  /** Opponent jersey entry created for this match; not a season player record. */
  matchOnly?: boolean
}

export type MatchEventType =
  | 'FG2_MADE'
  | 'FG2_MISS'
  | 'FG3_MADE'
  | 'FG3_MISS'
  | 'FT_MADE'
  | 'FT_MISS'
  | 'REB_OFF'
  | 'REB_DEF'
  | 'ASSIST'
  | 'STEAL'
  | 'BLOCK'
  | 'TURNOVER'
  | 'FOUL'
  | 'SUB_IN'
  | 'SUB_OUT'
  | 'PERIOD_START'
  | 'PERIOD_END'
  | 'MATCH_END'

export interface MatchEventData {
  id: string
  clientEventId: string
  matchId: string
  teamId: string
  playerId?: string
  type: MatchEventType
  period: number
  clockSeconds: number
  createdAt: string
  points?: number
  /** Set when this event has been voided by a correction. History is preserved. */
  voided?: boolean
  voidedAt?: string
  /** Original event this correction relates to, if applicable. */
  correctionOf?: string
}

export interface MatchEvent extends MatchEventData {
  recordedBy: string
  voidedBy?: string
  voidReason?: string
}

/** Match-event fields safe to expose in public score and statistics views. */
export type PublicMatchEvent = MatchEventData

export function toPublicMatchEvent(event: MatchEvent): PublicMatchEvent {
  return {
    id: event.id,
    clientEventId: event.clientEventId,
    matchId: event.matchId,
    teamId: event.teamId,
    playerId: event.playerId,
    type: event.type,
    period: event.period,
    clockSeconds: event.clockSeconds,
    createdAt: event.createdAt,
    points: event.points,
    voided: event.voided,
    voidedAt: event.voidedAt,
    correctionOf: event.correctionOf,
  }
}

export interface PlayerGameStats {
  playerId: string
  teamId: string
  matchId: string
  points: number
  fgm: number
  fga: number
  tpm: number
  tpa: number
  ftm: number
  fta: number
  rebOff: number
  rebDef: number
  reb: number
  ast: number
  stl: number
  blk: number
  tov: number
  pf: number
}

export interface TeamGameStats {
  teamId: string
  matchId: string
  points: number
  fgm: number
  fga: number
  tpm: number
  tpa: number
  ftm: number
  fta: number
  rebOff: number
  rebDef: number
  reb: number
  ast: number
  stl: number
  blk: number
  tov: number
  pf: number
}

/* ------------------------------------------------------------------ */
/* Team change requests                                                */
/* ------------------------------------------------------------------ */

export type ChangeRequestType =
  | 'add_player'
  | 'remove_player'
  | 'jersey_number'
  | 'position'
  | 'availability'
  | 'injury_status'
  | 'general_correction'

export const CHANGE_REQUEST_LABELS: Record<ChangeRequestType, string> = {
  add_player: 'Add player',
  remove_player: 'Remove player',
  jersey_number: 'Jersey number',
  position: 'Position',
  availability: 'Availability',
  injury_status: 'Injury status',
  general_correction: 'General correction',
}

export type ChangeRequestStatus = 'pending' | 'accepted' | 'rejected' | 'completed'

export interface ProposedPlayer {
  firstName: string
  lastName: string
  studentNumber?: string
  campus?: string
  position?: PlayerPosition | null
  jerseyNumber?: number | null
}

export interface TeamChangeRequest {
  id: string
  teamId: string
  type: ChangeRequestType
  playerId?: string
  /** Snapshot of the player's name at submission time, for history. */
  playerName?: string
  currentValue?: string | null
  requestedValue: string
  proposedPlayer?: ProposedPlayer
  reason: string
  submittedByUserId: string
  submittedByName: string
  submittedAt: string
  status: ChangeRequestStatus
  reviewedByUserId?: string
  reviewedByName?: string
  reviewedAt?: string
  reviewNote?: string
  completedAt?: string
  managerNotifiedAt?: string
}

/* ------------------------------------------------------------------ */
/* Post-match team reports                                             */
/* ------------------------------------------------------------------ */

export interface InjuryEntry {
  id: string
  playerId: string
  playerName: string
  description: string
  period: number
  /** Clock time remaining in the period, in seconds. */
  clockSeconds?: number
  timeLabel: string
  continuedPlaying: boolean
  substitutedDueToInjury: boolean
  medicalAttention: boolean
  followUpNotes?: string
}

export interface ReportSnapshot {
  injuriesReported: boolean
  injuries: InjuryEntry[]
  additionalNotes: string
  noInjuriesConfirmed: boolean
}

export interface ReportAmendment {
  id: string
  amendedAt: string
  amendedByUserId: string
  amendedByName: string
  reason: string
  previous: ReportSnapshot
}

export type PostMatchReportStatus = 'submitted' | 'amended'

export interface PostMatchTeamReport {
  id: string
  matchId: string
  teamId: string
  managerId: string
  managerName: string
  /** Explicit answer. Cannot be left undefined. */
  injuriesReported: boolean
  /** True only when the manager explicitly confirmed "NO INJURIES REPORTED". */
  noInjuriesConfirmed: boolean
  injuries: InjuryEntry[]
  additionalNotes: string
  status: PostMatchReportStatus
  submittedAt: string
  submittedByUserId: string
  submittedByName: string
  amendments: ReportAmendment[]
}

/** Minimal report metadata used to track match completion without injury details. */
export type PostMatchReportSummary = Pick<
  PostMatchTeamReport,
  'id' | 'matchId' | 'teamId' | 'status' | 'submittedAt'
>

/* ------------------------------------------------------------------ */
/* Audit                                                               */
/* ------------------------------------------------------------------ */

export type AuditEntityType =
  | 'match'
  | 'event'
  | 'player'
  | 'team'
  | 'competition'
  | 'user'
  | 'media'
  | 'report'
  | 'change_request'
  | 'registration'

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'assign'
  | 'withdraw'
  | 'submit'
  | 'amend'
  | 'accept'
  | 'reject'
  | 'complete'
  | 'publish'
  | 'archive'
  | 'void'

export interface AuditEntry {
  id: string
  entityType: AuditEntityType
  entityId: string
  action: AuditAction
  actorUserId: string
  actorName: string
  actorRole: UserRole
  summary: string
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
  createdAt: string
}

/** @deprecated Use AuditEntry. Kept for older admin surfaces. */
export interface AuditLogEntry {
  id: string
  actorId: string
  action: string
  entityType: AuditEntityType
  entityId: string
  createdAt: string
  details?: string
}

export interface StandingRow {
  teamId: string
  played: number
  wins: number
  losses: number
  pointsFor: number
  pointsAgainst: number
  diff: number
  streak: string
}

/* ------------------------------------------------------------------ */
/* Media                                                               */
/* ------------------------------------------------------------------ */

export type MediaCategory =
  | 'player_profile'
  | 'team_photo'
  | 'match_gallery'
  | 'poster'
  | 'promotional_graphic'
  | 'homepage_banner'

export const MEDIA_CATEGORIES: MediaCategory[] = [
  'player_profile',
  'team_photo',
  'match_gallery',
  'poster',
  'promotional_graphic',
  'homepage_banner',
]

export const MEDIA_CATEGORY_LABELS: Record<MediaCategory, string> = {
  player_profile: 'Player portrait',
  team_photo: 'Team photo',
  match_gallery: 'Match gallery',
  poster: 'Match poster',
  promotional_graphic: 'Promotional graphic',
  homepage_banner: 'Homepage banner',
}

/** Cloudinary folder per category. No Firebase Storage is used anywhere. */
export const MEDIA_FOLDERS: Record<MediaCategory, string> = {
  player_profile: 'player-profiles',
  team_photo: 'team-photos',
  match_gallery: 'match-galleries',
  poster: 'promotional-graphics',
  promotional_graphic: 'promotional-graphics',
  homepage_banner: 'homepage-banners',
}

export type MediaStatus = 'draft' | 'published' | 'archived'

export interface MediaCrop {
  x: number
  y: number
  width: number
  height: number
  aspect: number
}

export interface MediaAsset {
  id: string
  title: string
  caption?: string
  description?: string
  category: MediaCategory
  status: MediaStatus
  teamId?: string
  playerId?: string
  competitionId?: string
  matchId?: string
  url: string
  thumbnailUrl?: string
  publicId?: string
  cloudinaryFolder?: string
  width?: number
  height?: number
  bytes?: number
  format?: string
  crop?: MediaCrop
  /** Homepage / gallery featured photography. */
  featured?: boolean
  uploadedBy: string
  uploadedByName?: string
  uploadedAt: string
  updatedAt?: string
  publishedAt?: string
  tags: string[]
}

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

export type NotificationKind = 'change_request' | 'report' | 'media' | 'general'

export interface AppNotification {
  id: string
  userId: string
  kind: NotificationKind
  title: string
  body: string
  link?: string
  createdAt: string
  readAt?: string
}

export const EVENT_POINTS: Partial<Record<MatchEventType, number>> = {
  FG2_MADE: 2,
  FG3_MADE: 3,
  FT_MADE: 1,
}

export const EVENT_LABELS: Record<MatchEventType, string> = {
  FG2_MADE: 'Two-pointer made',
  FG2_MISS: 'Two-pointer missed',
  FG3_MADE: 'Three-pointer made',
  FG3_MISS: 'Three-pointer missed',
  FT_MADE: 'Free throw made',
  FT_MISS: 'Free throw missed',
  REB_OFF: 'Offensive rebound',
  REB_DEF: 'Defensive rebound',
  ASSIST: 'Assist',
  STEAL: 'Steal',
  BLOCK: 'Block',
  TURNOVER: 'Turnover',
  FOUL: 'Personal foul',
  SUB_IN: 'Substitution in',
  SUB_OUT: 'Substitution out',
  PERIOD_START: 'Period start',
  PERIOD_END: 'Period end',
  MATCH_END: 'Match ended',
}

export const EVENT_SHORT_LABELS: Record<MatchEventType, string> = {
  FG2_MADE: '2PT',
  FG2_MISS: '2PT',
  FG3_MADE: '3PT',
  FG3_MISS: '3PT',
  FT_MADE: 'FT',
  FT_MISS: 'FT',
  REB_OFF: 'ORB',
  REB_DEF: 'DRB',
  ASSIST: 'AST',
  STEAL: 'STL',
  BLOCK: 'BLK',
  TURNOVER: 'TO',
  FOUL: 'PF',
  SUB_IN: 'IN',
  SUB_OUT: 'OUT',
  PERIOD_START: 'Q',
  PERIOD_END: 'END',
  MATCH_END: 'FT',
}

export const SHOOTING_EVENTS: MatchEventType[] = [
  'FG2_MADE',
  'FG2_MISS',
  'FG3_MADE',
  'FG3_MISS',
  'FT_MADE',
  'FT_MISS',
]
