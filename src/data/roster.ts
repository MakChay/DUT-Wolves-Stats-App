/**
 * Official DUT Wolves 2026 squad list.
 *
 * Names, student numbers and campuses are exactly as supplied by the team
 * managers. Jersey numbers and positions are only set once a team manager has
 * assigned and verified them; unassigned players keep them null.
 *
 * `studentNumber` and `campus` are private internal identifiers. They are never
 * included in public player projections, and residence data is not stored at
 * all.
 */
import type { PlayerPosition } from '@/types/domain'

export interface RosterPlayerSeed {
  /** Stable, non-identifying identifier. Never derived from a student number. */
  id: string
  teamId: 'team-men' | 'team-women'
  firstName: string
  lastName: string
  studentNumber: string
  campus: 'Durban' | 'Midlands'
  jerseyNumber?: number
  position?: PlayerPosition
  secondaryPosition?: PlayerPosition
  /** Selected squad members are active; unselected players are archived. */
  archived?: boolean
}

/** Timestamp used by seed data for players archived because they were not selected. */
export const ARCHIVED_PLAYER_TIMESTAMP = '2026-11-21T00:00:00.000Z'

export const menRoster: RosterPlayerSeed[] = [
  { id: 'men-01', teamId: 'team-men', firstName: 'Samkelo', lastName: 'Mthembu', studentNumber: '22307067', campus: 'Durban' },
  { id: 'men-02', teamId: 'team-men', firstName: 'Msizi', lastName: 'Dlamini', studentNumber: '22459337', campus: 'Durban' },
  { id: 'men-03', teamId: 'team-men', firstName: 'Banele', lastName: 'Mazubane', studentNumber: '26082125', campus: 'Durban' },
  { id: 'men-04', teamId: 'team-men', firstName: 'Simamkele', lastName: 'Sijendu', studentNumber: '26123885', campus: 'Durban' },
  { id: 'men-05', teamId: 'team-men', firstName: 'Zuza', lastName: 'Radebe', studentNumber: '22450391', campus: 'Durban' },
  { id: 'men-06', teamId: 'team-men', firstName: 'Murphy', lastName: 'Wood', studentNumber: '26046447', campus: 'Durban' },
  { id: 'men-07', teamId: 'team-men', firstName: 'Favour', lastName: 'Okoli', studentNumber: '25011839', campus: 'Durban' },
  { id: 'men-08', teamId: 'team-men', firstName: 'Lunga', lastName: 'Ngwenya', studentNumber: '22256364', campus: 'Durban' },
  { id: 'men-09', teamId: 'team-men', firstName: 'Wisdom', lastName: 'Msomi', studentNumber: '22151574', campus: 'Durban' },
  { id: 'men-10', teamId: 'team-men', firstName: 'Siyathuthuka', lastName: 'Mabaso', studentNumber: '21920113', campus: 'Durban' },
  { id: 'men-11', teamId: 'team-men', firstName: 'Fortunate', lastName: 'Fapohunda', studentNumber: '26116741', campus: 'Durban' },
  { id: 'men-12', teamId: 'team-men', firstName: 'Sbonga', lastName: 'Diko', studentNumber: '25110643', campus: 'Durban' },
  { id: 'men-13', teamId: 'team-men', firstName: 'Lwazi', lastName: 'Hadebe', studentNumber: '25123801', campus: 'Durban' },
  { id: 'men-14', teamId: 'team-men', firstName: 'Phumlani', lastName: 'Mkhize', studentNumber: '22176048', campus: 'Durban' },
  { id: 'men-15', teamId: 'team-men', firstName: 'Luvuyo', lastName: 'Majola', studentNumber: '25107986', campus: 'Durban' },
  { id: 'men-16', teamId: 'team-men', firstName: 'Ndalonhle', lastName: 'Mlotha', studentNumber: '22494154', campus: 'Durban' },
]

export const womenRoster: RosterPlayerSeed[] = [
  { id: 'women-01', teamId: 'team-women', firstName: 'Fezile', lastName: 'Hlongwa', studentNumber: '22300354', campus: 'Durban', jerseyNumber: 9, position: 'SG', secondaryPosition: 'PG' },
  { id: 'women-02', teamId: 'team-women', firstName: 'Ayajabula Isithandile', lastName: 'Mthethwa', studentNumber: '22383640', campus: 'Durban', jerseyNumber: 12, position: 'SF', secondaryPosition: 'SG' },
  { id: 'women-03', teamId: 'team-women', firstName: 'Siphokazi Rose', lastName: 'Mabutyana', studentNumber: '21930586', campus: 'Durban', jerseyNumber: 14, position: 'PF', secondaryPosition: 'C' },
  { id: 'women-04', teamId: 'team-women', firstName: 'Nkanyezi Eyethu', lastName: 'Makhubela', studentNumber: '22050815', campus: 'Durban', jerseyNumber: 13, position: 'SF', secondaryPosition: 'PF' },
  { id: 'women-05', teamId: 'team-women', firstName: 'Abongile', lastName: 'Masuku', studentNumber: '22414613', campus: 'Durban', jerseyNumber: 10, position: 'SF', secondaryPosition: 'PF' },
  { id: 'women-06', teamId: 'team-women', firstName: 'Nokuphiwe', lastName: 'Ntuli', studentNumber: '25046620', campus: 'Durban', archived: true },
  { id: 'women-07', teamId: 'team-women', firstName: 'Luthando', lastName: 'Mchunu', studentNumber: '25001770', campus: 'Midlands', jerseyNumber: 6, position: 'SF', secondaryPosition: 'SG' },
  { id: 'women-08', teamId: 'team-women', firstName: 'Sisanda', lastName: 'Zulu', studentNumber: '25040443', campus: 'Midlands', jerseyNumber: 3, position: 'SG', secondaryPosition: 'PG' },
  { id: 'women-09', teamId: 'team-women', firstName: 'Limnandi', lastName: 'Nombiba', studentNumber: '22485765', campus: 'Midlands', archived: true },
  { id: 'women-10', teamId: 'team-women', firstName: 'Sithembele', lastName: 'Ntuli', studentNumber: '22358769', campus: 'Midlands', archived: true },
  { id: 'women-11', teamId: 'team-women', firstName: 'Amahle', lastName: 'Ntuli', studentNumber: '22413897', campus: 'Midlands', archived: true },
  { id: 'women-12', teamId: 'team-women', firstName: 'Matshediso', lastName: 'Tsosi', studentNumber: '22230357', campus: 'Durban', jerseyNumber: 5, position: 'SF', secondaryPosition: 'SG' },
  { id: 'women-13', teamId: 'team-women', firstName: 'Benize', lastName: 'Shayinkomo', studentNumber: '22317761', campus: 'Durban', archived: true },
  { id: 'women-14', teamId: 'team-women', firstName: 'Samkelisiwe', lastName: 'Sithole', studentNumber: '22379967', campus: 'Midlands', archived: true },
  { id: 'women-15', teamId: 'team-women', firstName: 'Ziyanda Amahle', lastName: 'Makhafula', studentNumber: '22383920', campus: 'Durban', jerseyNumber: 11, position: 'PG', secondaryPosition: 'SG' },
  { id: 'women-16', teamId: 'team-women', firstName: 'Yondisikelela', lastName: 'Masali', studentNumber: '25050254', campus: 'Midlands', archived: true },
  { id: 'women-17', teamId: 'team-women', firstName: 'Akhona', lastName: 'Dzanibe', studentNumber: '22459326', campus: 'Midlands', archived: true },
  { id: 'women-18', teamId: 'team-women', firstName: 'Sinethemba Mbali', lastName: 'Ngcobo', studentNumber: '22433772', campus: 'Durban', jerseyNumber: 7, position: 'SF', secondaryPosition: 'SG' },
  { id: 'women-19', teamId: 'team-women', firstName: 'Prosper', lastName: 'Fapohunda', studentNumber: '25079959', campus: 'Durban', jerseyNumber: 15, position: 'C', secondaryPosition: 'PF' },
  { id: 'women-20', teamId: 'team-women', firstName: 'Charlene Chay', lastName: 'Makwara', studentNumber: '22321651', campus: 'Durban', jerseyNumber: 4, position: 'PG', secondaryPosition: 'SG' },
]

export const rosterPlayers: RosterPlayerSeed[] = [...womenRoster, ...menRoster]

export const OFFICIAL_STAFF = {
  menManager: { id: 'user-manager-men', name: 'Yondisikelela Masali', email: 'yondisikelela.masali@dutwolves.local' },
  womenManager: { id: 'user-manager-women', name: 'Sihle Gumede', email: 'sihle.gumede@dutwolves.local' },
  menCoaches: [
    { id: 'user-coach-men-1', name: 'Coach Mtu', email: 'mtu@dutwolves.local', title: 'Head Coach' },
    { id: 'user-coach-men-2', name: 'Coach Styx', email: 'styx@dutwolves.local', title: 'Assistant Coach' },
  ],
  womenCoaches: [
    { id: 'user-coach-women-1', name: 'Coach Zothani', email: 'zothani@dutwolves.local', title: 'Head Coach' },
    { id: 'user-coach-women-2', name: 'Coach Wax', email: 'wax@dutwolves.local', title: 'Assistant Coach' },
  ],
} as const
