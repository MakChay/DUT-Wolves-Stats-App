/**
 * One-off: set finalsStatsEnabled=true on the two EMBA finals matches in live Firestore.
 * Dry run unless --apply.
 */
import { loadSecureEnv } from './lib/secure-env.mjs'
import { getApps, initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { doc, getFirestore, updateDoc } from 'firebase/firestore'

const env = loadSecureEnv()
const apply = process.argv.includes('--apply')
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

const ids = ['emba-2026-finals-c1-1500', 'emba-2026-finals-c1-1630']
console.log(apply ? 'APPLY mode' : 'DRY RUN')
await signInWithEmailAndPassword(auth, email, password)
for (const id of ids) {
  console.log(`\n${id}:`)
  if (apply) {
    await updateDoc(doc(db, 'matches', id), { finalsStatsEnabled: true })
    console.log('  set finalsStatsEnabled = true')
  } else {
    console.log('  would set finalsStatsEnabled = true')
  }
}
await signOut(auth)
process.exit(0)
