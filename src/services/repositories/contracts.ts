import type {
  AppNotification,
  AuditEntry,
  AuditEntityType,
  Competition,
  Match,
  MatchEvent,
  MatchRoster,
  MatchSnapshot,
  MediaAsset,
  Player,
  PlayerRegistration,
  PostMatchReportSummary,
  PostMatchTeamReport,
  PublicMatchEvent,
  PublicPlayer,
  Season,
  Team,
  TeamChangeRequest,
  User,
} from '@/types/domain'

export interface TeamRepository {
  list(): Promise<Team[]>
  listPublic(): Promise<Team[]>
  getById(id: string): Promise<Team | null>
  update(id: string, patch: Partial<Team>): Promise<Team | null>
}

export interface PlayerRepository {
  list(): Promise<Player[]>
  listByTeam(teamId: string): Promise<Player[]>
  /** Sanitised projection. Contains no student numbers, campuses or other private fields. */
  listPublic(): Promise<PublicPlayer[]>
  listPublicByTeam(teamId: string): Promise<PublicPlayer[]>
  getById(id: string): Promise<Player | null>
  getPublicById(id: string): Promise<PublicPlayer | null>
  create(player: Player): Promise<Player>
  update(id: string, patch: Partial<Player>): Promise<Player | null>
  remove(id: string): Promise<void>
}

export interface CompetitionRepository {
  list(): Promise<Competition[]>
  getById(id: string): Promise<Competition | null>
  listSeasons(): Promise<Season[]>
  getCurrentSeason(): Promise<Season | null>
  /** Admin only. Creates or replaces a tournament/league record. */
  upsert(competition: Competition): Promise<Competition>
  upsertSeason(season: Season): Promise<Season>
  remove(id: string): Promise<void>
}

export interface MatchRepository {
  list(): Promise<Match[]>
  listPublic(): Promise<Match[]>
  getById(id: string): Promise<Match | null>
  listByTeam(teamId: string): Promise<Match[]>
  listByCompetition(competitionId: string): Promise<Match[]>
  create(match: Match): Promise<Match>
  update(id: string, patch: Partial<Match>): Promise<Match | null>
  clearScore(id: string): Promise<Match | null>
  remove(id: string): Promise<void>
  subscribePublic(onChange: (matches: Match[]) => void, onError: (error: Error) => void): () => void
}

export interface SnapshotRepository {
  list(): Promise<MatchSnapshot[]>
  getByMatch(matchId: string): Promise<MatchSnapshot | null>
  listByCompetition(competitionId: string): Promise<MatchSnapshot[]>
  capture(snapshot: MatchSnapshot): Promise<MatchSnapshot>
  removeByMatch(matchId: string): Promise<void>
}

export interface MatchRosterRepository {
  listByMatch(matchId: string): Promise<MatchRoster[]>
  listByMatchAndTeam(
    matchId: string,
    teamId: string,
    refreshLiveRoster?: boolean,
  ): Promise<MatchRoster[]>
}

export interface MatchEventRepository {
  listByMatch(matchId: string): Promise<MatchEvent[]>
  listPublicByMatch(matchId: string): Promise<PublicMatchEvent[]>
  subscribePublicByMatches(
    matchIds: string[],
    onChange: (events: PublicMatchEvent[]) => void,
    onError: (error: Error) => void,
  ): () => void
  record(event: MatchEvent): Promise<MatchEvent>
  voidEvent(eventId: string, actorId: string, reason: string): Promise<void>
}

export interface UserRepository {
  list(): Promise<User[]>
  getById(id: string): Promise<User | null>
  /** Firebase Auth UID is the user document id. */
  getByAuthUid(authUid: string): Promise<User | null>
  upsert(user: User): Promise<User>
  update(id: string, patch: Partial<User>): Promise<User | null>
}

export interface MediaRepository {
  list(): Promise<MediaAsset[]>
  listByTeam(teamId: string): Promise<MediaAsset[]>
  listPublished(): Promise<MediaAsset[]>
  create(asset: MediaAsset): Promise<MediaAsset>
  update(id: string, patch: Partial<MediaAsset>): Promise<MediaAsset | null>
  remove(id: string): Promise<void>
}

export interface RegistrationRepository {
  listByTeam(teamId: string): Promise<PlayerRegistration[]>
  listByPlayer(playerId: string): Promise<PlayerRegistration[]>
  listByCompetition(competitionId: string): Promise<PlayerRegistration[]>
  register(entry: PlayerRegistration): Promise<PlayerRegistration>
  update(id: string, patch: Partial<PlayerRegistration>): Promise<PlayerRegistration | null>
}

export interface ChangeRequestRepository {
  list(): Promise<TeamChangeRequest[]>
  listByTeam(teamId: string): Promise<TeamChangeRequest[]>
  listBySubmitter(userId: string): Promise<TeamChangeRequest[]>
  create(request: TeamChangeRequest): Promise<TeamChangeRequest>
  update(id: string, patch: Partial<TeamChangeRequest>): Promise<TeamChangeRequest | null>
}

export interface ReportRepository {
  list(): Promise<PostMatchTeamReport[]>
  listByTeam(teamId: string): Promise<PostMatchTeamReport[]>
  listByMatch(matchId: string): Promise<PostMatchTeamReport[]>
  listStatusByMatch(matchId: string): Promise<PostMatchReportSummary[]>
  getByMatchAndTeam(matchId: string, teamId: string): Promise<PostMatchTeamReport | null>
  submit(report: PostMatchTeamReport): Promise<PostMatchTeamReport>
  amend(
    id: string,
    patch: Pick<PostMatchTeamReport, 'injuriesReported' | 'noInjuriesConfirmed' | 'injuries' | 'additionalNotes'>,
    amendment: PostMatchTeamReport['amendments'][number],
  ): Promise<PostMatchTeamReport | null>
}

export interface AuditRepository {
  list(limit?: number): Promise<AuditEntry[]>
  listByEntity(entityType: AuditEntityType, entityId: string): Promise<AuditEntry[]>
  record(entry: AuditEntry): Promise<AuditEntry>
}

export interface NotificationRepository {
  listByUser(userId: string): Promise<AppNotification[]>
  create(notification: AppNotification): Promise<AppNotification>
  markRead(id: string): Promise<void>
  markAllRead(userId: string): Promise<void>
}

export interface Repositories {
  teams: TeamRepository
  players: PlayerRepository
  competitions: CompetitionRepository
  matches: MatchRepository
  snapshots: SnapshotRepository
  rosters: MatchRosterRepository
  events: MatchEventRepository
  users: UserRepository
  media: MediaRepository
  registrations: RegistrationRepository
  changeRequests: ChangeRequestRepository
  reports: ReportRepository
  audit: AuditRepository
  notifications: NotificationRepository
}
