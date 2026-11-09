import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LogIn, ShieldCheck, Users } from 'lucide-react'
import { BrandMark } from '@/components/brand/brand-mark'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input, Field } from '@/components/ui/input'
import { homePathForRole, useAuth } from '@/features/auth/AuthContext'
import { ChangePasswordForm } from '@/features/auth/ChangePasswordForm'
import { WolfWatermark } from '@/components/brand/wolf-watermark'

export function LoginPage() {
  const { user, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const destination =
    (location.state as { from?: string } | null)?.from ?? (user ? homePathForRole(user) : '/')

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setBusy(true)
    const result = await signIn(email, password)
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    if (!result.user.mustChangePassword) {
      navigate((location.state as { from?: string } | null)?.from ?? homePathForRole(result.user))
    }
  }

  return (
    <div className="grid min-h-dvh bg-canvas lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden border-r border-line bg-sidebar p-10 lg:flex lg:flex-col lg:justify-between">
        <WolfWatermark opacity={0.08} />
        <div className="absolute -right-24 top-24 h-72 w-72 rounded-full bg-accent/10 blur-3xl" aria-hidden="true" />
        <div className="relative">
          <Link to="/" className="inline-flex items-center gap-3">
            <BrandMark size="lg" />
            <span className="leading-none">
              <span className="block text-sm font-bold tracking-[0.16em] text-ink">DUT WOLVES</span>
              <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.32em] text-accent">
                Stats
              </span>
            </span>
          </Link>

          <h1 className="mt-16 max-w-md text-4xl font-bold leading-tight tracking-tight text-ink text-balance">
            Basketball operations, without the clipboard chaos.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-muted">
            Live stat capture, box scores, player development and tournament reporting for the DUT Wolves
            men's and women's programmes.
          </p>

          <div className="mt-10 grid max-w-md grid-cols-2 gap-3">
            {[
              ['2', 'DUT squads'],
              ['36', 'Registered players'],
              ['10', 'Opponent teams'],
              ['100%', 'Event-sourced'],
            ].map(([value, label]) => (
              <div key={label} className="rounded-card border border-line bg-surface/70 p-3">
                <p className="stat-num text-xl text-ink">{value}</p>
                <p className="mt-0.5 text-[11px] uppercase tracking-wider text-ink-faint">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative max-w-md text-[11px] leading-relaxed text-ink-faint">
          Built for courtside use on phones and tablets. Accounts, rosters and match records are stored
          in Firebase. Access is role-based and audited.
        </p>
      </section>

      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <BrandMark />
            <span className="text-sm font-bold tracking-[0.14em] text-ink">DUT WOLVES STATS</span>
          </div>

          <Badge tone="accent" className="mb-4">
            <ShieldCheck className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            Secure workspace sign-in
          </Badge>
          <h2 className="text-2xl font-bold tracking-tight text-ink">
            {user?.mustChangePassword ? 'Choose your password' : 'Sign in to your workspace'}
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
            {user?.mustChangePassword
              ? `Signed in as ${user.email}. Set a new password to activate your account.`
              : 'Use the email address your administrator invited. New accounts set their password on first sign-in.'}
          </p>

          {user && !user.mustChangePassword ? (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-card border border-accent/25 bg-accent/[0.06] px-3 py-2.5">
              <p className="text-xs text-ink-muted">
                Signed in as <span className="font-semibold text-ink">{user.displayName}</span>
              </p>
              <Button size="sm" onClick={() => navigate(homePathForRole(user))}>
                Continue
              </Button>
            </div>
          ) : null}

          <div className="mt-5">
            {user?.mustChangePassword ? (
              <ChangePasswordForm onDone={() => navigate(destination)} />
            ) : (
              <form onSubmit={submit} className="space-y-3">
                <Field label="Email address" htmlFor="login-email">
                  <Input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    autoComplete="username"
                    required
                  />
                </Field>
                <Field label="Password" htmlFor="login-password">
                  <Input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Your password"
                    autoComplete="current-password"
                    required
                  />
                </Field>
                {error ? (
                  <p className="text-xs text-danger" role="alert">
                    {error}
                  </p>
                ) : null}
                <Button type="submit" disabled={busy} className="w-full">
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                  {busy ? 'Signing in…' : 'Sign in'}
                </Button>
              </form>
            )}
          </div>

          <div className="mt-6 flex items-center justify-between gap-3 text-xs">
            <Link to="/" className="inline-flex items-center gap-1.5 text-ink-muted transition hover:text-ink">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              Public site
            </Link>
            <span className="text-ink-faint">No account? Ask an administrator for an invite.</span>
          </div>
        </div>
      </section>
    </div>
  )
}
