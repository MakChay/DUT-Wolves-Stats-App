import type {
  Competition,
  Player,
  PlayerRegistration,
  Season,
  Team,
  UserRole,
} from '../types/domain'
import { OFFICIAL_STAFF, rosterPlayers } from './roster'

/**
 * Initial Firestore content.
 *
 * Only supplied data is seeded: the two DUT squads, the official staff, the
 * competition shells and opponent teams. Opponent squads are registered by
 * jersey number only (4–15); no opponent names are invented. No fixtures,
 * results, statistics, injuries or media are fabricated — those are created by
 * managers and administrators through the app.
 */

export const DUT_TEAM_IDS = ['team-men', 'team-women'] as const

export const bootstrapSeasons: Season[] = [
  {
    id: 'season-2026',
    name: '2026 Season',
    startDate: '2026-02-01T00:00:00.000Z',
    endDate: '2026-11-30T23:59:00.000Z',
    isCurrent: true,
  },
]

export const bootstrapCompetitions: Competition[] = [
  {
    id: 'comp-ussa-2026',
    name: 'USSA Basketball Championships 2026',
    shortName: 'USSA 2026',
    seasonId: 'season-2026',
    type: 'tournament',
    startDate: '2026-10-16T08:00:00.000Z',
    endDate: '2026-10-27T20:00:00.000Z',
    publicVisible: true,
  },
  {
    id: 'comp-league-2026',
    name: 'DUT Basketball League 2026',
    shortName: 'DUT League',
    seasonId: 'season-2026',
    type: 'league',
    startDate: '2026-10-28T08:00:00.000Z',
    endDate: '2026-11-30T20:00:00.000Z',
    publicVisible: true,
  },
]

interface OpponentSeed {
  id: string
  name: string
  shortName: string
  gender: 'men' | 'women'
  primaryColor: string
}

export const opponentTeams: OpponentSeed[] = [
  { id: 'team-ukzn-men', name: 'UKZN Impi', shortName: 'UKZN', gender: 'men', primaryColor: '#2563EB' },
  { id: 'team-wits-men', name: 'Wits Warriors', shortName: 'Wits', gender: 'men', primaryColor: '#7C3AED' },
  { id: 'team-uj-men', name: 'UJ Lions', shortName: 'UJ', gender: 'men', primaryColor: '#DC2626' },
  { id: 'team-tut-men', name: 'TUT Vikings', shortName: 'TUT', gender: 'men', primaryColor: '#0F766E' },
  { id: 'team-cput-men', name: 'CPUT Wings', shortName: 'CPUT', gender: 'men', primaryColor: '#B45309' },
  { id: 'team-nwu-men', name: 'NWU Eagles', shortName: 'NWU', gender: 'men', primaryColor: '#4338CA' },
  { id: 'team-ufs-men', name: 'UFS Kovsies', shortName: 'UFS', gender: 'men', primaryColor: '#BE123C' },
  { id: 'team-ukzn-women', name: 'UKZN Impi Women', shortName: 'UKZN W', gender: 'women', primaryColor: '#2563EB' },
  { id: 'team-wits-women', name: 'Wits Warriors Women', shortName: 'Wits W', gender: 'women', primaryColor: '#7C3AED' },
  { id: 'team-uj-women', name: 'UJ Lions Women', shortName: 'UJ W', gender: 'women', primaryColor: '#DC2626' },
]

/** Basketball squad numbers 4–15. Numbers only, never names. */
export const OPPONENT_SQUAD_NUMBERS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]

export const dutPlayers: Player[] = rosterPlayers.map((entry) => ({
  id: entry.id,
  teamId: entry.teamId,
  firstName: entry.firstName,
  lastName: entry.lastName,
  jerseyNumber: null,
  position: null,
  secondaryPosition: null,
  availability: 'active',
  studentNumber: entry.studentNumber,
  campus: entry.campus,
  isActive: true,
  publicVisible: true,
  archivedAt: null,
  joinedAt: '2026-02-01T00:00:00.000Z',
  registeredCompetitionIds: ['comp-league-2026'],
}))

export const opponentPlayers: Player[] = opponentTeams.flatMap((team) =>
  OPPONENT_SQUAD_NUMBERS.map((jerseyNumber) => ({
    id: `${team.id}-p${jerseyNumber}`,
    teamId: team.id,
    firstName: '',
    lastName: '',
    numberOnly: true,
    jerseyNumber,
    position: null,
    secondaryPosition: null,
    availability: 'active' as const,
    isActive: true,
    // Number-only opponent registrations are internal, never public profiles.
    publicVisible: false,
    archivedAt: null,
  })),
)

export function dutTeams(staffUid: Record<string, string>): Team[] {
  const manager = (key: string) => staffUid[key] ?? ''
  const coaches = (keys: string[]) => keys.map((key) => staffUid[key] ?? '').filter(Boolean)
  return [
    {
      id: 'team-men',
      name: 'DUT Wolves Men',
      shortName: 'Wolves Men',
      gender: 'men',
      managerId: manager('menManager'),
      coachIds: coaches(['menCoach1', 'menCoach2']),
      primaryColor: '#B5935A',
      publicVisible: true,
      description: 'DUT Wolves men’s basketball programme.',
      homeVenue: 'DUT Sports Centre, Durban',
    },
    {
      id: 'team-women',
      name: 'DUT Wolves Women',
      shortName: 'Wolves Women',
      gender: 'women',
      managerId: manager('womenManager'),
      coachIds: coaches(['womenCoach1', 'womenCoach2']),
      primaryColor: '#B5935A',
      publicVisible: true,
      description: 'DUT Wolves women’s basketball programme.',
      homeVenue: 'DUT Sports Centre, Durban',
    },
  ]
}

export function opponentTeamRecords(): Team[] {
  return opponentTeams.map((team) => ({
    id: team.id,
    name: team.name,
    shortName: team.shortName,
    gender: team.gender,
    managerId: '',
    coachIds: [],
    primaryColor: team.primaryColor,
    publicVisible: true,
  }))
}

export interface StaffAccountSeed {
  key: string
  displayName: string
  email: string
  role: UserRole
  teamIds: string[]
  title?: string
}

export const staffAccounts: StaffAccountSeed[] = [
  {
    key: 'menManager',
    displayName: OFFICIAL_STAFF.menManager.name,
    email: OFFICIAL_STAFF.menManager.email,
    role: 'manager',
    teamIds: ['team-men'],
    title: 'Team Manager',
  },
  {
    key: 'womenManager',
    displayName: OFFICIAL_STAFF.womenManager.name,
    email: OFFICIAL_STAFF.womenManager.email,
    role: 'manager',
    teamIds: ['team-women'],
    title: 'Team Manager',
  },
  ...OFFICIAL_STAFF.menCoaches.map((coach, index) => ({
    key: `menCoach${index + 1}`,
    displayName: coach.name,
    email: coach.email,
    role: 'coach' as const,
    teamIds: ['team-men'],
    title: coach.title,
  })),
  ...OFFICIAL_STAFF.womenCoaches.map((coach, index) => ({
    key: `womenCoach${index + 1}`,
    displayName: coach.name,
    email: coach.email,
    role: 'coach' as const,
    teamIds: ['team-women'],
    title: coach.title,
  })),
]

export function dutRegistrations(managerUid: Record<string, string>): PlayerRegistration[] {
  return dutPlayers.map((player) => ({
    id: `reg-${player.id}-comp-league-2026`,
    playerId: player.id,
    teamId: player.teamId,
    competitionId: 'comp-league-2026',
    seasonId: 'season-2026',
    status: 'registered',
    registeredAt: '2026-02-01T00:00:00.000Z',
    registeredByUserId:
      player.teamId === 'team-men' ? managerUid.menManager ?? '' : managerUid.womenManager ?? '',
  }))
}
