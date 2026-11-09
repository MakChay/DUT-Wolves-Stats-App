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
} from 'firebase/firestore'

const env = { ...loadEnv('development', process.cwd(), ''), ...process.env }
const email = env.FIREBASE_ADMIN_EMAIL || env.SEED_ADMIN_EMAIL
const password = env.FIREBASE_ADMIN_PASSWORD || env.SEED_ADMIN_PASSWORD
if (!email || !password) throw new Error('Admin credentials missing.')

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
})
const auth = getAuth(app)
const db = getFirestore(app)

try {
  await signInWithEmailAndPassword(auth, email, password)
  const [teams, matches, players, competition, season] = await Promise.all([
    getDocs(collection(db, 'teams')),
    getDocs(query(collection(db, 'matches'), where('competitionId', '==', 'comp-ussa-wits-2026-draft'))),
    getDocs(query(collection(db, 'players'), where('numberOnly', '==', true))),
    getDoc(doc(db, 'competitions', 'comp-ussa-wits-2026-draft')),
    getDoc(doc(db, 'seasons', 'season-ussa-wits-2026')),
  ])

  const rows = matches.docs.map((row) => ({ id: row.id, ...row.data() }))
  const dut = rows.filter((row) => row.homeTeamId === 'team-men' || row.homeTeamId === 'team-women' || row.awayTeamId === 'team-men' || row.awayTeamId === 'team-women')
  const teamNames = new Map(teams.docs.map((row) => [row.id, row.data().shortName ?? row.id]))

  console.log(`Project: ${env.VITE_FIREBASE_PROJECT_ID}`)
  console.log(`Teams: ${teams.size}`)
  console.log(`Number-only opponent players: ${players.size}`)
  console.log(`USSA fixtures: ${matches.size}`)
  console.log(`Competition exists: ${competition.exists()} publicVisible=${competition.data()?.publicVisible}`)
  console.log(`Season exists: ${season.exists()}`)
  console.log(`DUT fixtures: ${dut.length}`)
  for (const row of dut.sort((a, b) => a.tipoff.localeCompare(b.tipoff))) {
    console.log(`  ${row.tipoff} | ${teamNames.get(row.homeTeamId)} vs ${teamNames.get(row.awayTeamId)} | ${row.round} | public=${row.publicVisible} draft=${row.isDraft}`)
  }

  console.log('Opponent teams:')
  for (const row of teams.docs
    .map((entry) => ({ id: entry.id, ...entry.data() }))
    .filter((team) => team.id !== 'team-men' && team.id !== 'team-women')
    .sort((a, b) => `${a.gender}-${a.shortName}`.localeCompare(`${b.gender}-${b.shortName}`))) {
    console.log(`  ${row.gender} | ${row.shortName} | ${row.name} | ${row.id} | public=${row.publicVisible}`)
  }
} finally {
  await signOut(auth)
  await deleteApp(app)
}
