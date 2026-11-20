/**
 * Seeds Firestore and Firebase Auth with the supplied DUT Wolves data.
 *
 * Usage:
 *   npx tsx scripts/seed-firebase.ts
 *
 * Reads the encrypted local env store. Admin and staff credentials come from
 * SEED_* variables so no password is ever committed to the repository.
 *
 *   SEED_ADMIN_EMAIL           admin login email
 *   SEED_ADMIN_PASSWORD        admin login password
 *   SEED_STAFF_TEMP_PASSWORD   one-time password for invited staff accounts
 *
 * Only supplied data is written: squads, staff, teams, competition shells and
 * registrations and supplied event fixtures. No scores, statistics or media are invented.
 */
import { getApp, getApps, initializeApp } from 'firebase/app'
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { doc, getFirestore, writeBatch } from 'firebase/firestore'
import {
  bootstrapCompetitions,
  bootstrapSeasons,
  embaFinalsMatches,
  dutPlayers,
  dutRegistrations,
  dutTeams,
  opponentPlayers,
  opponentTeamRecords,
  staffAccounts,
} from '../src/data/bootstrap'
import type { Player, PublicPlayer, User } from '../src/types/domain'
import { loadSecureEnv } from './lib/secure-env.mjs'

const env = loadSecureEnv()

const required = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
  'SEED_ADMIN_EMAIL',
  'SEED_ADMIN_PASSWORD',
  'SEED_STAFF_TEMP_PASSWORD',
]
const missing = required.filter((key) => !env[key])
if (missing.length > 0) {
  console.error(`Missing environment variables: ${missing.join(', ')}`)
  process.exit(1)
}

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
}

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
// Account creation happens on a secondary app so the admin session used for
// Firestore writes is never replaced by a newly created user.
const secondary = initializeApp(firebaseConfig, 'dws-seed-secondary')
const secondaryAuth = getAuth(secondary)
const auth = getAuth(app)
const db = getFirestore(app)
const staffTempPassword = env.SEED_STAFF_TEMP_PASSWORD

async function ensureAccount(email: string, password: string): Promise<string> {
  try {
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password)
    await signOut(secondaryAuth)
    return credential.user.uid
  } catch (error) {
    const code = (error as { code?: string }).code ?? ''
    if (code === 'auth/email-already-in-use') {
      const credential = await signInWithEmailAndPassword(secondaryAuth, email, password)
      await signOut(secondaryAuth)
      return credential.user.uid
    }
    if (code === 'auth/operation-not-allowed' || code === 'auth/admin-restricted-operation') {
      throw new Error(
        'Email/password sign-in is not enabled. In the Firebase console go to ' +
          'Authentication → Sign-in method and enable Email/Password, then rerun this script.',
      )
    }
    throw error
  }
}

function publicProjection(player: Player): PublicPlayer {
  return {
    id: player.id,
    teamId: player.teamId,
    firstName: player.firstName,
    lastName: player.lastName,
    jerseyNumber: player.jerseyNumber,
    position: player.position,
    secondaryPosition: player.secondaryPosition ?? null,
    availability: player.availability === 'injured' ? 'unavailable' : player.availability,
    isActive: player.isActive,
    publicVisible: player.publicVisible,
  }
}

const now = new Date().toISOString()
console.log(`Seeding project ${firebaseConfig.projectId}…`)

const adminUid = await ensureAccount(env.SEED_ADMIN_EMAIL!, env.SEED_ADMIN_PASSWORD!)
await signInWithEmailAndPassword(auth, env.SEED_ADMIN_EMAIL!, env.SEED_ADMIN_PASSWORD!)
console.log(`Admin account ready (uid ${adminUid}).`)

const staffUid: Record<string, string> = { admin: adminUid }
const userDocs: User[] = [
  {
    id: adminUid,
    authUid: adminUid,
    email: env.SEED_ADMIN_EMAIL!,
    displayName: 'System Administrator',
    role: 'admin',
    teamIds: ['team-men', 'team-women'],
    title: 'System Administrator',
    mustChangePassword: false,
    createdAt: now,
  },
]

for (const staff of staffAccounts) {
  const uid = await ensureAccount(staff.email, staffTempPassword)
  staffUid[staff.key] = uid
  userDocs.push({
    id: uid,
    authUid: uid,
    email: staff.email,
    displayName: staff.displayName,
    role: staff.role,
    teamIds: staff.teamIds,
    title: staff.title,
    mustChangePassword: true,
    invitedAt: now,
    invitedByUserId: adminUid,
    createdAt: now,
  })
  console.log(`  ${staff.role.padEnd(13)} ${staff.displayName}`)
}

type Write = { collection: string; id: string; data: object }
const writes: Write[] = []
const add = (collection: string, value: { id: string } & object) => {
  const { id, ...data } = value
  writes.push({ collection, id, data })
}

for (const user of userDocs) add('users', user)
for (const season of bootstrapSeasons) add('seasons', season)
for (const competition of bootstrapCompetitions) add('competitions', competition)
for (const team of [...dutTeams(staffUid), ...opponentTeamRecords()]) add('teams', team)
for (const player of [...dutPlayers, ...opponentPlayers]) add('players', player)
for (const player of dutPlayers) add('publicPlayers', publicProjection(player))
for (const registration of dutRegistrations(staffUid)) add('registrations', registration)
for (const match of embaFinalsMatches) add('matches', match)

// Firestore batches are limited to 500 writes.
for (let index = 0; index < writes.length; index += 400) {
  const batch = writeBatch(db)
  for (const entry of writes.slice(index, index + 400)) {
    batch.set(doc(db, entry.collection, entry.id), entry.data)
  }
  await batch.commit()
  console.log(`Committed ${Math.min(index + 400, writes.length)} / ${writes.length} documents`)
}

console.log(
  `Done: ${userDocs.length} users, ${dutPlayers.length} DUT players, ` +
    `${opponentPlayers.length} number-only opponent registrations, ` +
    `${bootstrapCompetitions.length} competitions.`,
)
console.log(`Seeded ${embaFinalsMatches.length} EMBA finals fixtures without scores or statistics.`)
console.log('Staff accounts must change their temporary password on first sign-in.')
await signOut(auth)
process.exit(0)
