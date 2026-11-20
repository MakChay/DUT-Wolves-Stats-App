/**
 * One-off maintenance for the live Firebase project.
 *
 * 1. Stops every live/paused match and returns it to a clean "scheduled"
 *    state (period 1, clock 10:00). Already-voided events are left untouched.
 * 2. Creates four internal practice fixtures under the DUT League so managers
 *    can rehearse score entry: two men's and two women's games.
 *
 * The script is a dry run unless --apply is passed. Credentials are read from
 * SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD (inline or in the encrypted local env
 * store) and are never committed.
 *
 * Usage:
 *   SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... node scripts/reset-live-and-add-practice.mjs
 *   ... --apply
 */
import { loadSecureEnv } from './lib/secure-env.mjs'
import { getApps, initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { collection, doc, getDoc, getDocs, getFirestore, writeBatch } from 'firebase/firestore'

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

const PRACTICE_MATCHES = [
  {
    id: 'practice-dut-league-2026-men-1',
    homeTeamId: 'team-men',
    awayTeamId: 'team-fossils-men',
    tipoff: '2026-11-24T16:00:00.000Z', // 18:00 SAST
    round: 'Practice 1',
    venue: 'DUT Indoor Courts · Practice session',
  },
  {
    id: 'practice-dut-league-2026-men-2',
    homeTeamId: 'team-men',
    awayTeamId: 'team-titans-men',
    tipoff: '2026-11-26T16:00:00.000Z', // 18:00 SAST
    round: 'Practice 2',
    venue: 'DUT Indoor Courts · Practice session',
  },
  {
    id: 'practice-dut-league-2026-women-1',
    homeTeamId: 'team-women',
    awayTeamId: 'team-guardians-women',
    tipoff: '2026-11-24T17:00:00.000Z', // 19:00 SAST
    round: 'Practice 1',
    venue: 'DUT Indoor Courts · Practice session',
  },
  {
    id: 'practice-dut-league-2026-women-2',
    homeTeamId: 'team-women',
    awayTeamId: 'team-mut-women',
    tipoff: '2026-11-26T17:00:00.000Z', // 19:00 SAST
    round: 'Practice 2',
    venue: 'DUT Indoor Courts · Practice session',
  },
]

function practiceDoc(fixture) {
  return {
    seasonId: 'season-2026',
    competitionId: 'comp-league-2026',
    homeTeamId: fixture.homeTeamId,
    awayTeamId: fixture.awayTeamId,
    tipoff: fixture.tipoff,
    round: fixture.round,
    venue: fixture.venue,
    status: 'scheduled',
    period: 1,
    clockSeconds: 600,
    publicVisible: false,
    reportRequired: false,
    adminComplete: false,
  }
}

console.log(`${apply ? 'APPLYING' : 'DRY RUN'}: project ${env.VITE_FIREBASE_PROJECT_ID ?? 'dut-wolves'}`)
await signInWithEmailAndPassword(auth, email, password)
console.log(`Signed in as ${email}`)

// 1. Kill live/paused games.
const matchesSnap = await getDocs(collection(db, 'matches'))
const stale = matchesSnap.docs
  .map((row) => ({ id: row.id, ...row.data() }))
  .filter((match) => match.status === 'live' || match.status === 'paused')

console.log(`\nLive/paused matches to reset: ${stale.length}`)
for (const match of stale) {
  console.log(`  ${match.id} (${match.competitionId}, ${match.homeTeamId} vs ${match.awayTeamId})`)
  console.log('    -> status=scheduled, period=1, clockSeconds=600')
}

// 2. Practice fixtures.
console.log(`\nDUT League practice fixtures: ${PRACTICE_MATCHES.length}`)
for (const fixture of PRACTICE_MATCHES) {
  const snapshot = await getDoc(doc(db, 'matches', fixture.id))
  console.log(`  ${fixture.id} (${snapshot.exists() ? 'exists, will be updated' : 'new'})`)
  console.log(`    ${fixture.homeTeamId} vs ${fixture.awayTeamId} · ${fixture.tipoff} · ${fixture.round}`)
}

if (!apply) {
  console.log('\nDry run only. Re-run with --apply to write to Firestore.')
  await signOut(auth)
  process.exit(0)
}

let batch = writeBatch(db)
let count = 0
for (const match of stale) {
  batch.set(doc(db, 'matches', match.id), {
    status: 'scheduled',
    period: 1,
    clockSeconds: 600,
  }, { merge: true })
  count += 1
}
if (count > 0) await batch.commit()
console.log(`\nReset ${count} live/paused match(es).`)

batch = writeBatch(db)
for (const fixture of PRACTICE_MATCHES) {
  batch.set(doc(db, 'matches', fixture.id), practiceDoc(fixture), { merge: true })
}
await batch.commit()
console.log(`Wrote ${PRACTICE_MATCHES.length} practice fixtures.`)

await signOut(auth)
process.exit(0)
