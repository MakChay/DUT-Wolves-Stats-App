/**
 * One-off maintenance: seed named player records for the Umlazi Blazers so the
 * EMBA Finals Live Match Centre can record player-level stats for them.
 *
 * Dry run unless --apply is passed. Credentials from encrypted env store.
 *
 * Usage:
 *   node scripts/seed-umlazi-blazers.mjs
 *   node scripts/seed-umlazi-blazers.mjs --apply
 */
import { loadSecureEnv } from './lib/secure-env.mjs'
import { getApps, initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { collection, doc, getFirestore, writeBatch } from 'firebase/firestore'

const env = loadSecureEnv()
const apply = process.argv.includes('--apply')
const email = env.SEED_ADMIN_EMAIL || env.FIREBASE_ADMIN_EMAIL
const password = env.SEED_ADMIN_PASSWORD || env.FIREBASE_ADMIN_PASSWORD

if (!email || !password) {
  console.error('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (inline or in the encrypted local env store).')
  process.exit(1)
}

const app = getApps().length > 0
  ? getApps()[0]
  : initializeApp({
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: env.VITE_FIREBASE_PROJECT_ID ?? 'dut-wolves',
      appId: env.VITE_FIREBASE_APP_ID,
    })
const auth = getAuth(app)
const db = getFirestore(app)

const roster = [
  { lastName: 'Nzama', firstName: 'K', jerseyNumber: 5 },
  { lastName: 'Ntshingila', firstName: 'K', jerseyNumber: 15 },
  { lastName: 'Cebisa', firstName: 'S', jerseyNumber: 32 },
  { lastName: 'Zulu', firstName: 'T', jerseyNumber: 40 },
  { lastName: 'Ginid', firstName: 'S', jerseyNumber: 7 },
  { lastName: 'Majola', firstName: 'D', jerseyNumber: 0 },
  { lastName: 'Dlalose', firstName: 'P', jerseyNumber: 13 },
  { lastName: 'Mthembu', firstName: '', jerseyNumber: 6 },
  { lastName: 'Mbuyisa', firstName: '', jerseyNumber: 10 },
  { lastName: 'Chiliza', firstName: 'c', jerseyNumber: 4 },
  { lastName: 'Ndlovu', firstName: 'L', jerseyNumber: 9 },
  { lastName: 'Dlamini', firstName: 'S', jerseyNumber: 3 },
]

const now = new Date().toISOString()
const players = roster.map((entry) => ({
  id: `team-umlazi-blazers-men-p${entry.jerseyNumber}`,
  teamId: 'team-umlazi-blazers-men',
  firstName: entry.firstName,
  lastName: entry.lastName,
  jerseyNumber: entry.jerseyNumber,
  position: null,
  secondaryPosition: null,
  availability: 'active',
  isActive: true,
  publicVisible: false,
  archivedAt: null,
  createdAt: now,
  updatedAt: now,
}))

console.log(`Umlazi Blazers roster: ${players.length} players`)
for (const p of players) console.log(`  #${p.jerseyNumber} ${p.firstName} ${p.lastName}`.trim())

if (!apply) {
  console.log('\nDry run. Re-run with --apply to write to Firestore.')
  process.exit(0)
}

await signInWithEmailAndPassword(auth, email, password)
const batch = writeBatch(db)
for (const player of players) {
  const { id, ...data } = player
  batch.set(doc(db, 'players', id), data, { merge: true })
}
await batch.commit()
console.log(`\nWrote ${players.length} players to players/ collection.`)
await signOut(auth)
process.exit(0)
