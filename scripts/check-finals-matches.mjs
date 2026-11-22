/**
 * Diagnostic: print the two EMBA finals matches from live Firestore.
 */
import { loadSecureEnv } from './lib/secure-env.mjs'
import { getApps, initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { doc, getDoc, getFirestore } from 'firebase/firestore'

const env = loadSecureEnv()
const email = env.SEED_ADMIN_EMAIL || env.FIREBASE_ADMIN_EMAIL
const password = env.SEED_ADMIN_PASSWORD || env.FIREBASE_ADMIN_PASSWORD

if (!email || !password) { console.error('Missing creds'); process.exit(1) }

const app = getApps().length > 0 ? getApps()[0] : initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID ?? 'dut-wolves',
  appId: env.VITE_FIREBASE_APP_ID,
})
const auth = getAuth(app)
const db = getFirestore(app)

await signInWithEmailAndPassword(auth, email, password)
for (const id of ['emba-2026-finals-c1-1500', 'emba-2026-finals-c1-1630']) {
  const snap = await getDoc(doc(db, 'matches', id))
  console.log('\n===', id, '===')
  if (snap.exists()) {
    const d = snap.data()
    console.log('homeTeamId:', d.homeTeamId)
    console.log('awayTeamId:', d.awayTeamId)
    console.log('status:', d.status)
    console.log('finalsStatsEnabled:', d.finalsStatsEnabled)
    console.log('round:', d.round)
  } else {
    console.log('NOT FOUND')
  }
}
await signOut(auth)
process.exit(0)
