import { doc, getDocFromServer } from 'firebase/firestore'
import { firestore } from './app'

export interface ConnectionStatus {
  ok: boolean
  message: string
}

/**
 * Reaches Firestore on the server. A permission-denied answer still proves the
 * project is reachable, so it is reported as reachable with rules enforced.
 */
export async function probeFirestore(): Promise<ConnectionStatus> {
  if (!firestore) {
    return { ok: false, message: 'Firebase is not configured in this build.' }
  }
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(Object.assign(new Error('timeout'), { code: 'unavailable' })), 10_000)
  })
  try {
    await Promise.race([getDocFromServer(doc(firestore, '_connection', 'probe')), timeout])
    return { ok: true, message: 'Firestore reachable.' }
  } catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : ''
    if (code === 'permission-denied' || code === 'not-found') {
      return { ok: true, message: 'Firestore reachable. Security rules are enforcing access.' }
    }
    if (code === 'unavailable') {
      return { ok: false, message: 'Firestore unavailable. Check the network connection.' }
    }
    return { ok: false, message: error instanceof Error ? error.message : 'Firestore check failed.' }
  }
}
