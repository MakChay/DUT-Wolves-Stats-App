import type {
  AppNotification,
  AuditEntry,
  AuditEntityType,
  Match,
  MatchEvent,
  MatchRoster,
  Player,
  PlayerRegistration,
  PostMatchReportSummary,
  PostMatchTeamReport,
  PublicMatchEvent,
  Team,
  TeamChangeRequest,
} from '@/types/domain'
import { toPublicMatchEvent, toPublicPlayer } from '@/types/domain'
import {
  seedAudit,
  seedChangeRequests,
  seedCompetitions,
  seedEvents,
  seedMatches,
  seedNotifications,
  seedPlayers,
  seedRegistrations,
  seedReports,
  seedRosters,
  seedSeasons,
  seedTeams,
  seedUsers,
} from '@/data/seed'
import type { Repositories } from './contracts'
import { mediaRepository } from './mockMedia'
import { readJson, writeJson } from './storage'

const MATCH_OVERRIDES_KEY = 'dws.mock.matchOverrides.v2'
const MATCH_EVENTS_KEY = 'dws.mock.matchEvents.v2'
const PLAYERS_KEY = 'dws.mock.players.v2'
const CHANGE_REQUESTS_KEY = 'dws.mock.changeRequests.v1'
const REPORTS_KEY = 'dws.mock.reports.v1'
const AUDIT_KEY = 'dws.mock.audit.v1'
const REGISTRATIONS_KEY = 'dws.mock.registrations.v1'
const NOTIFICATIONS_KEY = 'dws.mock.notifications.v1'

const delay = (ms = 90) => new Promise<void>((resolve) => setTimeout(resolve, ms))

const copy = <T,>(value: T): T => structuredClone(value)

const newId = (prefix: string): string =>
  `${prefix}-${typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`}`

const matchOverrides = readJson<Record<string, Partial<Match>>>(MATCH_OVERRIDES_KEY, {})
const storedEvents = readJson<Record<string, MatchEvent[]>>(MATCH_EVENTS_KEY, {})
const storedPlayers = readJson<Player[] | null>(PLAYERS_KEY, null)
const storedRequests = readJson<TeamChangeRequest[] | null>(CHANGE_REQUESTS_KEY, null)
const storedReports = readJson<PostMatchTeamReport[] | null>(REPORTS_KEY, null)
const storedAudit = readJson<AuditEntry[] | null>(AUDIT_KEY, null)
const storedRegistrations = readJson<PlayerRegistration[] | null>(REGISTRATIONS_KEY, null)
const storedNotifications = readJson<AppNotification[] | null>(NOTIFICATIONS_KEY, null)

let teams: Team[] = copy(seedTeams)
let players: Player[] = storedPlayers ? copy(storedPlayers) : copy(seedPlayers)
let matches: Match[] = seedMatches.map((match) => ({
  ...match,
  ...(matchOverrides[match.id] ?? {}),
}))
let events: MatchEvent[] = [
  ...seedEvents.filter((event) => !storedEvents[event.matchId]),
  ...Object.values(storedEvents).flat(),
]
let changeRequests: TeamChangeRequest[] = storedRequests
  ? copy(storedRequests)
  : copy(seedChangeRequests)
let reports: PostMatchTeamReport[] = storedReports ? copy(storedReports) : copy(seedReports)
let auditEntries: AuditEntry[] = storedAudit ? copy(storedAudit) : copy(seedAudit)
let registrations: PlayerRegistration[] = storedRegistrations
  ? copy(storedRegistrations)
  : copy(seedRegistrations)
let notifications: AppNotification[] = storedNotifications
  ? copy(storedNotifications)
  : copy(seedNotifications)

function persistPlayers(): void {
  writeJson(PLAYERS_KEY, players)
}

function persistRequests(): void {
  writeJson(CHANGE_REQUESTS_KEY, changeRequests)
}

function persistReports(): void {
  writeJson(REPORTS_KEY, reports)
}

function persistAudit(): void {
  writeJson(AUDIT_KEY, auditEntries)
}

function persistRegistrations(): void {
  writeJson(REGISTRATIONS_KEY, registrations)
}

function persistNotifications(): void {
  writeJson(NOTIFICATIONS_KEY, notifications)
}

function persistMatchEvents(matchId: string): void {
  const current = readJson<Record<string, MatchEvent[]>>(MATCH_EVENTS_KEY, {})
  current[matchId] = events.filter((event) => event.matchId === matchId)
  writeJson(MATCH_EVENTS_KEY, current)
}

/**
 * Rosters for matches that have not finished are kept in sync with the live
 * player register, so jersey assignments and newly added players appear in the
 * next fixture. Completed matches keep their historical snapshot.
 */
function buildLiveRoster(matchId: string, teamId: string): MatchRoster[] {
  const match = matches.find((entry) => entry.id === matchId)
  const base = seedRosters.filter(
    (entry) => entry.matchId === matchId && entry.teamId === teamId,
  )
  if (!match || match.status === 'completed') return base

  const squad = players.filter(
    (player) =>
      player.teamId === teamId &&
      player.isActive &&
      player.availability !== 'inactive',
  )
  return squad.map((player, index) => {
    const existing = base.find((entry) => entry.playerId === player.id)
    return {
      id: existing?.id ?? `${matchId}_${teamId}_${player.id}`,
      matchId,
      teamId,
      playerId: player.id,
      jerseyNumber: player.jerseyNumber,
      isStarter: existing?.isStarter ?? index < 5,
      isActive: player.availability === 'active',
    }
  })
}

export const mockRepositories: Repositories = {
  teams: {
    async list() {
      await delay()
      return copy(teams)
    },
    async listPublic() {
      await delay()
      return copy(teams.filter((team) => team.publicVisible))
    },
    async getById(id: string) {
      await delay(60)
      const team = teams.find((entry) => entry.id === id)
      return team ? copy(team) : null
    },
    async update(id: string, patch: Partial<Team>) {
      await delay(60)
      const index = teams.findIndex((entry) => entry.id === id)
      if (index === -1) return null
      teams[index] = { ...teams[index]!, ...patch, id }
      return copy(teams[index]!)
    },
  },

  players: {
    async list() {
      await delay()
      return copy(players)
    },
    async listByTeam(teamId: string) {
      await delay()
      return copy(players.filter((player) => player.teamId === teamId))
    },
    async listPublic() {
      await delay()
      return players.filter((player) => player.publicVisible).map(toPublicPlayer)
    },
    async listPublicByTeam(teamId: string) {
      await delay()
      return players
        .filter((player) => player.teamId === teamId && player.publicVisible)
        .map(toPublicPlayer)
    },
    async getById(id: string) {
      await delay(60)
      const player = players.find((entry) => entry.id === id)
      return player ? copy(player) : null
    },
    async getPublicById(id: string) {
      await delay(60)
      const player = players.find((entry) => entry.id === id && entry.publicVisible)
      return player ? toPublicPlayer(player) : null
    },
    async create(player: Player) {
      await delay(80)
      if (
        player.jerseyNumber !== null &&
        player.jerseyNumber !== undefined &&
        players.some(
          (entry) =>
            entry.teamId === player.teamId &&
            entry.jerseyNumber === player.jerseyNumber,
        )
      ) {
        throw new Error('That jersey number is already assigned in this team.')
      }
      const created: Player = {
        ...player,
        id: player.id || newId('player'),
        createdAt: player.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      players = [created, ...players]
      persistPlayers()
      return copy(created)
    },
    async update(id: string, patch: Partial<Player>) {
      await delay(60)
      const index = players.findIndex((entry) => entry.id === id)
      if (index === -1) return null
      const current = players[index]!
      if (
        patch.jerseyNumber !== undefined &&
        patch.jerseyNumber !== null &&
        players.some(
          (entry) =>
            entry.id !== id &&
            entry.teamId === current.teamId &&
            entry.jerseyNumber === patch.jerseyNumber,
        )
      ) {
        throw new Error('That jersey number is already assigned in this team.')
      }
      players[index] = {
        ...current,
        ...patch,
        id,
        updatedAt: new Date().toISOString(),
      }
      persistPlayers()
      return copy(players[index]!)
    },
    async remove(id: string) {
      await delay(60)
      players = players.filter((entry) => entry.id !== id)
      persistPlayers()
    },
  },

  competitions: {
    async list() {
      await delay()
      return copy(seedCompetitions)
    },
    async getById(id: string) {
      await delay(60)
      const competition = seedCompetitions.find((entry) => entry.id === id)
      return competition ? copy(competition) : null
    },
    async listSeasons() {
      await delay()
      return copy(seedSeasons)
    },
    async getCurrentSeason() {
      await delay(60)
      const season = seedSeasons.find((entry) => entry.isCurrent)
      return season ? copy(season) : null
    },
    async upsert(competition) {
      await delay(60)
      const index = seedCompetitions.findIndex((entry) => entry.id === competition.id)
      if (index === -1) seedCompetitions.push(competition)
      else seedCompetitions[index] = competition
      return copy(competition)
    },
    async upsertSeason(season) {
      await delay(60)
      const index = seedSeasons.findIndex((entry) => entry.id === season.id)
      if (index === -1) seedSeasons.push(season)
      else seedSeasons[index] = season
      return copy(season)
    },
    async remove(id) {
      await delay(60)
      const index = seedCompetitions.findIndex((entry) => entry.id === id)
      if (index !== -1) seedCompetitions.splice(index, 1)
    },
  },

  matches: {
    async list() {
      await delay()
      return copy([...matches].sort((a, b) => a.tipoff.localeCompare(b.tipoff)))
    },
    async getById(id: string) {
      await delay(60)
      const match = matches.find((entry) => entry.id === id)
      return match ? copy(match) : null
    },
    async listPublic() {
      await delay()
      return copy(matches.filter((match) => match.publicVisible).sort((a, b) => a.tipoff.localeCompare(b.tipoff)))
    },
    subscribePublic(onChange, onError) {
      let active = true
      const refresh = async () => {
        try {
          const current = await mockRepositories.matches.listPublic()
          if (active) onChange(current)
        } catch (error) {
          if (active) onError(error instanceof Error ? error : new Error('Could not refresh public matches.'))
        }
      }
      void refresh()
      const interval = window.setInterval(() => void refresh(), 15_000)
      return () => {
        active = false
        window.clearInterval(interval)
      }
    },
    async listByTeam(teamId: string) {
      await delay()
      return copy(
        matches
          .filter((match) => match.homeTeamId === teamId || match.awayTeamId === teamId)
          .sort((a, b) => a.tipoff.localeCompare(b.tipoff)),
      )
    },
    async listByCompetition(competitionId: string) {
      await delay()
      return copy(
        matches
          .filter((match) => match.competitionId === competitionId)
          .sort((a, b) => a.tipoff.localeCompare(b.tipoff)),
      )
    },
    async update(id: string, patch: Partial<Match>) {
      await delay(60)
      const index = matches.findIndex((entry) => entry.id === id)
      if (index === -1) return null
      const updated: Match = { ...matches[index]!, ...patch, id }
      matches = matches.map((match) => (match.id === id ? updated : match))
      const overrides = readJson<Record<string, Partial<Match>>>(MATCH_OVERRIDES_KEY, {})
      overrides[id] = { ...(overrides[id] ?? {}), ...patch }
      writeJson(MATCH_OVERRIDES_KEY, overrides)
      return copy(updated)
    },
    async create(match: Match) {
      await delay(60)
      matches = [...matches, match]
      return copy(match)
    },
  },

  rosters: {
    async listByMatch(matchId: string) {
      await delay()
      return copy(matches.flatMap((match) =>
        match.id === matchId
          ? [buildLiveRoster(matchId, match.homeTeamId), buildLiveRoster(matchId, match.awayTeamId)].flat()
          : [],
      ))
    },
    async listByMatchAndTeam(matchId: string, teamId: string) {
      await delay()
      return copy(buildLiveRoster(matchId, teamId))
    },
  },

  events: {
    async listByMatch(matchId: string) {
      await delay(60)
      return copy(
        events
          .filter((event) => event.matchId === matchId)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      )
    },
    async listPublicByMatch(matchId: string) {
      await delay(60)
      return copy(
        events
          .filter((event) => event.matchId === matchId)
          .map(toPublicMatchEvent)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      ) as PublicMatchEvent[]
    },
    subscribePublicByMatches(matchIds, onChange, onError) {
      let active = true
      const refresh = async () => {
        try {
          const lists = await Promise.all(
            matchIds.map((matchId) => mockRepositories.events.listPublicByMatch(matchId)),
          )
          if (active) onChange(lists.flat())
        } catch (error) {
          if (active) onError(error instanceof Error ? error : new Error('Could not refresh public events.'))
        }
      }
      void refresh()
      const interval = window.setInterval(() => void refresh(), 15_000)
      return () => {
        active = false
        window.clearInterval(interval)
      }
    },
    async record(event: MatchEvent) {
      await delay(50)
      const existing = events.find(
        (entry) => entry.id === event.id || entry.clientEventId === event.clientEventId,
      )
      if (existing) return copy(existing)
      events = [...events, event]
      persistMatchEvents(event.matchId)
      return copy(event)
    },
    async voidEvent(eventId: string, actorId: string, reason: string) {
      await delay(50)
      const target = events.find((event) => event.id === eventId)
      if (!target) return
      events = events.map((event) =>
        event.id === eventId
          ? {
              ...event,
              voided: true,
              voidedAt: new Date().toISOString(),
              voidedBy: actorId,
              voidReason: reason,
            }
          : event,
      )
      persistMatchEvents(target.matchId)
    },
  },

  users: {
    async list() {
      await delay()
      return copy(seedUsers)
    },
    async getById(id: string) {
      await delay(60)
      const user = seedUsers.find((entry) => entry.id === id)
      return user ? copy(user) : null
    },
    async getByAuthUid(authUid: string) {
      await delay(60)
      const user = seedUsers.find((entry) => entry.id === authUid || entry.authUid === authUid)
      return user ? copy(user) : null
    },
    async upsert(user) {
      await delay(60)
      const index = seedUsers.findIndex((entry) => entry.id === user.id)
      if (index === -1) seedUsers.push(user)
      else seedUsers[index] = user
      return copy(user)
    },
    async update(id, patch) {
      await delay(60)
      const index = seedUsers.findIndex((entry) => entry.id === id)
      if (index === -1) return null
      seedUsers[index] = { ...seedUsers[index]!, ...patch, id }
      return copy(seedUsers[index]!)
    },
  },

  media: mediaRepository,

  registrations: {
    async listByTeam(teamId: string) {
      await delay(60)
      return copy(registrations.filter((entry) => entry.teamId === teamId))
    },
    async listByPlayer(playerId: string) {
      await delay(60)
      return copy(registrations.filter((entry) => entry.playerId === playerId))
    },
    async listByCompetition(competitionId: string) {
      await delay(60)
      return copy(registrations.filter((entry) => entry.competitionId === competitionId))
    },
    async register(entry: PlayerRegistration) {
      await delay(60)
      const existing = registrations.find(
        (item) =>
          item.playerId === entry.playerId &&
          item.competitionId === entry.competitionId &&
          item.teamId === entry.teamId,
      )
      if (existing) {
        const updated: PlayerRegistration = { ...existing, ...entry, id: existing.id }
        registrations = registrations.map((item) =>
          item.id === existing.id ? updated : item,
        )
        persistRegistrations()
        return copy(updated)
      }
      const created: PlayerRegistration = { ...entry, id: entry.id || newId('reg') }
      registrations = [created, ...registrations]
      persistRegistrations()
      return copy(created)
    },
    async update(id: string, patch: Partial<PlayerRegistration>) {
      await delay(60)
      const index = registrations.findIndex((entry) => entry.id === id)
      if (index === -1) return null
      registrations[index] = { ...registrations[index]!, ...patch, id }
      persistRegistrations()
      return copy(registrations[index]!)
    },
  },

  changeRequests: {
    async list() {
      await delay(80)
      return copy(
        [...changeRequests].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
      )
    },
    async listByTeam(teamId: string) {
      await delay(80)
      return copy(
        changeRequests
          .filter((entry) => entry.teamId === teamId)
          .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
      )
    },
    async listBySubmitter(userId: string) {
      await delay(80)
      return copy(
        changeRequests
          .filter((entry) => entry.submittedByUserId === userId)
          .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
      )
    },
    async create(request: TeamChangeRequest) {
      await delay(60)
      const created: TeamChangeRequest = {
        ...request,
        id: request.id || newId('req'),
      }
      changeRequests = [created, ...changeRequests]
      persistRequests()
      return copy(created)
    },
    async update(id: string, patch: Partial<TeamChangeRequest>) {
      await delay(60)
      const index = changeRequests.findIndex((entry) => entry.id === id)
      if (index === -1) return null
      changeRequests[index] = { ...changeRequests[index]!, ...patch, id }
      persistRequests()
      return copy(changeRequests[index]!)
    },
  },

  reports: {
    async list() {
      await delay(80)
      return copy(
        [...reports].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
      )
    },
    async listByTeam(teamId: string) {
      await delay(80)
      return copy(
        reports
          .filter((entry) => entry.teamId === teamId)
          .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
      )
    },
    async listByMatch(matchId: string) {
      await delay(80)
      return copy(reports.filter((entry) => entry.matchId === matchId))
    },
    async listStatusByMatch(matchId: string) {
      await delay(80)
      return copy(
        reports
          .filter((entry) => entry.matchId === matchId)
          .map(({ id, matchId: reportMatchId, teamId, status, submittedAt }) => ({
            id,
            matchId: reportMatchId,
            teamId,
            status,
            submittedAt,
          })),
      ) as PostMatchReportSummary[]
    },
    async getByMatchAndTeam(matchId: string, teamId: string) {
      await delay(60)
      const report = reports.find(
        (entry) => entry.matchId === matchId && entry.teamId === teamId,
      )
      return report ? copy(report) : null
    },
    async submit(report: PostMatchTeamReport) {
      await delay(80)
      const existingIndex = reports.findIndex(
        (entry) => entry.matchId === report.matchId && entry.teamId === report.teamId,
      )
      if (existingIndex !== -1) {
        const updated: PostMatchTeamReport = {
          ...reports[existingIndex]!,
          ...report,
          id: reports[existingIndex]!.id,
        }
        reports[existingIndex] = updated
        persistReports()
        return copy(updated)
      }
      const created: PostMatchTeamReport = { ...report, id: report.id || newId('report') }
      reports = [created, ...reports]
      persistReports()
      return copy(created)
    },
    async amend(id, patch, amendment) {
      await delay(80)
      const index = reports.findIndex((entry) => entry.id === id)
      if (index === -1) return null
      const current = reports[index]!
      const updated: PostMatchTeamReport = {
        ...current,
        ...patch,
        status: 'amended',
        amendments: [...current.amendments, amendment],
      }
      reports[index] = updated
      persistReports()
      return copy(updated)
    },
  },

  audit: {
    async list(limit = 200) {
      await delay(60)
      return copy(
        [...auditEntries]
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, limit),
      )
    },
    async listByEntity(entityType: AuditEntityType, entityId: string) {
      await delay(60)
      return copy(
        auditEntries
          .filter(
            (entry) => entry.entityType === entityType && entry.entityId === entityId,
          )
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      )
    },
    async record(entry: AuditEntry) {
      await delay(40)
      const created: AuditEntry = { ...entry, id: entry.id || newId('audit') }
      auditEntries = [created, ...auditEntries]
      persistAudit()
      return copy(created)
    },
  },

  notifications: {
    async listByUser(userId: string) {
      await delay(60)
      return copy(
        notifications
          .filter((entry) => entry.userId === userId)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      )
    },
    async create(notification: AppNotification) {
      await delay(40)
      const created: AppNotification = {
        ...notification,
        id: notification.id || newId('notif'),
      }
      notifications = [created, ...notifications]
      persistNotifications()
      return copy(created)
    },
    async markRead(id: string) {
      await delay(30)
      notifications = notifications.map((entry) =>
        entry.id === id ? { ...entry, readAt: new Date().toISOString() } : entry,
      )
      persistNotifications()
    },
    async markAllRead(userId: string) {
      await delay(30)
      const now = new Date().toISOString()
      notifications = notifications.map((entry) =>
        entry.userId === userId && !entry.readAt ? { ...entry, readAt: now } : entry,
      )
      persistNotifications()
    },
  },
}

export type MockEntity =
  | Team
  | Player
  | PlayerRegistration
  | TeamChangeRequest
  | PostMatchTeamReport
  | AuditEntry
  | AppNotification
  | Match
  | MatchRoster
  | MatchEvent
