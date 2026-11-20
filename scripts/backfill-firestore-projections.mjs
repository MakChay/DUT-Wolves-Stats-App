import { loadSecureEnv } from './lib/secure-env.mjs'
import { initializeApp, deleteApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  writeBatch,
} from 'firebase/firestore'

const env = loadSecureEnv()
const required = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
  'FIREBASE_ADMIN_EMAIL',
  'FIREBASE_ADMIN_PASSWORD',
]
const missing = required.filter((key) => !env[key])
if (missing.length) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
}

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
})
const auth = getAuth(app)
const database = getFirestore(app)

const eventFields = [
  'clientEventId',
  'matchId',
  'teamId',
  'playerId',
  'type',
  'period',
  'clockSeconds',
  'createdAt',
  'points',
  'voided',
  'voidedAt',
  'correctionOf',
]

async function writeChunks(records, collectionName) {
  for (let offset = 0; offset < records.length; offset += 400) {
    const batch = writeBatch(database)
    records.slice(offset, offset + 400).forEach(({ id, data }) => {
      batch.set(doc(database, collectionName, id), data)
    })
    await batch.commit()
  }
}

try {
  const credentials = await signInWithEmailAndPassword(
    auth,
    env.FIREBASE_ADMIN_EMAIL,
    env.FIREBASE_ADMIN_PASSWORD,
  )
  const profileSnapshot = await getDoc(doc(database, 'users', credentials.user.uid))
  if (!profileSnapshot.exists() || profileSnapshot.data().role !== 'admin') {
    throw new Error('The signed-in account must have an admin profile in Firestore.')
  }

  const [events, reports] = await Promise.all([
    getDocs(collection(database, 'matchEvents')),
    getDocs(collection(database, 'reports')),
  ])
  const publicEvents = events.docs.map((snapshot) => ({
    id: snapshot.id,
    data: Object.fromEntries(
      eventFields
        .filter((field) => snapshot.data()[field] !== undefined)
        .map((field) => [field, snapshot.data()[field]]),
    ),
  }))
  const reportStatuses = reports.docs.map((snapshot) => {
    const report = snapshot.data()
    return {
      id: snapshot.id,
      data: {
        matchId: report.matchId,
        teamId: report.teamId,
        status: report.status,
        submittedAt: report.submittedAt,
      },
    }
  })

  await writeChunks(publicEvents, 'publicMatchEvents')
  await writeChunks(reportStatuses, 'reportStatuses')
  console.log(
    `Backfilled ${publicEvents.length} public event projections and ${reportStatuses.length} report status records.`,
  )
} finally {
  await signOut(auth)
  await deleteApp(app)
}
