import { deleteApp, initializeApp } from 'firebase/app'
import { createUserWithEmailAndPassword, getAuth, signOut } from 'firebase/auth'
import { firebaseConfig } from './config'

export async function createInvitedAuthAccount(email: string, temporaryPassword: string): Promise<string> {
  const name = `invite-${Date.now().toString(36)}`
  const secondary = initializeApp(firebaseConfig, name)
  try {
    const auth = getAuth(secondary)
    const credential = await createUserWithEmailAndPassword(auth, email.trim(), temporaryPassword)
    await signOut(auth)
    return credential.user.uid
  } finally {
    await deleteApp(secondary)
  }
}

export function generateTemporaryPassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  const bytes = crypto.getRandomValues(new Uint32Array(12))
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join('')
}
