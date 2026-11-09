import { useState } from 'react'
import { Copy, ShieldCheck, UserPlus, UserRound } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableWrap, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty-state'
import { SkeletonCard } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input, Field } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { useAdminData } from '@/features/admin/useAdminData'
import { useAuth } from '@/features/auth/AuthContext'
import { repositories } from '@/services/repositories'
import { recordAudit } from '@/services/audit/record'
import { createInvitedAuthAccount, generateTemporaryPassword } from '@/services/firebase/accounts'
import { firebaseAuth } from '@/services/firebase/app'
import { sendPasswordResetEmail } from 'firebase/auth'
import type { UserRole } from '@/types/domain'

const ROLE_TONE = {
  admin: 'danger',
  manager: 'accent',
  coach: 'warning',
  player: 'success',
  media_manager: 'neutral',
  public: 'neutral',
} as const

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'manager', label: 'Team manager' },
  { value: 'coach', label: 'Coach' },
  { value: 'player', label: 'Player' },
  { value: 'admin', label: 'Administrator' },
]

interface InviteForm {
  displayName: string
  email: string
  role: UserRole
  teamId: string
  title: string
  playerId: string
}

const EMPTY_INVITE: InviteForm = {
  displayName: '',
  email: '',
  role: 'coach',
  teamId: 'team-men',
  title: '',
  playerId: '',
}

export function AdminUsersPage() {
  const { data, loading, error, reload } = useAdminData()
  const { user: currentUser } = useAuth()
  const { toast } = useToast()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [form, setForm] = useState<InviteForm>(EMPTY_INVITE)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [issued, setIssued] = useState<{ email: string; password: string } | null>(null)
  const [actionBusy, setActionBusy] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonCard lines={2} />
        <SkeletonCard lines={10} />
      </div>
    )
  }

  if (error) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Users could not be loaded"
        description={error}
        action={<Button onClick={reload}>Try again</Button>}
      />
    )
  }

  if (!data) return null

  const playerOptions = data.players.filter(
    (player) => player.teamId === form.teamId && !player.numberOnly,
  )

  const openInvite = () => {
    setForm(EMPTY_INVITE)
    setFormError(null)
    setIssued(null)
    setInviteOpen(true)
  }

  const invite = async () => {
    if (!currentUser || currentUser.role !== 'admin') return
    setFormError(null)
    const email = form.email.trim().toLowerCase()
    if (!form.displayName.trim() || !email.includes('@')) {
      setFormError('Enter a name and a valid email address.')
      return
    }
    if (data.users.some((entry) => entry.email.toLowerCase() === email)) {
      setFormError('A user with this email already exists.')
      return
    }
    if (form.role === 'player' && !form.playerId) {
      setFormError('Link the player account to a squad member.')
      return
    }
    setBusy(true)
    try {
      const password = generateTemporaryPassword()
      const uid = await createInvitedAuthAccount(email, password)
      const teamIds =
        form.role === 'admin'
          ? ['team-men', 'team-women']
          : [form.teamId]
      const now = new Date().toISOString()
      await repositories.users.upsert({
        id: uid,
        authUid: uid,
        email,
        displayName: form.displayName.trim(),
        role: form.role,
        teamIds,
        title: form.title.trim() || ROLE_OPTIONS.find((option) => option.value === form.role)?.label,
        playerId: form.role === 'player' ? form.playerId : undefined,
        mustChangePassword: true,
        invitedAt: now,
        invitedByUserId: currentUser.id,
        createdAt: now,
      })
      await recordAudit({
        user: currentUser,
        entityType: 'user',
        entityId: uid,
        action: 'create',
        summary: `Invited ${form.displayName.trim()} (${email}) as ${form.role}.`,
        after: { role: form.role, teamIds },
      })
      setIssued({ email, password })
      toast({ title: 'Invite created', description: `${email} must change the temporary password on first sign-in.`, tone: 'success' })
      await reload()
    } catch (inviteError) {
      setFormError(
        inviteError instanceof Error ? inviteError.message : 'Could not create the account.',
      )
    } finally {
      setBusy(false)
    }
  }

  const sendReset = async (target: { id: string; email: string; displayName: string }) => {
    if (!currentUser || currentUser.role !== 'admin' || !firebaseAuth) return
    setActionBusy(target.id)
    try {
      await sendPasswordResetEmail(firebaseAuth, target.email)
      await recordAudit({
        user: currentUser,
        entityType: 'user',
        entityId: target.id,
        action: 'update',
        summary: `Sent a password reset email to ${target.email}.`,
      })
      toast({ title: 'Reset email sent', description: `${target.email} will receive a link to choose a new password.`, tone: 'success' })
    } catch (err) {
      toast({ title: 'Could not send reset email', description: err instanceof Error ? err.message : 'Try again.', tone: 'error' })
    } finally {
      setActionBusy(null)
    }
  }

  const toggleDisabled = async (target: { id: string; displayName: string; disabled?: boolean }) => {
    if (!currentUser || currentUser.role !== 'admin' || target.id === currentUser.id) return
    setActionBusy(target.id)
    try {
      await repositories.users.update(target.id, { disabled: !target.disabled })
      await recordAudit({
        user: currentUser,
        entityType: 'user',
        entityId: target.id,
        action: 'update',
        summary: target.disabled
          ? `Re-enabled ${target.displayName}'s account.`
          : `Disabled ${target.displayName}'s account.`,
      })
      toast({
        title: target.disabled ? 'Account enabled' : 'Account disabled',
        description: target.disabled
          ? `${target.displayName} can sign in again.`
          : `${target.displayName} can no longer sign in.`,
        tone: 'success',
      })
      await reload()
    } catch (err) {
      toast({ title: 'Could not update account', description: err instanceof Error ? err.message : 'Try again.', tone: 'error' })
    } finally {
      setActionBusy(null)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Users"
        title="Users & roles"
        description="Invite staff and players. Each invitee receives a temporary password and must set their own on first sign-in."
        actions={
          <Button onClick={openInvite}>
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Invite user
          </Button>
        }
      />

      <Card>
        <CardContent className="flex items-center gap-3 pt-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-accent">
            <UserRound className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">{data.users.length} accounts</p>
            <p className="text-[11px] text-ink-muted">
              {data.users.filter((user) => user.role === 'manager').length} managers ·{' '}
              {data.users.filter((user) => user.role === 'coach').length} coaches ·{' '}
              {data.users.filter((user) => user.role === 'player').length} players ·{' '}
              {data.users.filter((user) => user.role === 'media_manager').length} archived media accounts ·{' '}
              {data.users.filter((user) => user.role === 'admin').length} administrators
            </p>
          </div>
        </CardContent>
      </Card>

      <TableWrap>
        <Table>
          <THead>
            <tr>
              <TH>User</TH>
              <TH>Email</TH>
              <TH>Role</TH>
              <TH>Teams</TH>
              <TH>Status</TH>
              <TH className="text-center">You</TH>
              <TH className="text-center">Actions</TH>
            </tr>
          </THead>
          <TBody>
            {data.users.map((user) => (
              <TR key={user.id}>
                <TD>
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-raised text-[10px] font-bold text-ink-muted">
                      {user.displayName
                        .split(' ')
                        .map((part) => part.charAt(0))
                        .slice(0, 2)
                        .join('')}
                    </span>
                    <span className="font-medium text-ink">{user.displayName}</span>
                  </div>
                </TD>
                <TD>{user.email}</TD>
                <TD>
                  <Badge tone={ROLE_TONE[user.role]}>
                    {user.role === 'media_manager' ? 'Archived media access' : user.role.replace('_', ' ')}
                  </Badge>
                </TD>
                <TD>
                  {user.teamIds
                    .map((teamId) => data.teams.find((team) => team.id === teamId)?.shortName ?? teamId)
                    .join(', ') || '—'}
                </TD>
                <TD>
                  {user.mustChangePassword ? (
                    <Badge tone="warning">Awaiting first sign-in</Badge>
                  ) : (
                    <Badge tone="success">Active</Badge>
                  )}
                </TD>
                <TD className="text-center">
                  {currentUser?.id === user.id ? <Badge tone="success">Current</Badge> : '—'}
                </TD>
                <TD className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={actionBusy === user.id}
                      onClick={() => void sendReset(user)}
                      title="Send password reset email"
                    >
                      Reset
                    </Button>
                    {currentUser?.id !== user.id ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={actionBusy === user.id}
                        onClick={() => void toggleDisabled(user)}
                      >
                        {user.disabled ? 'Enable' : 'Disable'}
                      </Button>
                    ) : null}
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </TableWrap>

      <Dialog open={inviteOpen} onOpenChange={(open) => (!open && !busy ? setInviteOpen(false) : undefined)}>
        {inviteOpen ? (
          <DialogContent
            title={issued ? 'Invite created' : 'Invite user'}
            description={
              issued
                ? 'Share this temporary password securely. It is shown once.'
                : 'Creates a Firebase Auth account and a user profile with the chosen role.'
            }
            className="max-w-lg"
            footer={
              issued ? (
                <Button onClick={() => setInviteOpen(false)}>Done</Button>
              ) : (
                <>
                  <Button variant="ghost" onClick={() => setInviteOpen(false)} disabled={busy}>
                    Cancel
                  </Button>
                  <Button onClick={() => void invite()} disabled={busy}>
                    {busy ? 'Creating…' : 'Create invite'}
                  </Button>
                </>
              )
            }
          >
            {issued ? (
              <div className="space-y-3">
                <p className="text-sm text-ink-muted">
                  <span className="font-semibold text-ink">{issued.email}</span> will be asked to choose a new password
                  when they first sign in.
                </p>
                <div className="flex items-center justify-between gap-2 rounded-control border border-line bg-canvas/60 px-3 py-2.5">
                  <code className="break-all font-mono text-sm text-ink">{issued.password}</code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void navigator.clipboard?.writeText(issued.password)}
                  >
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    Copy
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Full name" htmlFor="invite-name">
                  <Input
                    id="invite-name"
                    value={form.displayName}
                    onChange={(event) => setForm({ ...form, displayName: event.target.value })}
                  />
                </Field>
                <Field label="Email" htmlFor="invite-email">
                  <Input
                    id="invite-email"
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm({ ...form, email: event.target.value })}
                  />
                </Field>
                <Field label="Role" htmlFor="invite-role">
                  <Select
                    label="Role"
                    value={form.role}
                    onValueChange={(value) =>
                      setForm({ ...form, role: value as UserRole, playerId: '' })
                    }
                    options={ROLE_OPTIONS}
                    className="w-full"
                  />
                </Field>
                <Field label="Team" htmlFor="invite-team" hint="Admins and media span both teams.">
                  <Select
                    label="Team"
                    value={form.teamId}
                    onValueChange={(value) => setForm({ ...form, teamId: value, playerId: '' })}
                    options={[
                      { value: 'team-men', label: 'DUT Wolves Men' },
                      { value: 'team-women', label: 'DUT Wolves Women' },
                    ]}
                    className="w-full"
                  />
                </Field>
                <Field label="Title" htmlFor="invite-title">
                  <Input
                    id="invite-title"
                    value={form.title}
                    onChange={(event) => setForm({ ...form, title: event.target.value })}
                    placeholder="e.g. Head Coach"
                  />
                </Field>
                {form.role === 'player' ? (
                  <Field label="Linked player" htmlFor="invite-player">
                    <Select
                      label="Linked player"
                      value={form.playerId || 'none'}
                      onValueChange={(value) => setForm({ ...form, playerId: value === 'none' ? '' : value })}
                      options={[
                        { value: 'none', label: 'Choose a squad member' },
                        ...playerOptions.map((player) => ({
                          value: player.id,
                          label: `${player.firstName} ${player.lastName}`,
                        })),
                      ]}
                      className="w-full"
                    />
                  </Field>
                ) : null}
                {formError ? (
                  <p className="sm:col-span-2 text-xs text-danger" role="alert">
                    {formError}
                  </p>
                ) : null}
              </div>
            )}
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  )
}
