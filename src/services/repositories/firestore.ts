import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore'
import type {
  AppNotification,
  AuditEntry,
  AuditEntityType,
  Competition,
  Match,
  MatchEvent,
  MatchRoster,
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
import { toPublicMatchEvent, toPublicPlayer } from '@/types/domain'
import { firestore } from '@/services/firebase/app'
import type { Repositories } from './contracts'

/**
 * Firestore-backed repositories.
 *
 * Collections
 *   teams, players, publicPlayers, competitions, seasons, matches,
 *   matchRosters, matchEvents, publicMatchEvents, users, media, registrations,
 *   changeRequests, reports, reportStatuses, audit, notifications
 *
 * `players` is staff-only and contains private identifiers. `publicPlayers` is
 * the sanitised, publicly readable projection; it is rewritten whenever a
 * manager or administrator changes a roster record.
 */
export const COLLECTIONS = {
  teams: 'teams',
  players: 'players',
  publicPlayers: 'publicPlayers',
  competitions: 'competitions',
  seasons: 'seasons',
  matches: 'matches',
  rosters: 'matchRosters',
  events: 'matchEvents',
  publicEvents: 'publicMatchEvents',
  users: 'users',
  media: 'media',
  registrations: 'registrations',
  changeRequests: 'changeRequests',
  reports: 'reports',
  reportStatuses: 'reportStatuses',
  audit: 'audit',
  notifications: 'notifications',
} as const

function db() {
  if (!firestore) {
    throw new Error('Firebase is not configured. Check the VITE_FIREBASE_* environment variables.')
  }
  return firestore
}

/** Firestore rejects undefined values, so strip them recursively. */
function clean<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => clean(item)) as T
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const output: Record<string, unknown> = {}
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (entry !== undefined) output[key] = clean(entry)
    }
    return output as T
  }
  return value
}

function fromDoc<T>(id: string, data: DocumentData | undefined): T {
  return { ...(data as object), id } as T
}

async function readAll<T>(name: string): Promise<T[]> {
  const snapshot = await getDocs(collection(db(), name))
  return snapshot.docs.map((row) => fromDoc<T>(row.id, row.data()))
}

async function readWhere<T>(name: string, field: string, value: unknown): Promise<T[]> {
  const snapshot = await getDocs(query(collection(db(), name), where(field, '==', value)))
  return snapshot.docs.map((row) => fromDoc<T>(row.id, row.data()))
}

async function readWhereFields<T>(
  name: string,
  fields: Array<[string, unknown]>,
): Promise<T[]> {
  const constraints = fields.map(([field, value]) => where(field, '==', value))
  const snapshot = await getDocs(query(collection(db(), name), ...constraints))
  return snapshot.docs.map((row) => fromDoc<T>(row.id, row.data()))
}

async function readOne<T>(name: string, id: string): Promise<T | null> {
  const snapshot = await getDoc(doc(db(), name, id))
  return snapshot.exists() ? fromDoc<T>(snapshot.id, snapshot.data()) : null
}

async function write<T extends { id: string }>(name: string, value: T): Promise<T> {
  const { id, ...data } = value
  await setDoc(doc(db(), name, id), clean(data))
  return value
}

async function patch<T>(name: string, id: string, changes: object): Promise<T | null> {
  await updateDoc(doc(db(), name, id), clean(changes) as DocumentData)
  return readOne<T>(name, id)
}

const byDesc = (field: 'submittedAt' | 'createdAt') => (a: object, b: object) =>
  String((b as Record<string, string>)[field]).localeCompare(
    String((a as Record<string, string>)[field]),
  )

const byTipoff = (a: Match, b: Match) => a.tipoff.localeCompare(b.tipoff)

/**
 * Public projections never carry student numbers, campuses or injury detail.
 * Injured players are simply unavailable on the public site.
 */
function toPublicDocument(player: Player): PublicPlayer {
  const projected = toPublicPlayer(player)
  return {
    ...projected,
    availability: player.availability === 'injured' ? 'unavailable' : player.availability,
  }
}

async function assertJerseyAvailable(player: Player, excludeId?: string): Promise<void> {
  if (player.jerseyNumber === null || player.jerseyNumber === undefined) return
  const squad = await readWhere<Player>(COLLECTIONS.players, 'teamId', player.teamId)
  const clash = squad.find(
    (entry) => entry.id !== excludeId && entry.jerseyNumber === player.jerseyNumber,
  )
  if (clash) throw new Error('That jersey number is already assigned in this team.')
}

export const firestoreRepositories: Repositories = {
  teams: {
    list: () => readAll<Team>(COLLECTIONS.teams),
    listPublic: () => readWhere<Team>(COLLECTIONS.teams, 'publicVisible', true),
    getById: (id) => readOne<Team>(COLLECTIONS.teams, id),
    update: (id, changes) => patch<Team>(COLLECTIONS.teams, id, changes),
  },

  players: {
    list: () => readAll<Player>(COLLECTIONS.players),
    listByTeam: (teamId) => readWhere<Player>(COLLECTIONS.players, 'teamId', teamId),
    listPublic: () => readAll<PublicPlayer>(COLLECTIONS.publicPlayers),
    listPublicByTeam: (teamId) =>
      readWhere<PublicPlayer>(COLLECTIONS.publicPlayers, 'teamId', teamId),
    getById: (id) => readOne<Player>(COLLECTIONS.players, id),
    getPublicById: (id) => readOne<PublicPlayer>(COLLECTIONS.publicPlayers, id),
    async create(player) {
      const created: Player = {
        ...player,
        createdAt: player.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      await assertJerseyAvailable(created)
      const { id, ...playerData } = created
      const batch = writeBatch(db())
      batch.set(doc(db(), COLLECTIONS.players, id), clean(playerData))
      if (created.publicVisible && created.isActive) {
        const { id: publicId, ...publicData } = toPublicDocument(created)
        batch.set(doc(db(), COLLECTIONS.publicPlayers, publicId), clean(publicData))
      }
      await batch.commit()
      return created
    },
    async update(id, changes) {
      const current = await readOne<Player>(COLLECTIONS.players, id)
      if (!current) return null
      const updated: Player = {
        ...current,
        ...changes,
        id,
        updatedAt: new Date().toISOString(),
      }
      await assertJerseyAvailable(updated, id)
      const { id: playerId, ...playerData } = updated
      const batch = writeBatch(db())
      batch.set(doc(db(), COLLECTIONS.players, playerId), clean(playerData))
      if (updated.publicVisible && updated.isActive) {
        const { id: publicId, ...publicData } = toPublicDocument(updated)
        batch.set(doc(db(), COLLECTIONS.publicPlayers, publicId), clean(publicData))
      } else if (await readOne<PublicPlayer>(COLLECTIONS.publicPlayers, id)) {
        batch.delete(doc(db(), COLLECTIONS.publicPlayers, id))
      }
      await batch.commit()
      return updated
    },
    async remove(id) {
      const current = await readOne<Player>(COLLECTIONS.players, id)
      if (!current) return
      const batch = writeBatch(db())
      batch.delete(doc(db(), COLLECTIONS.players, id))
      if (await readOne<PublicPlayer>(COLLECTIONS.publicPlayers, id)) {
        batch.delete(doc(db(), COLLECTIONS.publicPlayers, id))
      }
      await batch.commit()
    },
  },

  competitions: {
    list: () => readAll<Competition>(COLLECTIONS.competitions),
    getById: (id) => readOne<Competition>(COLLECTIONS.competitions, id),
    listSeasons: () => readAll<Season>(COLLECTIONS.seasons),
    async getCurrentSeason() {
      const seasons = await readWhere<Season>(COLLECTIONS.seasons, 'isCurrent', true)
      return seasons[0] ?? null
    },
    upsert: (competition) => write(COLLECTIONS.competitions, competition),
    upsertSeason: (season) => write(COLLECTIONS.seasons, season),
    async remove(id) {
      await deleteDoc(doc(db(), COLLECTIONS.competitions, id))
    },
  },

  matches: {
    async list() {
      return (await readAll<Match>(COLLECTIONS.matches)).sort(byTipoff)
    },
    getById: (id) => readOne<Match>(COLLECTIONS.matches, id),
    async listPublic() {
      return (await readWhere<Match>(COLLECTIONS.matches, 'publicVisible', true)).sort(byTipoff)
    },
    subscribePublic(onChange, onError) {
      return onSnapshot(
        query(collection(db(), COLLECTIONS.matches), where('publicVisible', '==', true)),
        (snapshot) =>
          onChange(
            snapshot.docs
              .map((row) => fromDoc<Match>(row.id, row.data()))
              .sort(byTipoff),
          ),
        onError,
      )
    },
    async listByTeam(teamId) {
      const [home, away] = await Promise.all([
        readWhere<Match>(COLLECTIONS.matches, 'homeTeamId', teamId),
        readWhere<Match>(COLLECTIONS.matches, 'awayTeamId', teamId),
      ])
      return [...new Map([...home, ...away].map((match) => [match.id, match])).values()].sort(byTipoff)
    },
    async listByCompetition(competitionId) {
      return (await readWhere<Match>(COLLECTIONS.matches, 'competitionId', competitionId)).sort(
        byTipoff,
      )
    },
    create: (match) => write(COLLECTIONS.matches, match),
    update: (id, changes) => patch<Match>(COLLECTIONS.matches, id, changes),
  },

  rosters: {
    async listByMatch(matchId) {
      const stored = await readWhere<MatchRoster>(COLLECTIONS.rosters, 'matchId', matchId)
      return buildRoster(matchId, stored)
    },
    async listByMatchAndTeam(matchId, teamId, refreshLiveRoster = false) {
      const stored = await readWhereFields<MatchRoster>(COLLECTIONS.rosters, [
        ['matchId', matchId],
        ['teamId', teamId],
      ])
      return buildRoster(
        matchId,
        stored,
        [teamId],
        refreshLiveRoster ? [teamId] : [],
      )
    },
  },

  events: {
    async listByMatch(matchId) {
      return (await readWhere<MatchEvent>(COLLECTIONS.events, 'matchId', matchId)).sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      )
    },
    async listPublicByMatch(matchId) {
      return (await readWhere<PublicMatchEvent>(COLLECTIONS.publicEvents, 'matchId', matchId)).sort(
        (a, b) => b.createdAt.localeCompare(a.createdAt),
      )
    },
    subscribePublicByMatches(matchIds, onChange, onError) {
      if (matchIds.length === 0) {
        onChange([])
        return () => {}
      }

      const documentsByMatch = new Map<string, Map<string, PublicMatchEvent>>()
      let disposed = false
      const unsubscribers: Array<() => void> = []
      for (let offset = 0; offset < matchIds.length; offset += 30) {
        const ids = matchIds.slice(offset, offset + 30)
        const unsubscribe = onSnapshot(
          query(collection(db(), COLLECTIONS.publicEvents), where('matchId', 'in', ids)),
          (snapshot) => {
            const chunkMatches = new Set(ids)
            for (const matchId of chunkMatches) documentsByMatch.delete(matchId)
            for (const row of snapshot.docs) {
              const event = fromDoc<PublicMatchEvent>(row.id, row.data())
              const events = documentsByMatch.get(event.matchId) ?? new Map()
              events.set(event.id, event)
              documentsByMatch.set(event.matchId, events)
            }
            if (!disposed) {
              onChange(
                [...documentsByMatch.values()]
                  .flatMap((events) => [...events.values()])
                  .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
              )
            }
          },
          onError,
        )
        unsubscribers.push(unsubscribe)
      }
      return () => {
        disposed = true
        unsubscribers.forEach((unsubscribe) => unsubscribe())
      }
    },
    async record(event) {
      const duplicates = await readWhereFields<MatchEvent>(
        COLLECTIONS.events,
        [
          ['matchId', event.matchId],
          ['clientEventId', event.clientEventId],
        ],
      )
      if (duplicates.length > 0) return duplicates[0]!
      const batch = writeBatch(db())
      const { id: eventId, ...eventData } = event
      const publicEvent = toPublicMatchEvent(event)
      const { id: publicEventId, ...publicEventData } = publicEvent
      batch.set(doc(db(), COLLECTIONS.events, eventId), clean(eventData))
      batch.set(doc(db(), COLLECTIONS.publicEvents, publicEventId), clean(publicEventData))
      await batch.commit()
      return event
    },
    async voidEvent(eventId, actorId, reason) {
      const current = await readOne<MatchEvent>(COLLECTIONS.events, eventId)
      if (!current) return
      const voidedAt = new Date().toISOString()
      const updated: MatchEvent = {
        ...current,
        voided: true,
        voidedAt,
        voidedBy: actorId,
        voidReason: reason,
      }
      const { id: publicEventId, ...publicEventData } = toPublicMatchEvent(updated)
      const batch = writeBatch(db())
      batch.update(doc(db(), COLLECTIONS.events, eventId), {
        voided: true,
        voidedAt,
        voidedBy: actorId,
        voidReason: reason,
      })
      batch.set(doc(db(), COLLECTIONS.publicEvents, publicEventId), clean(publicEventData))
      await batch.commit()
    },
  },

  users: {
    list: () => readAll<User>(COLLECTIONS.users),
    getById: (id) => readOne<User>(COLLECTIONS.users, id),
    getByAuthUid: async (authUid) => readOne<User>(COLLECTIONS.users, authUid),
    upsert: (user) => write(COLLECTIONS.users, user),
    update: (id, changes) => patch<User>(COLLECTIONS.users, id, changes),
  },

  media: {
    list: () => readAll<MediaAsset>(COLLECTIONS.media),
    async listByTeam(teamId) {
      return (await readAll<MediaAsset>(COLLECTIONS.media)).filter(
        (asset) => asset.teamId === teamId || !asset.teamId,
      )
    },
    listPublished: () => readWhere<MediaAsset>(COLLECTIONS.media, 'status', 'published'),
    create: (asset) => write(COLLECTIONS.media, asset),
    update: (id, changes) =>
      patch<MediaAsset>(COLLECTIONS.media, id, {
        ...changes,
        updatedAt: new Date().toISOString(),
      }),
    async remove(id) {
      await deleteDoc(doc(db(), COLLECTIONS.media, id))
    },
  },

  registrations: {
    listByTeam: (teamId) => readWhere<PlayerRegistration>(COLLECTIONS.registrations, 'teamId', teamId),
    listByPlayer: (playerId) =>
      readWhere<PlayerRegistration>(COLLECTIONS.registrations, 'playerId', playerId),
    listByCompetition: (competitionId) =>
      readWhere<PlayerRegistration>(COLLECTIONS.registrations, 'competitionId', competitionId),
    async register(entry) {
      const existing = (await readWhereFields<PlayerRegistration>(
        COLLECTIONS.registrations,
        [
          ['teamId', entry.teamId],
          ['playerId', entry.playerId],
          ['competitionId', entry.competitionId],
        ],
      )).find(
        (row) => row.competitionId === entry.competitionId && row.teamId === entry.teamId,
      )
      return write(COLLECTIONS.registrations, {
        ...entry,
        id: existing?.id ?? entry.id,
      })
    },
    update: (id, changes) => patch<PlayerRegistration>(COLLECTIONS.registrations, id, changes),
  },

  changeRequests: {
    async list() {
      return (await readAll<TeamChangeRequest>(COLLECTIONS.changeRequests)).sort(
        byDesc('submittedAt'),
      )
    },
    async listByTeam(teamId) {
      return (
        await readWhere<TeamChangeRequest>(COLLECTIONS.changeRequests, 'teamId', teamId)
      ).sort(byDesc('submittedAt'))
    },
    async listBySubmitter(userId) {
      return (
        await readWhere<TeamChangeRequest>(COLLECTIONS.changeRequests, 'submittedByUserId', userId)
      ).sort(byDesc('submittedAt'))
    },
    create: (request) => write(COLLECTIONS.changeRequests, request),
    update: (id, changes) => patch<TeamChangeRequest>(COLLECTIONS.changeRequests, id, changes),
  },

  reports: {
    async list() {
      return (await readAll<PostMatchTeamReport>(COLLECTIONS.reports)).sort(byDesc('submittedAt'))
    },
    async listByTeam(teamId) {
      return (await readWhere<PostMatchTeamReport>(COLLECTIONS.reports, 'teamId', teamId)).sort(
        byDesc('submittedAt'),
      )
    },
    listByMatch: (matchId) => readWhere<PostMatchTeamReport>(COLLECTIONS.reports, 'matchId', matchId),
    async getByMatchAndTeam(matchId, teamId) {
      const rows = await readWhereFields<PostMatchTeamReport>(COLLECTIONS.reports, [
        ['matchId', matchId],
        ['teamId', teamId],
      ])
      return rows.find((row) => row.teamId === teamId) ?? null
    },
    listStatusByMatch: (matchId) =>
      readWhere<PostMatchReportSummary>(COLLECTIONS.reportStatuses, 'matchId', matchId),
    async submit(report) {
      const existing = await firestoreRepositories.reports.getByMatchAndTeam(
        report.matchId,
        report.teamId,
      )
      const submitted = { ...report, id: existing?.id ?? report.id }
      const { id, ...reportData } = submitted
      const status: PostMatchReportSummary = {
        id,
        matchId: report.matchId,
        teamId: report.teamId,
        status: report.status,
        submittedAt: report.submittedAt,
      }
      const { id: statusId, ...statusData } = status
      const batch = writeBatch(db())
      batch.set(doc(db(), COLLECTIONS.reports, id), clean(reportData))
      batch.set(doc(db(), COLLECTIONS.reportStatuses, statusId), clean(statusData))
      await batch.commit()
      return submitted
    },
    async amend(id, changes, amendment) {
      const current = await readOne<PostMatchTeamReport>(COLLECTIONS.reports, id)
      if (!current) return null
      const updated: PostMatchTeamReport = {
        ...current,
        ...changes,
        id,
        status: 'amended',
        amendments: [...current.amendments, amendment],
      }
      const { id: reportId, ...reportData } = updated
      const status: PostMatchReportSummary = {
        id: reportId,
        matchId: updated.matchId,
        teamId: updated.teamId,
        status: updated.status,
        submittedAt: updated.submittedAt,
      }
      const { id: statusId, ...statusData } = status
      const batch = writeBatch(db())
      batch.set(doc(db(), COLLECTIONS.reports, reportId), clean(reportData))
      batch.set(doc(db(), COLLECTIONS.reportStatuses, statusId), clean(statusData))
      await batch.commit()
      return updated
    },
  },

  audit: {
    async list(limit = 200) {
      return (await readAll<AuditEntry>(COLLECTIONS.audit)).sort(byDesc('createdAt')).slice(0, limit)
    },
    async listByEntity(entityType: AuditEntityType, entityId: string) {
      return (await readWhereFields<AuditEntry>(COLLECTIONS.audit, [
        ['entityType', entityType],
        ['entityId', entityId],
      ]))
        .sort(byDesc('createdAt'))
    },
    record: (entry) => write(COLLECTIONS.audit, entry),
  },

  notifications: {
    async listByUser(userId) {
      return (await readWhere<AppNotification>(COLLECTIONS.notifications, 'userId', userId)).sort(
        byDesc('createdAt'),
      )
    },
    create: (notification) => write(COLLECTIONS.notifications, notification),
    async markRead(id) {
      await patch(COLLECTIONS.notifications, id, { readAt: new Date().toISOString() })
    },
    async markAllRead(userId) {
      const rows = await readWhere<AppNotification>(COLLECTIONS.notifications, 'userId', userId)
      const now = new Date().toISOString()
      await Promise.all(
        rows.filter((row) => !row.readAt).map((row) => patch(COLLECTIONS.notifications, row.id, { readAt: now })),
      )
    },
  },
}

/**
 * Rosters for unfinished matches follow the live register, so new players and
 * jersey assignments appear in the next fixture. Completed matches keep the
 * stored snapshot.
 */
async function buildRoster(
  matchId: string,
  stored: MatchRoster[],
  selectedTeamIds?: string[],
  refreshTeamIds?: string[],
): Promise<MatchRoster[]> {
  const match = await readOne<Match>(COLLECTIONS.matches, matchId)
  if (!match || match.status === 'completed') return stored

  const teamIds = selectedTeamIds ?? [match.homeTeamId, match.awayTeamId]
  const liveTeamIds = refreshTeamIds ?? teamIds
  const output: MatchRoster[] = []
  for (const teamId of teamIds) {
    if (!liveTeamIds.includes(teamId)) {
      const savedRoster = stored.filter((entry) => entry.teamId === teamId)
      if (savedRoster.length > 0) {
        output.push(...savedRoster)
        continue
      }

      const publicSquad = await readWhere<PublicPlayer>(COLLECTIONS.publicPlayers, 'teamId', teamId)
      publicSquad
        .filter((player) => player.publicVisible && player.isActive)
        .forEach((player, index) => {
          output.push({
            id: `${matchId}_${teamId}_${player.id}`,
            matchId,
            teamId,
            playerId: player.id,
            jerseyNumber: player.jerseyNumber,
            isStarter: index < 5,
            isActive: player.availability === 'active',
          })
        })
      continue
    }
    const squad = await readWhere<Player>(COLLECTIONS.players, 'teamId', teamId)
    const eligible = squad.filter(
      (player) => player.isActive && player.availability !== 'inactive',
    )
    eligible.forEach((player, index) => {
      const existing = stored.find(
        (entry) => entry.teamId === teamId && entry.playerId === player.id,
      )
      output.push({
        id: existing?.id ?? `${matchId}_${teamId}_${player.id}`,
        matchId,
        teamId,
        playerId: player.id,
        jerseyNumber: player.jerseyNumber,
        isStarter: existing?.isStarter ?? index < 5,
        isActive: player.availability === 'active',
      })
    })
  }
  return output
}
