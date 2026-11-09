/**
 * Firebase configuration, read from Vite environment variables.
 *
 * Values live in .env.local (git-ignored). Firebase web config identifies the
 * project and is not a secret; security comes from Firestore rules and App Check.
 */
const env = import.meta.env

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: env.VITE_FIREBASE_PROJECT_ID ?? '',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: env.VITE_FIREBASE_APP_ID ?? '',
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID ?? '',
  appCheckSiteKey: env.VITE_FIREBASE_APP_CHECK_SITE_KEY ?? '',
} as const

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
)
