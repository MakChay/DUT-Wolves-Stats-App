import { loadEnv } from 'vite'
import { initializeApp, deleteApp } from 'firebase/app'
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

/**
 * One-off publish/unpublish for the USSA Wits 2026 draft.
 *
 * Publish flips the competition, its 48 fixtures and every opponent team used
 * by those fixtures to public in a single batch, so the public site never sees
 * a fixture whose teams are still hidden.
 *
 *   node scripts/publish-ussa-2026.mjs
 *   node scripts/publish-ussa-2026.mjs --unpublish
 */
const COMPETITION_ID = 'comp-ussa-wits-2026-draft'
const env = { ...loadEnv('development', process.cwd(), ''), ...process.env }
const publish = !process.argv.includes('--unpublish')
const email = env.FIREBASE_ADMIN_EMAIL || env.SEED_ADMIN_EMAIL
const password = env.FIREBASE_ADMIN_PASSWORD || env.SEED_ADMIN_PASSWORD

if (!email || !password) {
  throw new Error('Missing admin credentials. Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in .env.local.')
}

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
})
const auth = getAuth(app)
const db = getFirestore(app)

try {
  const credential = await signInWithEmailAndPassword(auth, email, password)
  const profileSnapshot = await getDoc(doc(db, 'users', credential.user.uid))
  if (!profileSnapshot.exists() || profileSnapshot.data().role !== 'admin') {
    throw new Error('The signed-in account must have an admin profile in Firestore.')
  }
  const profile = profileSnapshot.data()

  const competitionRef = doc(db, 'competitions', COMPETITION_ID)
  const competitionSnapshot = await getDoc(competitionRef)
  if (!competitionSnapshot.exists()) {
    throw new Error(`Competition ${COMPETITION_ID} does not exist. Run the import first.`)
  }

  const matchSnapshot = await getDocs(
    query(collection(db, 'matches'), where('competitionId', '==', COMPETITION_ID)),
  )
  if (matchSnapshot.size !== 48) {
    throw new Error(`Expected 48 fixtures for ${COMPETITION_ID}; found ${matchSnapshot.size}.`)
  }

  const teamIds = new Set()
  for (const match of matchSnapshot.docs) {
    const data = match.data()
    teamIds.add(data.homeTeamId)
    teamIds.add(data.awayTeamId)
  }
  const teamSnapshots = await Promise.all(
    [...teamIds].map((teamId) => getDoc(doc(db, 'teams', teamId))),
  )
  const missingTeams = teamSnapshots.filter((snapshot) => !snapshot.exists())
  if (missingTeams.length > 0) {
    throw new Error(`Missing team documents: ${missingTeams.map((snapshot) => snapshot.id).join(', ')}`)
  }

  const now = new Date().toISOString()
  const changes = 1 + matchSnapshot.size + teamSnapshots.length
  const batch = writeBatch(db)

  batch.update(competitionRef, { publicVisible: publish })
  for (const match of matchSnapshot.docs) {
    batch.update(match.ref, { publicVisible: publish, isDraft: !publish })
  }
  for (const team of teamSnapshots) {
    batch.update(team.ref, { publicVisible: publish })
  }
  batch.set(doc(db, 'audit', `audit-ussa-publish-${Date.now()}`), {
    entityType: 'competition',
    entityId: COMPETITION_ID,
    action: publish ? 'publish' : 'archive',
    actorUserId: credential.user.uid,
    actorName: profile.displayName ?? 'Administrator',
    actorRole: profile.role,
    summary: publish
      ? 'Published the USSA Wits 2026 tournament, all 48 pool fixtures and their opponent teams.'
      : 'Unpublished the USSA Wits 2026 tournament and hid its fixtures and opponent teams.',
    before: { publicVisible: !publish },
    after: { publicVisible: publish },
    createdAt: now,
  })

  await batch.commit()

  console.log(
    `${publish ? 'Published' : 'Unpublished'} ${matchSnapshot.size} fixtures, ` +
      `${teamSnapshots.length} teams and competition ${COMPETITION_ID} (${changes} updates).`,
  )
  console.log(
    publish
      ? 'The USSA schedule is now visible on the public fixtures, teams and standings pages.'
      : 'The USSA schedule is hidden from the public site.',
  )
} finally {
  await signOut(auth)
  await deleteApp(app)
}
