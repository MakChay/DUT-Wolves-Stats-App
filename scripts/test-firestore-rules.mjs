import assert from 'node:assert/strict'
import { initializeApp, deleteApp } from 'firebase/app'
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import {
  collection,
  connectFirestoreEmulator,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'

const projectId = 'dut-wolves-rules-test'
const app = initializeApp(
  {
    apiKey: 'fake-api-key',
    authDomain: `${projectId}.firebaseapp.com`,
    projectId,
    appId: '1:123456789:web:rules-test',
  },
  projectId,
)
const auth = getAuth(app)
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
const firestore = getFirestore(app)
connectFirestoreEmulator(firestore, '127.0.0.1', 8080)

function encodeValue(value) {
  if (value === null) return { nullValue: null }
  if (typeof value === 'string') return { stringValue: value }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value }
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(encodeValue) } }
  }
  return { mapValue: { fields: encodeFields(value) } }
}

function encodeFields(value) {
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, encodeValue(item)]),
  )
}

async function seed(path, data) {
  const response = await fetch(
    `http://127.0.0.1:8080/v1/projects/${projectId}/databases/(default)/documents/${path}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: 'Bearer owner',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields: encodeFields(data) }),
    },
  )
  if (!response.ok) {
    throw new Error(`Could not seed emulator document ${path}: ${await response.text()}`)
  }
}

async function expectAllowed(operation, label) {
  try {
    await operation
  } catch (error) {
    throw new Error(`${label}: expected access, received ${error.message}`)
  }
}

async function expectDenied(operation, label) {
  try {
    await operation
  } catch {
    return
  }
  throw new Error(`${label}: expected Firestore to deny access`)
}

const rosterPlayer = (teamId) => ({
  teamId,
  firstName: 'New',
  lastName: 'Player',
  jerseyNumber: null,
  position: null,
  availability: 'active',
  isActive: true,
  publicVisible: true,
  studentNumber: 'private-new',
})

const competitionDoc = () => ({
  name: 'Rules test competition',
  shortName: 'Rules test',
  seasonId: 'season',
  type: 'tournament',
  startDate: '2026-10-01T00:00:00.000Z',
  endDate: '2026-10-02T00:00:00.000Z',
  publicVisible: false,
})

async function createAccount(email, role, teamIds, playerId) {
  const credential = await createUserWithEmailAndPassword(auth, email, 'Local-rule-test-123!')
  await seed(`users/${credential.user.uid}`, {
    role,
    teamIds,
    ...(playerId ? { playerId } : {}),
  })
  return { email, uid: credential.user.uid }
}

async function seedFixtures() {
  const accounts = {}
  accounts.managerMen = await createAccount(
    'manager-men@example.test',
    'manager',
    ['team-men'],
  )
  accounts.managerWomen = await createAccount(
    'manager-women@example.test',
    'manager',
    ['team-women'],
  )
  accounts.playerMen = await createAccount(
    'player-men@example.test',
    'player',
    [],
    'player-men',
  )
  accounts.archivedMedia = await createAccount(
    'archived-media@example.test',
    'media_manager',
    [],
  )
  accounts.coachMen = await createAccount('coach-men@example.test', 'coach', ['team-men'])
  accounts.admin = await createAccount('admin@example.test', 'admin', ['team-men', 'team-women'])

  const match = (teamId, publicVisible = false) => ({
    competitionId: 'league',
    seasonId: 'season',
    homeTeamId: teamId,
    awayTeamId: 'opponent',
    venue: 'DUT',
    tipoff: '2026-11-30T10:00:00.000Z',
    status: 'scheduled',
    period: 1,
    clockSeconds: 600,
    publicVisible,
  })
  const fixtures = [
    [
      'players/player-men',
      {
        teamId: 'team-men',
        firstName: 'Player',
        lastName: 'Men',
        jerseyNumber: 8,
        position: null,
        availability: 'active',
        isActive: true,
        publicVisible: true,
        studentNumber: 'private-men',
      },
    ],
    ['players/player-women', { teamId: 'team-women', studentNumber: 'private-women' }],
    ['publicPlayers/player-men', { teamId: 'team-men', firstName: 'Player' }],
    ['publicPlayers/player-women', { teamId: 'team-women', firstName: 'Player' }],
    ['matches/match-men', match('team-men')],
    ['matches/match-women', match('team-women')],
    ['matches/match-men-public', match('team-men', true)],
    [
      'matchEvents/event-men',
      {
        matchId: 'match-men',
        teamId: 'team-men',
        clientEventId: 'client-event-men',
        type: 'FG2_MADE',
        period: 1,
        clockSeconds: 500,
        createdAt: '2026-11-30T10:00:00.000Z',
        recordedBy: 'manager-men',
        voidReason: 'internal correction note',
      },
    ],
    [
      'publicMatchEvents/event-men',
      {
        matchId: 'match-men',
        teamId: 'team-men',
        clientEventId: 'client-event-men',
        type: 'FG2_MADE',
        period: 1,
        clockSeconds: 500,
        createdAt: '2026-11-30T10:00:00.000Z',
      },
    ],
    [
      'matchEvents/event-women',
      {
        matchId: 'match-women',
        teamId: 'team-women',
        clientEventId: 'client-event-women',
        type: 'FG2_MADE',
        period: 1,
        clockSeconds: 500,
        createdAt: '2026-11-30T10:00:00.000Z',
        recordedBy: 'manager-women',
      },
    ],
    [
      'matchEvents/event-public',
      {
        matchId: 'match-men-public',
        teamId: 'team-men',
        clientEventId: 'client-event-public',
        type: 'FG2_MADE',
        period: 1,
        clockSeconds: 300,
        createdAt: '2026-11-30T10:02:00.000Z',
        recordedBy: 'manager-men',
        voidReason: 'internal only',
      },
    ],
    [
      'publicMatchEvents/event-public',
      {
        matchId: 'match-men-public',
        teamId: 'team-men',
        clientEventId: 'client-event-public',
        type: 'FG2_MADE',
        period: 1,
        clockSeconds: 300,
        createdAt: '2026-11-30T10:02:00.000Z',
      },
    ],
    [
      'reports/report-men',
      {
        matchId: 'match-men',
        teamId: 'team-men',
        submittedAt: '2026-11-30T11:00:00.000Z',
        status: 'submitted',
        injuries: [{ playerName: 'Private injury record' }],
      },
    ],
    [
      'reports/report-women',
      {
        matchId: 'match-women',
        teamId: 'team-women',
        submittedAt: '2026-11-30T11:00:00.000Z',
        status: 'submitted',
        injuries: [{ playerName: 'Private injury record' }],
      },
    ],
    ['media/draft', { status: 'draft', title: 'Private draft' }],
    ['media/published', { status: 'published', title: 'Published image' }],
  ]
  await Promise.all(fixtures.map(([path, data]) => seed(path, data)))
  return accounts
}

try {
  const accounts = await seedFixtures()
  await signInWithEmailAndPassword(auth, accounts.managerMen.email, 'Local-rule-test-123!')

  await expectAllowed(getDoc(doc(firestore, 'players/player-men')), 'Manager reads own-team player')
  await expectDenied(getDoc(doc(firestore, 'players/player-women')), 'Manager cannot read another team')
  await expectAllowed(
    getDocs(query(collection(firestore, 'players'), where('teamId', '==', 'team-men'))),
    'Assigned-team player query',
  )
  await expectAllowed(
    getDoc(doc(firestore, 'reports/report-men')),
    'Manager reads own-team report',
  )
  await expectDenied(
    getDoc(doc(firestore, 'reports/report-women')),
    'Manager cannot read another team report',
  )
  await expectAllowed(
    getDoc(doc(firestore, 'matchEvents/event-men')),
    'Manager reads own-match full event',
  )
  await expectDenied(
    getDoc(doc(firestore, 'matchEvents/event-women')),
    'Manager cannot read full event for another match',
  )
  await expectAllowed(
    getDocs(
      query(collection(firestore, 'reportStatuses'), where('matchId', '==', 'match-men')),
    ),
    'Manager reads non-sensitive report statuses',
  )

  await expectAllowed(setDoc(doc(firestore, 'players/player-men-new'), rosterPlayer('team-men')), 'Manager adds own-team player')
  await expectAllowed(
    updateDoc(doc(firestore, 'players/player-men-new'), {
      archivedAt: '2026-11-30T12:00:00.000Z',
      isActive: false,
      publicVisible: false,
      availability: 'inactive',
    }),
    'Manager archives own-team player',
  )
  await expectAllowed(deleteDoc(doc(firestore, 'players/player-men-new')), 'Manager deletes own-team player')
  await expectDenied(setDoc(doc(firestore, 'players/player-women-new'), rosterPlayer('team-women')), 'Manager cannot add other-team player')
  await expectDenied(deleteDoc(doc(firestore, 'players/player-women')), 'Manager cannot delete other-team player')
  await expectDenied(setDoc(doc(firestore, 'competitions/manager-test'), competitionDoc()), 'Manager cannot create competitions')
  await expectAllowed(
    setDoc(doc(firestore, 'matchRosters/match-men-opponent-12'), {
      matchId: 'match-men',
      teamId: 'opponent',
      playerId: 'match-men-opponent-jersey-12',
      jerseyNumber: 12,
      isStarter: false,
      isActive: true,
      matchOnly: true,
    }),
    'Manager records an opponent jersey for their match only',
  )
  await expectDenied(
    setDoc(doc(firestore, 'matchRosters/match-women-opponent-12'), {
      matchId: 'match-women',
      teamId: 'opponent',
      playerId: 'match-women-opponent-jersey-12',
      jerseyNumber: 12,
      isStarter: false,
      isActive: true,
      matchOnly: true,
    }),
    'Manager cannot add opponent roster entries to another team match',
  )

  const publicPlayerBatch = writeBatch(firestore)
  publicPlayerBatch.update(doc(firestore, 'players/player-men'), {
    firstName: 'Updated',
  })
  publicPlayerBatch.set(doc(firestore, 'publicPlayers/player-men'), {
    teamId: 'team-men',
    firstName: 'Updated',
    lastName: 'Men',
    jerseyNumber: 8,
    position: null,
    availability: 'active',
    isActive: true,
    publicVisible: true,
  })
  await expectAllowed(publicPlayerBatch.commit(), 'Atomic private and public player update')

  const leakedPlayerBatch = writeBatch(firestore)
  leakedPlayerBatch.update(doc(firestore, 'players/player-men'), {
    firstName: 'Leaked',
  })
  leakedPlayerBatch.set(doc(firestore, 'publicPlayers/player-men'), {
    teamId: 'team-men',
    firstName: 'Leaked',
    lastName: 'Men',
    jerseyNumber: 8,
    position: null,
    availability: 'active',
    isActive: true,
    publicVisible: true,
    studentNumber: 'private-men',
  })
  await expectDenied(
    leakedPlayerBatch.commit(),
    'Public player projection cannot contain private fields',
  )

  const safeEvent = {
    matchId: 'match-men',
    teamId: 'team-men',
    clientEventId: 'client-event-new',
    type: 'FG3_MADE',
    period: 1,
    clockSeconds: 400,
    createdAt: '2026-11-30T10:01:00.000Z',
    points: 3,
  }
  const eventBatch = writeBatch(firestore)
  eventBatch.set(doc(firestore, 'matchEvents/event-new'), {
    ...safeEvent,
    recordedBy: accounts.managerMen.uid,
  })
  eventBatch.set(doc(firestore, 'publicMatchEvents/event-new'), safeEvent)
  await expectAllowed(eventBatch.commit(), 'Atomic event and public projection write')

  const leakedEventBatch = writeBatch(firestore)
  leakedEventBatch.set(doc(firestore, 'matchEvents/event-leak'), {
    ...safeEvent,
    clientEventId: 'client-event-leak',
    recordedBy: accounts.managerMen.uid,
  })
  leakedEventBatch.set(doc(firestore, 'publicMatchEvents/event-leak'), {
    ...safeEvent,
    clientEventId: 'client-event-leak',
    recordedBy: accounts.managerMen.uid,
  })
  await expectDenied(leakedEventBatch.commit(), 'Projection cannot contain actor identifiers')

  const reportBatch = writeBatch(firestore)
  const report = {
    matchId: 'match-men',
    teamId: 'team-men',
    submittedAt: '2026-11-30T12:00:00.000Z',
    status: 'submitted',
    injuries: [{ playerName: 'Private injury record' }],
  }
  reportBatch.set(doc(firestore, 'reports/report-new'), report)
  reportBatch.set(doc(firestore, 'reportStatuses/report-new'), {
    matchId: report.matchId,
    teamId: report.teamId,
    submittedAt: report.submittedAt,
    status: report.status,
  })
  await expectAllowed(reportBatch.commit(), 'Atomic report and status write')

  await signOut(auth)
  await signInWithEmailAndPassword(auth, accounts.playerMen.email, 'Local-rule-test-123!')
  await expectAllowed(getDoc(doc(firestore, 'players/player-men')), 'Player reads own profile')
  await expectDenied(getDoc(doc(firestore, 'players/player-women')), 'Player cannot read another profile')
  await expectAllowed(
    getDoc(doc(firestore, 'publicPlayers/player-women')),
    'Player can read public player projection',
  )
  await expectDenied(getDoc(doc(firestore, 'reports/report-men')), 'Player cannot read reports')
  await expectDenied(getDoc(doc(firestore, 'matchEvents/event-men')), 'Player cannot read full events')
  await expectAllowed(
    getDoc(doc(firestore, 'publicMatchEvents/event-men')),
    'Player reads safe events for own team',
  )
  await expectDenied(getDoc(doc(firestore, 'media/draft')), 'Player cannot read draft media')

  await signOut(auth)
  await signInWithEmailAndPassword(auth, accounts.archivedMedia.email, 'Local-rule-test-123!')
  await expectDenied(
    getDoc(doc(firestore, 'media/draft')),
    'Archived media role cannot read draft assets',
  )
  await expectAllowed(
    getDoc(doc(firestore, 'media/published')),
    'Archived media role can read public published assets',
  )
  await expectDenied(
    updateDoc(doc(firestore, 'media/published'), { title: 'Archived role write' }),
    'Archived media role cannot publish or edit media',
  )

  await signOut(auth)
  await signInWithEmailAndPassword(auth, accounts.admin.email, 'Local-rule-test-123!')
  await expectDenied(
    updateDoc(doc(firestore, 'media/published'), { title: 'Admin write' }),
    'Media publishing remains disabled for administrators',
  )

  await signOut(auth)
  await expectAllowed(
    getDoc(doc(firestore, 'publicMatchEvents/event-public')),
    'Public reads safe events for published matches',
  )
  const publicEvent = await getDoc(doc(firestore, 'publicMatchEvents/event-public'))
  assert.equal('recordedBy' in publicEvent.data(), false)
  assert.equal('voidReason' in publicEvent.data(), false)
  await expectDenied(
    getDoc(doc(firestore, 'matchEvents/event-public')),
    'Public cannot read full match events',
  )
  await expectDenied(
    getDoc(doc(firestore, 'publicMatchEvents/event-men')),
    'Public cannot read private-match projections',
  )
  await expectAllowed(
    getDoc(doc(firestore, 'media/published')),
    'Public can read published media',
  )
  await expectDenied(
    getDoc(doc(firestore, 'media/draft')),
    'Public cannot read draft media',
  )

  await signOut(auth)
  await signInWithEmailAndPassword(auth, accounts.coachMen.email, 'Local-rule-test-123!')
  await expectAllowed(getDoc(doc(firestore, 'players/player-men')), 'Coach reads own-team player')
  await expectDenied(getDoc(doc(firestore, 'players/player-women')), 'Coach cannot read another team player')
  await expectDenied(setDoc(doc(firestore, 'players/coach-added'), rosterPlayer('team-men')), 'Coach cannot add players')
  await expectDenied(deleteDoc(doc(firestore, 'players/player-men')), 'Coach cannot delete players')
  await expectDenied(setDoc(doc(firestore, 'competitions/coach-test'), competitionDoc()), 'Coach cannot create competitions')

  await signOut(auth)
  await signInWithEmailAndPassword(auth, accounts.admin.email, 'Local-rule-test-123!')
  await expectAllowed(setDoc(doc(firestore, 'competitions/admin-test'), competitionDoc()), 'Admin creates competitions')
  await expectAllowed(
    updateDoc(doc(firestore, 'competitions/admin-test'), { publicVisible: true }),
    'Admin publishes competitions',
  )
  await expectAllowed(setDoc(doc(firestore, 'players/admin-added'), rosterPlayer('team-women')), 'Admin adds players to any team')

  console.log('Firestore rules checks passed.')
} finally {
  await signOut(auth)
  await deleteApp(app)
}
