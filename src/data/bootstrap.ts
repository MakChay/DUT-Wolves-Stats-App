import type {
  Competition,
  Match,
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
  {
    id: 'comp-emba-premier-finals-2026',
    name: 'Premier League 2026 Finals',
    shortName: 'EMBA Finals',
    seasonId: 'season-2026',
    type: 'tournament',
    startDate: '2026-11-22T07:00:00.000Z',
    endDate: '2026-11-22T15:30:00.000Z',
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
  { id: 'team-mut-men', name: 'MUT Men', shortName: 'MUT', gender: 'men', primaryColor: '#B5935A' },
  { id: 'team-unizulu-men', name: 'Unizulu Men', shortName: 'Unizulu', gender: 'men', primaryColor: '#B5935A' },
  { id: 'team-titans-men', name: 'Titans', shortName: 'Titans', gender: 'men', primaryColor: '#B5935A' },
  { id: 'team-umlazi-west-men', name: 'Umlazi West', shortName: 'Umlazi West', gender: 'men', primaryColor: '#B5935A' },
  { id: 'team-fossils-men', name: 'Fossils', shortName: 'Fossils', gender: 'men', primaryColor: '#B5935A' },
  { id: 'team-umlazi-blazers-men', name: 'Umlazi Blazers', shortName: 'Umlazi Blazers', gender: 'men', primaryColor: '#B5935A' },
  { id: 'team-the-clan-men', name: 'The Clan', shortName: 'The Clan', gender: 'men', primaryColor: '#B5935A' },
  { id: 'team-guardians-women', name: 'Guardians', shortName: 'Guardians', gender: 'women', primaryColor: '#B5935A' },
  { id: 'team-mut-women', name: 'MUT [F]', shortName: 'MUT W', gender: 'women', primaryColor: '#B5935A' },
  { id: 'team-ukzn-women-emba', name: 'UKZN [F]', shortName: 'UKZN W', gender: 'women', primaryColor: '#2563EB' },
  { id: 'team-winner-1', name: 'Winner 1', shortName: 'Winner 1', gender: 'men', primaryColor: '#B5935A' },
  { id: 'team-winner-2', name: 'Winner 2', shortName: 'Winner 2', gender: 'men', primaryColor: '#B5935A' },
  { id: 'team-winner-3', name: 'Winner 3', shortName: 'Winner 3', gender: 'men', primaryColor: '#B5935A' },
  { id: 'team-winner-4', name: 'Winner 4', shortName: 'Winner 4', gender: 'men', primaryColor: '#B5935A' },
  { id: 'team-winner-5', name: 'Winner 5', shortName: 'Winner 5', gender: 'men', primaryColor: '#B5935A' },
  { id: 'team-winner-6', name: 'Winner 6', shortName: 'Winner 6', gender: 'men', primaryColor: '#B5935A' },
  { id: 'team-winner-7', name: 'Winner 7', shortName: 'Winner 7', gender: 'men', primaryColor: '#B5935A' },
  { id: 'team-winner-8', name: 'Winner 8', shortName: 'Winner 8', gender: 'men', primaryColor: '#B5935A' },
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

export const embaFinalsMatches: Match[] = [
  ['emba-2026-finals-c1-0900', 'team-men', 'team-mut-men', '2026-11-22T07:00:00.000Z', 'Court 1', '09:00'],
  ['emba-2026-finals-c2-0900', 'team-umlazi-west-men', 'team-fossils-men', '2026-11-22T07:00:00.000Z', 'Court 2', '09:00'],
  ['emba-2026-finals-c1-1030', 'team-unizulu-men', 'team-titans-men', '2026-11-22T08:30:00.000Z', 'Court 1', '10:30'],
  ['emba-2026-finals-c2-1030', 'team-umlazi-blazers-men', 'team-the-clan-men', '2026-11-22T08:30:00.000Z', 'Court 2', '10:30'],
  ['emba-2026-finals-c1-1200', 'team-guardians-women', 'team-mut-women', '2026-11-22T10:00:00.000Z', 'Court 1', '12:00'],
  ['emba-2026-finals-c2-1200', 'team-women', 'team-ukzn-women-emba', '2026-11-22T10:00:00.000Z', 'Court 2', '12:00'],
  ['emba-2026-finals-c1-1330', 'team-winner-1', 'team-winner-2', '2026-11-22T11:30:00.000Z', 'Court 1', '13:30'],
  ['emba-2026-finals-c2-1330', 'team-winner-3', 'team-winner-4', '2026-11-22T11:30:00.000Z', 'Court 2', '13:30'],
  ['emba-2026-finals-c1-1500', 'team-winner-5', 'team-winner-6', '2026-11-22T13:00:00.000Z', 'Court 1', '15:00'],
  ['emba-2026-finals-c1-1630', 'team-winner-7', 'team-winner-8', '2026-11-22T14:30:00.000Z', 'Court 1', '16:30'],
].map(([id, homeTeamId, awayTeamId, tipoff, court, time]): Match => ({
  id,
  competitionId: 'comp-emba-premier-finals-2026',
  seasonId: 'season-2026',
  homeTeamId,
  awayTeamId,
  venue: `Umlazi Indoor Courts · ${court}`,
  tipoff,
  status: 'scheduled',
  period: 1,
  clockSeconds: 600,
  publicVisible: true,
  round: `Premier League 2026 Finals · ${time}`,
  reportRequired: true,
  adminComplete: false,
}))

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
