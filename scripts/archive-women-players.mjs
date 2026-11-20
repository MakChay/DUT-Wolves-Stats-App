/**
 * One-off maintenance for the live Firebase project.
 *
 * The 8 women who were not selected for the 2026 squad are archived so they no
 * longer appear on public "teams" screens. Players stay in Firestore for
 * history; only their active/public flags change. Both `players/{id}` and the
 * sanitised `publicPlayers/{id}` projection are patched with identity checks.
 *
 * The script is a dry run unless --apply is passed. Credentials are read from
 * SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD (inline or in the encrypted local env
 * store) and are never committed or printed.
 *
 * Usage:
 *   node scripts/archive-women-players.mjs
 *   node scripts/archive-women-players.mjs --apply
 */
import { loadSecureEnv } from './lib/secure-env.mjs'
import { getApps, initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  where,
  writeBatch,
} from 'firebase/firestore'

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

/** Unselected women. lastName is an identity guard, never written. */
const ARCHIVE = [
  { id: 'women-06', lastName: 'Ntuli' },
  { id: 'women-09', lastName: 'Nombiba' },
  { id: 'women-10', lastName: 'Ntuli' },
  { id: 'women-11', lastName: 'Ntuli' },
  { id: 'women-13', lastName: 'Shayinkomo' },
  { id: 'women-14', lastName: 'Sithole' },
  { id: 'women-16', lastName: 'Masali' },
  { id: 'women-17', lastName: 'Dzanibe' },
]

const ARCHIVED_AT = '2026-11-21T00:00:00.000Z'

function fail(message) {
  console.error(`\nERROR: ${message}`)
  process.exit(1)
}

console.log(`${apply ? 'APPLYING' : 'DRY RUN'}: project ${env.VITE_FIREBASE_PROJECT_ID ?? 'dut-wolves'}`)
await signInWithEmailAndPassword(auth, email, password)
console.log(`Signed in as ${email}`)

const squadSnap = await getDocs(query(collection(db, 'players'), where('teamId', '==', 'team-women')))
const squad = squadSnap.docs.map((row) => ({ id: row.id, ...row.data() }))
const byId = new Map(squad.map((player) => [player.id, player]))

// Identity check: never archive a player whose id does not match the expected
// surname. Several Ntulis share a surname, so also confirm first names.
const EXPECTED_FIRST_NAME = {
  'women-06': 'Nokuphiwe',
  'women-09': 'Limnandi',
  'women-10': 'Sithembele',
  'women-11': 'Amahle',
  'women-13': 'Benize',
  'women-14': 'Samkelisiwe',
  'women-16': 'Yondisikelela',
  'women-17': 'Akhona',
}
for (const entry of ARCHIVE) {
  const player = byId.get(entry.id)
  if (!player) fail(`Missing player document ${entry.id}.`)
  if (player.lastName !== entry.lastName || player.firstName !== EXPECTED_FIRST_NAME[entry.id]) {
    fail(
      `${entry.id} is "${player.firstName} ${player.lastName}", expected ` +
        `"${EXPECTED_FIRST_NAME[entry.id]} ${entry.lastName}".`,
    )
  }
}

// Guard against accidentally archiving the whole squad: only the 8 listed ids
// may be touched, and none of them may be a selected player.
const selectedIds = new Set([
  'women-01', 'women-02', 'women-03', 'women-04', 'women-05', 'women-07',
  'women-08', 'women-12', 'women-15', 'women-18', 'women-19', 'women-20',
])
for (const entry of ARCHIVE) {
  if (selectedIds.has(entry.id)) fail(`Refusing to archive selected player ${entry.id}.`)
}

console.log(`\nVerified ${ARCHIVE.length} unselected women by id and name.`)
for (const entry of ARCHIVE) {
  const current = byId.get(entry.id)
  console.log(`  ${entry.id} ${current.firstName} ${current.lastName} -> archived`)
}

if (!apply) {
  console.log('\nDry run only. Re-run with --apply to write to Firestore.')
  await signOut(auth)
  process.exit(0)
}

const updatedAt = new Date().toISOString()
const archivePatch = {
  archivedAt: ARCHIVED_AT,
  isActive: false,
  publicVisible: false,
  availability: 'inactive',
  updatedAt,
}
let batch = writeBatch(db)
for (const entry of ARCHIVE) {
  batch.set(doc(db, 'players', entry.id), archivePatch, { merge: true })
  batch.set(doc(db, 'publicPlayers', entry.id), archivePatch, { merge: true })
}
await batch.commit()
console.log(`\nArchived ${ARCHIVE.length} players in players/ and publicPlayers/.`)

// Verify both projections read back correctly.
for (const id of ['women-06', 'women-17']) {
  const internal = await getDoc(doc(db, 'players', id))
  const published = await getDoc(doc(db, 'publicPlayers', id))
  console.log(
    `Verification ${id}: players { isActive=${internal.data()?.isActive}, archivedAt=${internal.data()?.archivedAt} } ` +
      `publicPlayers { publicVisible=${published.data()?.publicVisible}, availability=${published.data()?.availability} }`,
  )
}

await signOut(auth)
process.exit(0)
