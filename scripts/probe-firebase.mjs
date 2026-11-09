// Temporary diagnostic: checks whether the configured Firestore project is
// reachable from this machine and whether the current rules allow reads/writes.
// It reads .env.local directly so Vite is not required.
import { readFileSync } from 'node:fs'
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

const env = {}
for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, '')
}

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
