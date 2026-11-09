import { useState } from 'react'
import { Link } from 'react-router-dom'
import { KeyRound, LogOut, ShieldCheck, UserRound } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { PlayerAvatar } from '@/components/stats/player-avatar'
import { useAuth } from '@/features/auth/AuthContext'
import { PlayerAreaGate } from '@/features/player/PlayerDashboardPage'
import { formatDate } from '@/utils/format'

export function PlayerProfilePage() {
  const { user, signOut } = useAuth()
  const [signOutOpen, setSignOutOpen] = useState(false)

  return (
    <PlayerAreaGate>
      {(ctx) => {
        const { player, team, totals } = ctx
        return (
          <div className="space-y-5">
            <PageHeader
              eyebrow="My profile"
              title="Profile"
              description="Your player record and account details. Private information is never shown on the public site."
            />

            <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Player record</CardTitle>
                  <Badge tone="success">Active</Badge>
                </CardHeader>
                <CardContent className="pt-3">
                  <div className="flex items-center gap-3">
                    <PlayerAvatar player={player} size="lg" />
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-ink">
                        {player.firstName} {player.lastName}
                      </p>
                      <p className="text-xs text-ink-muted">
                        #{player.jerseyNumber} · {player.position} · {team.name}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <Badge tone="accent">{totals.games} games</Badge>
                        <Badge tone="neutral">{totals.ppg.toFixed(1)} PPG</Badge>
                      </div>
                    </div>
                  </div>

                  <dl className="mt-4 space-y-0 text-xs">
                    {[
                      ['Jersey number', `#${player.jerseyNumber}`],
                      ['Position', player.position],
                      ['Height', player.heightCm ? `${player.heightCm} cm` : '—'],
                      ['Date of birth', player.dateOfBirth ? formatDate(player.dateOfBirth) : '—'],
                      ['Team', team.name],
                      ['Public profile', player.publicVisible ? 'Visible on public player stats' : 'Hidden'],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="flex items-center justify-between gap-3 border-b border-line py-2 last:border-0"
                      >
                        <dt className="text-ink-muted">{label}</dt>
                        <dd className="text-right font-medium text-ink">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Account</CardTitle>
                    <Badge tone="success">Signed in</Badge>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-3 text-xs">
                    <div className="flex items-center justify-between gap-3 border-b border-line pb-2">
                      <span className="text-ink-muted">Name</span>
                      <span className="font-medium text-ink">{user?.displayName}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-b border-line pb-2">
                      <span className="text-ink-muted">Email</span>
                      <span className="font-medium text-ink">{user?.email}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-ink-muted">Role</span>
                      <span className="font-medium capitalize text-ink">{user?.role}</span>
                    </div>
                    <div className="flex items-start gap-2 rounded-control border border-line bg-canvas/40 px-2.5 py-2">
                      <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden="true" />
                      <p className="text-[11px] leading-relaxed text-ink-faint">
                        Your account is managed by the team administrator. Contact them to change your email or
                        linked player record.
                      </p>
                    </div>
                    <Button variant="danger" className="w-full" onClick={() => setSignOutOpen(true)}>
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      Sign out
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Quick links</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1.5 pt-3">
                    <Button asChild variant="secondary" className="w-full justify-start">
                      <Link to="/player/stats">
                        <UserRound className="h-4 w-4" aria-hidden="true" />
                        My statistics
                      </Link>
                    </Button>
                    <Button asChild variant="secondary" className="w-full justify-start">
                      <Link to="/player/history">
                        <KeyRound className="h-4 w-4" aria-hidden="true" />
                        Match history
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>

            <Dialog open={signOutOpen} onOpenChange={setSignOutOpen}>
              <DialogContent
                title="Sign out?"
                description="You will need to sign in again to view your profile."
                footer={
                  <>
                    <Button variant="ghost" onClick={() => setSignOutOpen(false)}>
                      Cancel
                    </Button>
                    <Button variant="danger" onClick={() => void signOut()}>
                      Sign out
                    </Button>
                  </>
                }
              >
                <p className="text-sm text-ink-muted">
                  Recorded match events and statistics are kept by the team.
                </p>
              </DialogContent>
            </Dialog>
          </div>
        )
      }}
    </PlayerAreaGate>
  )
}
