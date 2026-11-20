import { readFile } from 'node:fs/promises'
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

const schedule = JSON.parse(
  await readFile(new URL('../src/data/ussa-wits-2026.json', import.meta.url), 'utf8'),
)
const env = loadSecureEnv()
const apply = process.argv.includes('--apply')
const adminEmail = env.FIREBASE_ADMIN_EMAIL || env.SEED_ADMIN_EMAIL
const adminPassword = env.FIREBASE_ADMIN_PASSWORD || env.SEED_ADMIN_PASSWORD

function poolForFixture(gender, home, away) {
  const pools = schedule.divisions[gender]
  const matches = Object.entries(pools).filter(
    ([, teams]) => teams.includes(home) && teams.includes(away),
  )
  if (matches.length !== 1) {
    throw new Error(`Could not resolve a single ${gender} pool for ${home} vs ${away}.`)
  }
  const [key] = matches[0]
  return { section: key[0], pool: key[2] }
}

function buildFixtures() {
  const fixtures = []
  for (const day of schedule.days) {
    for (const slot of day.slots) {
      for (const court of ['A', 'B']) {
        const [home, away] = slot[`court${court}`]
        const { section, pool } = poolForFixture(slot.gender, home, away)
        const tipoff = new Date(`${day.date}T${slot.time}:00+02:00`)
        if (Number.isNaN(tipoff.getTime())) throw new Error(`Invalid fixture time ${day.date} ${slot.time}.`)
        fixtures.push({
          id: `ussa-wits-2026-${slot.gender}-${day.date}-${slot.time.replace(':', '')}-${court}`,
          gender: slot.gender,
          home,
          away,
          section,
          pool,
          date: day.date,
          time: slot.time,
          court,
          tipoff: tipoff.toISOString(),
        })
      }
    }
  }

  const poolCounts = new Map()
  const pairKeys = new Set()
  for (const fixture of fixtures) {
    const key = `${fixture.gender}-${fixture.section}-${fixture.pool}`
    const pair = [fixture.home, fixture.away].sort().join('|')
    const uniqueKey = `${key}-${pair}`
    if (pairKeys.has(uniqueKey)) throw new Error(`Duplicate pool fixture: ${fixture.home} vs ${fixture.away}.`)
    pairKeys.add(uniqueKey)
    poolCounts.set(key, (poolCounts.get(key) ?? 0) + 1)
  }

  for (const gender of Object.keys(schedule.divisions)) {
    for (const key of Object.keys(schedule.divisions[gender])) {
      const count = poolCounts.get(`${gender}-${key[0]}-${key[2]}`) ?? 0
      if (count !== 6) throw new Error(`${gender} Section ${key[0]} Pool ${key[2]} has ${count} games; expected 6.`)
    }
  }

  if (fixtures.length !== 48) throw new Error(`Expected 48 pool fixtures; found ${fixtures.length}.`)
  return fixtures
}

function normalize(value) {
  return value
    .toLowerCase()
    .replace(/\b(women'?s|men'?s|women|men|w|m)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
}

function schoolAliases(code) {
  const school = schedule.schoolNames[code]
  return new Set([code, school.name, ...school.aliases].map(normalize))
}

function createOpponentTeam(code, gender) {
  const school = schedule.schoolNames[code]
  return {
    id: `ussa26-${gender}-${code.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name: `${school.name} ${gender === 'men' ? 'Men' : 'Women'}`,
    shortName: code,
    gender,
    managerId: '',
    coachIds: [],
    primaryColor: '#313741',
    publicVisible: false,
  }
}

function createApp() {
  const required = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_APP_ID',
  ]
  const missing = required.filter((key) => !env[key])
  if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  if (!adminEmail || !adminPassword) {
    throw new Error('Missing admin credentials. Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in the encrypted local env store.')
  }

  return initializeApp({
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  })
}

const fixtures = buildFixtures()
const codesByGender = Object.fromEntries(
  Object.entries(schedule.divisions).map(([gender, pools]) => [
    gender,
    [...new Set(Object.values(pools).flat())],
  ]),
)
const importedTeams = new Map()
const teamWrites = []
const app = apply ? createApp() : null
let auth

try {
  if (apply && app) {
    auth = getAuth(app)
    const credential = await signInWithEmailAndPassword(
      auth,
      adminEmail,
      adminPassword,
    )
    const database = getFirestore(app)
    const userSnapshot = await getDoc(doc(database, 'users', credential.user.uid))
    if (!userSnapshot.exists() || userSnapshot.data().role !== 'admin') {
      throw new Error('The signed-in account must have an admin profile in Firestore.')
    }

    const [existingTeamsSnapshot, existingMatchesSnapshot] = await Promise.all([
      getDocs(collection(database, 'teams')),
      getDocs(collection(database, 'matches')),
    ])
    const existingTeams = existingTeamsSnapshot.docs.map((snapshot) => ({
      id: snapshot.id,
      ...snapshot.data(),
    }))
    const existingMatches = new Map(
      existingMatchesSnapshot.docs.map((snapshot) => [snapshot.id, snapshot.data()]),
    )

    for (const gender of Object.keys(schedule.divisions)) {
      for (const code of codesByGender[gender]) {
        if (code === 'DUT') {
          const dutTeam = existingTeams.find(
            (team) => team.id === (gender === 'men' ? 'team-men' : 'team-women') && team.gender === gender,
          )
          if (!dutTeam) throw new Error(`Expected the existing DUT ${gender} team document.`)
          importedTeams.set(`${gender}:${code}`, dutTeam)
          continue
        }

        const aliases = schoolAliases(code)
        const candidates = existingTeams.filter(
          (team) =>
            team.gender === gender &&
            [team.name, team.shortName].some((value) => {
              const normalized = normalize(value)
              return (
                aliases.has(normalized) ||
                [...aliases].some((alias) => alias.length >= 4 && normalized.includes(alias))
              )
            }),
        )
        if (candidates.length > 1) {
          throw new Error(`Multiple existing ${gender} teams match ${code}; resolve them before importing.`)
        }
        const team = candidates[0] ?? createOpponentTeam(code, gender)
        importedTeams.set(`${gender}:${code}`, team)
        if (!candidates.length) teamWrites.push(team)
      }
    }

    const newFixtures = fixtures.filter((fixture) => !existingMatches.has(fixture.id))
    const existingSeason = await getDoc(doc(database, 'seasons', schedule.season.id))
    const existingCompetition = await getDoc(doc(database, 'competitions', schedule.competition.id))
    const batch = writeBatch(database)

    for (const team of teamWrites) {
      const { id, ...data } = team
      batch.set(doc(database, 'teams', id), data)
    }
    if (!existingSeason.exists()) {
      const { name, startDate, endDate } = schedule.season
      batch.set(doc(database, 'seasons', schedule.season.id), {
        name,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        isCurrent: false,
      })
    }
    if (!existingCompetition.exists()) {
      const { name, shortName, startDate, endDate } = schedule.competition
      batch.set(doc(database, 'competitions', schedule.competition.id), {
        name,
        shortName,
        type: 'tournament',
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        publicVisible: false,
      })
    }
    for (const fixture of newFixtures) {
      const homeTeam = importedTeams.get(`${fixture.gender}:${fixture.home}`)
      const awayTeam = importedTeams.get(`${fixture.gender}:${fixture.away}`)
      const dutMatch = fixture.home === 'DUT' || fixture.away === 'DUT'
      batch.set(doc(database, 'matches', fixture.id), {
        competitionId: schedule.competition.id,
        seasonId: schedule.season.id,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        venue: `Wits West Campus, Hall 29 · Court ${fixture.court}`,
        tipoff: fixture.tipoff,
        status: 'scheduled',
        period: 1,
        clockSeconds: 600,
        publicVisible: false,
        isDraft: true,
        round: `Section ${fixture.section} · Pool ${fixture.pool}`,
        reportRequired: dutMatch,
        adminComplete: false,
      })
    }
    if (teamWrites.length + newFixtures.length + Number(!existingSeason.exists()) + Number(!existingCompetition.exists()) > 0) {
      await batch.commit()
    }
    console.log(`Created ${teamWrites.length} opponent teams and ${newFixtures.length} draft fixtures.`)
    console.log('Fixtures remain private until reviewed and published by an administrator.')
    console.log(`Skipped ${fixtures.length - newFixtures.length} fixtures that already existed.`)
  } else {
    console.log('Dry run only. No Firebase connection or database writes were made.')
    console.log(`Validated ${fixtures.length} pool fixtures across ${Object.values(codesByGender).flat().length} team entries.`)
    console.log('Preview: 1-3 December 2026 · Wits West Campus Hall 29 · Courts A and B.')
    console.log('Friday/Saturday classification and playoff fixtures are not imported; those matchups are TBD.')
    console.log('Run with --apply and admin credentials in the environment to import private draft fixtures.')
  }
} finally {
  if (auth) await signOut(auth)
  if (app) await deleteApp(app)
}
