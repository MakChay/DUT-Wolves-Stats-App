import { firebaseConfig, isFirebaseConfigured } from './config'

export { firebaseConfig, isFirebaseConfigured }

/**
 * Deliberately not implemented until a Firebase project exists.
 *
 * Every call fails loudly instead of silently falling back to mock behaviour,
 * so a production build can never pretend authentication is real.
 */
export function requireFirebase(feature: string): never {
  throw new Error(
    `Firebase is not configured. "${feature}" requires a Firebase project, App Check and security rules. ` +
      'Set VITE_FIREBASE_* environment variables and implement the adapter in src/services/firebase.',
  )
}

export const firebaseAuth = {
  signInWithEmail: (email: string) =>
    requireFirebase(`signInWithEmail(${email})`),
  signOut: () => requireFirebase('signOut'),
  onAuthStateChanged: () => requireFirebase('onAuthStateChanged'),
  verifyPlayerCode: (code: string) =>
    requireFirebase(`verifyPlayerCode(${code}) — must run in a Cloud Function`),
}

export const firestore = {
  collection: (name: string) => requireFirebase(`firestore.collection(${name})`),
  doc: (path: string) => requireFirebase(`firestore.doc(${path})`),
}

export const appCheck = {
  activate: () => requireFirebase('appCheck.activate'),
}
