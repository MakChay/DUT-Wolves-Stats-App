/**
 * One-off cleanup for the seeded EMBA Finals documents in Firestore.
 *
 * The original seed embedded the tip-off time inside `round` and marked every
 * fixture as requiring a report. The UI now derives the time from `tipoff`, so
 * this script brings the stored documents in line with the source data.
 *
 * Usage:
 *   SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... npx tsx scripts/fix-emba-schedule.ts
 *
 * Credentials may also be placed in the encrypted local env store (never
 * committed). Only the documents listed below are touched; no scores or statuses
 * are modified.
 */
import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { doc, getDoc, getFirestore, updateDoc } from 'firebase/firestore'
import { loadSecureEnv } from './lib/secure-env.mjs'

const env = loadSecureEnv()
const email = process.env.SEED_ADMIN_EMAIL ?? env.SEED_ADMIN_EMAIL
const password = process.env.SEED_ADMIN_PASSWORD ?? env.SEED_ADMIN_PASSWORD
if (!email || !password) {
  console.error('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (inline or in the encrypted local env store).')
  process.exit(1)
}

const app = getApps().length > 0 ? getApp() : initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY ?? process.env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID ?? process.env.VITE_FIREBASE_PROJECT_ID ?? 'dut-wolves',
  appId: env.VITE_FIREBASE_APP_ID ?? process.env.VITE_FIREBASE_APP_ID,
})

const auth = getAuth(app)
const db = getFirestore(app)

const DUT_MATCH_IDS = new Set([
  'emba-2026-finals-c1-0900',
  'emba-2026-finals-c2-1200',
])

const embaMatchIds = [
  'emba-2026-finals-c1-0900',
  'emba-2026-finals-c2-0900',
  'emba-2026-finals-c1-1030',
  'emba-2026-finals-c2-1030',
  'emba-2026-finals-c1-1200',
  'emba-2026-finals-c2-1200',
  'emba-2026-finals-c1-1330',
  'emba-2026-finals-c2-1330',
  'emba-2026-finals-c1-1500',
  'emba-2026-finals-c1-1630',
]

const winnerTeams: { id: string; name: string; shortName: string; gender: 'men' | 'women' }[] = [
  { id: 'team-winner-1', name: 'Winner of Game 1', shortName: 'Winner G1', gender: 'men' },
  { id: 'team-winner-2', name: 'Winner of Game 2', shortName: 'Winner G2', gender: 'men' },
  { id: 'team-winner-3', name: 'Winner of Game 3', shortName: 'Winner G3', gender: 'men' },
  { id: 'team-winner-4', name: 'Winner of Game 4', shortName: 'Winner G4', gender: 'men' },
  { id: 'team-winner-5', name: 'Winner of Game 5', shortName: 'Winner G5', gender: 'women' },
  { id: 'team-winner-6', name: 'Winner of Game 6', shortName: 'Winner G6', gender: 'women' },
  { id: 'team-winner-7', name: 'Winner of Game 7', shortName: 'Winner G7', gender: 'men' },
  { id: 'team-winner-8', name: 'Winner of Game 8', shortName: 'Winner G8', gender: 'men' },
]

async function patch(collection: string, id: string, values: Record<string, unknown>): Promise<void> {
  const ref = doc(db, collection, id)
  const snapshot = await getDoc(ref)
  if (!snapshot.exists()) {
    console.log(`skip  ${collection}/${id} (missing)`)
    return
  }
  const current = snapshot.data()
  const changed = Object.entries(values).filter(([key, value]) => current[key] !== value)
  if (changed.length === 0) {
    console.log(`ok    ${collection}/${id} (already current)`)
    return
  }
  await updateDoc(ref, values)
  console.log(`fixed ${collection}/${id} ${changed.map(([key]) => key).join(', ')}`)
}

async function main(): Promise<void> {
  await signInWithEmailAndPassword(auth, email!, password!)
  console.log('Signed in as admin. Updating EMBA schedule documents...')

  for (const id of embaMatchIds) {
    await patch('matches', id, {
      round: 'Premier League 2026 Finals',
      reportRequired: DUT_MATCH_IDS.has(id),
    })
  }

  for (const team of winnerTeams) {
    await patch('teams', team.id, {
      name: team.name,
      shortName: team.shortName,
      gender: team.gender,
    })
  }

  await signOut(auth)
  console.log('Done. Reload the public site to see the updated schedule.')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
