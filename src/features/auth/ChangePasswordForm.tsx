import { useState } from 'react'
import { KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Field } from '@/components/ui/input'
import { useAuth } from '@/features/auth/AuthContext'

interface ChangePasswordFormProps {
  onDone?: () => void
}

/**
 * First-login and in-workspace password change. Invited accounts are flagged
 * mustChangePassword and cannot use the workspace until this succeeds.
 */
export function ChangePasswordForm({ onDone }: ChangePasswordFormProps) {
  const { user, changePassword } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    if (next !== confirm) {
      setError('The new passwords do not match.')
      return
    }
    setBusy(true)
    const result = await changePassword(current, next)
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setCurrent('')
    setNext('')
    setConfirm('')
    onDone?.()
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-xs leading-relaxed text-ink-muted">
        {user?.mustChangePassword
          ? 'Your account was created with a temporary password. Choose your own password to continue.'
          : 'Enter your current password, then choose a new one.'}
      </p>
      <Field label="Current password" htmlFor="password-current">
        <Input
          id="password-current"
          type="password"
          value={current}
          onChange={(event) => setCurrent(event.target.value)}
          autoComplete="current-password"
          required
        />
      </Field>
      <Field label="New password" htmlFor="password-new" hint="At least 8 characters.">
        <Input
          id="password-new"
          type="password"
          value={next}
          onChange={(event) => setNext(event.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>
      <Field label="Confirm new password" htmlFor="password-confirm">
        <Input
          id="password-confirm"
          type="password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>
      {error ? (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={busy} className="w-full">
        <KeyRound className="h-4 w-4" aria-hidden="true" />
        {busy ? 'Updating…' : 'Save new password'}
      </Button>
    </form>
  )
}
