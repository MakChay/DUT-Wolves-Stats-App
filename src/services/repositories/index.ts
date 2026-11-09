import type { Repositories } from './contracts'
import { mockRepositories } from './mock'
import { firestoreRepositories } from './firestore'
import { isFirebaseConfigured } from '@/services/firebase/config'

/**
 * Single swap point for the data layer.
 *
 * Firestore is the source of truth. Mock repositories remain available for
 * offline UI work only, and must be requested explicitly with
 * VITE_DATA_MODE=mock. There is no silent fallback: if Firebase is configured
 * the app reads and writes Firestore, and failures surface as errors.
 */
const requestedMode = import.meta.env.VITE_DATA_MODE ?? 'firebase'
export const dataMode: 'mock' | 'firebase' =
  requestedMode === 'mock' || !isFirebaseConfigured ? 'mock' : 'firebase'

export const repositories: Repositories =
  dataMode === 'firebase' ? firestoreRepositories : mockRepositories

export type { Repositories } from './contracts'
