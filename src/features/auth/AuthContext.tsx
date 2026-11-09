import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updatePassword,
  type User as FirebaseUser,
} from 'firebase/auth'
import type { User } from '@/types/domain'
import { firebaseAuth } from '@/services/firebase/app'
import { repositories } from '@/services/repositories'

export type SignInResult = { ok: true; user: User } | { ok: false; error: string }

interface AuthContextValue {
  user: User | null
  firebaseUser: FirebaseUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<SignInResult>
  signOut: () => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<SignInResult>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function authError(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : ''
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'That email and password combination was not recognised.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a moment and try again.'
    case 'auth/weak-password':
      return 'Choose a password of at least 8 characters.'
    case 'auth/requires-recent-login':
      return 'Please sign in again before changing your password.'
    case 'auth/network-request-failed':
      return 'No network connection. Check your connection and try again.'
    default:
      return error instanceof Error ? error.message : 'Authentication failed.'
  }
}

async function loadProfile(uid: string): Promise<User | null> {
  const profile = await repositories.users.getByAuthUid(uid)
  if (!profile || profile.disabled) return null
  return profile
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!firebaseAuth) {
      setLoading(false)
      return
    }
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (next) => {
      setFirebaseUser(next)
      if (!next) {
        setUser(null)
        setLoading(false)
        return
      }
      try {
        setUser(await loadProfile(next.uid))
      } catch {
        setUser(null)
      } finally {
        setLoading(false)
      }
    })
    return unsubscribe
  }, [])

  const signIn = useCallback(async (email: string, password: string): Promise<SignInResult> => {
    if (!firebaseAuth) return { ok: false, error: 'Firebase Auth is not configured.' }
    try {
      const credential = await signInWithEmailAndPassword(firebaseAuth, email.trim(), password)
      const profile = await loadProfile(credential.user.uid)
      if (!profile) {
        await firebaseSignOut(firebaseAuth)
        return {
          ok: false,
          error: 'This login has no active DUT Wolves profile. Ask an administrator for access.',
        }
      }
      setUser(profile)
      setFirebaseUser(credential.user)
      return { ok: true, user: profile }
    } catch (error) {
      return { ok: false, error: authError(error) }
    }
  }, [])

  const signOut = useCallback(async () => {
    if (firebaseAuth) await firebaseSignOut(firebaseAuth)
    setUser(null)
    setFirebaseUser(null)
  }, [])

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string): Promise<SignInResult> => {
      if (!firebaseAuth?.currentUser || !user) {
        return { ok: false, error: 'Sign in before changing your password.' }
      }
      if (newPassword.length < 8) {
        return { ok: false, error: 'Choose a password of at least 8 characters.' }
      }
      try {
        const credential = EmailAuthProvider.credential(user.email, currentPassword)
        await reauthenticateWithCredential(firebaseAuth.currentUser, credential)
        await updatePassword(firebaseAuth.currentUser, newPassword)
        const updated = await repositories.users.update(user.id, { mustChangePassword: false })
        const profile = updated ?? { ...user, mustChangePassword: false }
        setUser(profile)
        return { ok: true, user: profile }
      } catch (error) {
        return { ok: false, error: authError(error) }
      }
    },
    [user],
  )

  const refreshProfile = useCallback(async () => {
    if (!firebaseUser) return
    setUser(await loadProfile(firebaseUser.uid))
  }, [firebaseUser])

  const value = useMemo<AuthContextValue>(
    () => ({ user, firebaseUser, loading, signIn, signOut, changePassword, refreshProfile }),
    [user, firebaseUser, loading, signIn, signOut, changePassword, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}

export function homePathForRole(user: User): string {
  switch (user.role) {
    case 'admin':
      return '/admin'
    case 'manager':
      return '/manager'
    case 'coach':
      return '/coach'
    case 'player':
      return '/player'
    default:
      return '/'
  }
}
