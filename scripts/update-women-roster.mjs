/**
 * One-off maintenance for the live Firebase project.
 *
 * Applies the verified USSA Wits women's jersey numbers and positions to both
 * `players/{id}` and the sanitised `publicPlayers/{id}` projection. Players not
 * listed by the managers keep their existing values untouched.
 *
 * The script is a dry run unless --apply is passed. Credentials are read from
 * SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD (inline or in the encrypted local env
 * store) and are never committed.
 *
 * Usage:
 *   node scripts/update-women-roster.mjs
 *   node scripts/update-women-roster.mjs --apply
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

const UPDATES = [
  { id: 'women-01', lastName: 'Hlongwa', jerseyNumber: 9, position: 'SG', secondaryPosition: 'PG' },
  { id: 'women-02', lastName: 'Mthethwa', jerseyNumber: 12, position: 'SF', secondaryPosition: 'SG' },
  { id: 'women-03', lastName: 'Mabutyana', jerseyNumber: 14, position: 'PF', secondaryPosition: 'C' },
  { id: 'women-04', lastName: 'Makhubela', jerseyNumber: 13, position: 'SF', secondaryPosition: 'PF' },
  { id: 'women-05', lastName: 'Masuku', jerseyNumber: 10, position: 'SF', secondaryPosition: 'PF' },
  { id: 'women-07', lastName: 'Mchunu', jerseyNumber: 6, position: 'SF', secondaryPosition: 'SG' },
  { id: 'women-08', lastName: 'Zulu', jerseyNumber: 3, position: 'SG', secondaryPosition: 'PG' },
  { id: 'women-12', lastName: 'Tsosi', jerseyNumber: 5, position: 'SF', secondaryPosition: 'SG' },
  { id: 'women-15', lastName: 'Makhafula', jerseyNumber: 11, position: 'PG', secondaryPosition: 'SG' },
  { id: 'women-18', lastName: 'Ngcobo', jerseyNumber: 7, position: 'SF', secondaryPosition: 'SG' },
  { id: 'women-19', lastName: 'Fapohunda', jerseyNumber: 15, position: 'C', secondaryPosition: 'PF' },
  { id: 'women-20', lastName: 'Makwara', jerseyNumber: 4, position: 'PG', secondaryPosition: 'SG' },
]

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

// Identity check: never write a jersey/position to the wrong player id.
for (const update of UPDATES) {
  const player = byId.get(update.id)
  if (!player) fail(`Missing player document ${update.id}.`)
  if (player.lastName !== update.lastName) {
    fail(`${update.id} has surname "${player.lastName}", expected "${update.lastName}".`)
  }
}

// Jersey uniqueness check across the whole women's squad, including players
// whose numbers were already assigned outside this script.
const targetNumbers = new Map(UPDATES.map((update) => [update.id, update.jerseyNumber]))
const finalNumbers = new Map()
for (const player of squad) {
  if (player.jerseyNumber === null || player.jerseyNumber === undefined) continue
  finalNumbers.set(player.id, targetNumbers.get(player.id) ?? player.jerseyNumber)
}
const ownersByNumber = new Map()
for (const [playerId, jersey] of finalNumbers) {
  const owners = ownersByNumber.get(jersey) ?? []
  owners.push(playerId)
  ownersByNumber.set(jersey, owners)
}
const duplicates = [...ownersByNumber.entries()].filter(([, owners]) => owners.length > 1)
if (duplicates.length > 0) {
  fail(`Duplicate women's jersey numbers: ${JSON.stringify(duplicates)}`)
}

console.log(`\nVerified ${UPDATES.length} player identities and jersey uniqueness.`)
for (const update of UPDATES) {
  const current = byId.get(update.id)
  console.log(
    `  ${update.id} ${current.firstName} ${update.lastName}: ` +
      `${current.jerseyNumber ?? '—'} ${current.position ?? '—'}/${current.secondaryPosition ?? '—'} -> ` +
      `${update.jerseyNumber} ${update.position}/${update.secondaryPosition}`,
  )
}

if (!apply) {
  console.log('\nDry run only. Re-run with --apply to write to Firestore.')
  await signOut(auth)
  process.exit(0)
}

const updatedAt = new Date().toISOString()
let batch = writeBatch(db)
for (const update of UPDATES) {
  const patch = {
    jerseyNumber: update.jerseyNumber,
    position: update.position,
    secondaryPosition: update.secondaryPosition,
    updatedAt,
  }
  batch.set(doc(db, 'players', update.id), patch, { merge: true })
  batch.set(doc(db, 'publicPlayers', update.id), patch, { merge: true })
}
await batch.commit()
console.log(`\nPatched ${UPDATES.length} players in players/ and publicPlayers/.`)

// Verify at least one projection read back correctly.
const check = await getDoc(doc(db, 'publicPlayers', 'women-20'))
console.log(`Verification women-20: #${check.data()?.jerseyNumber} ${check.data()?.position}/${check.data()?.secondaryPosition}`)

await signOut(auth)
process.exit(0)
