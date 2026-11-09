import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getStorage, type FirebaseStorage } from 'firebase/storage'
import { firebaseConfig, isFirebaseConfigured } from './config'

export const firebaseApp: FirebaseApp | null = isFirebaseConfigured
  ? getApps().length > 0
    ? getApp()
    : initializeApp(firebaseConfig)
  : null

export const firebaseAuth: Auth | null = firebaseApp ? getAuth(firebaseApp) : null
export const firestore: Firestore | null = firebaseApp ? getFirestore(firebaseApp) : null
export const firebaseStorage: FirebaseStorage | null = firebaseApp ? getStorage(firebaseApp) : null

export async function initAnalytics(): Promise<void> {
  if (!firebaseApp || !firebaseConfig.measurementId) return
  const { getAnalytics, isSupported } = await import('firebase/analytics')
  if (await isSupported()) getAnalytics(firebaseApp)
}
