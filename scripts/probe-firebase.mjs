// Temporary diagnostic: checks whether the configured Firestore project is
// reachable from this machine and whether the current rules allow reads/writes.
// It uses the shared encrypted env loader so Vite is not required.
import { initializeApp } from 'firebase/app'
import {
  collection,
  doc,
  getDocFromServer,
  getDocsFromServer,
  getFirestore,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { loadSecureEnv } from './lib/secure-env.mjs'

const env = loadSecureEnv()

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
})
const db = getFirestore(app)

const report = (label, error) => {
  const code = error?.code ?? ''
  const message = error?.message ?? String(error)
  console.log(`${label}: FAIL ${code} ${message}`)
}

try {
  const snap = await getDocsFromServer(collection(db, 'teams'))
  console.log(`teams read: OK (${snap.size} documents)`)
} catch (error) {
  report('teams read', error)
}

try {
  await getDocFromServer(doc(db, 'teams', 'team-men'))
  console.log('team-men read: OK')
} catch (error) {
  report('team-men read', error)
}

try {
  await setDoc(doc(db, '_connection', 'probe'), { at: serverTimestamp(), source: 'local-diagnostic' })
  console.log('probe write: OK (rules allow unauthenticated writes)')
} catch (error) {
  report('probe write', error)
}
