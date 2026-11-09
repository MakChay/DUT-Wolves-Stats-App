import { useEffect, useState } from 'react'
import { Cloud, Database, RefreshCw, ShieldAlert, Trash2 } from 'lucide-react'
import { probeFirestore, type ConnectionStatus } from '@/services/firebase/connection'
import { firebaseConfig } from '@/services/firebase/config'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/features/auth/AuthContext'
import { dataMode } from '@/services/repositories'

function ConnectionsCard() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null)
  const [checking, setChecking] = useState(false)

  const check = async () => {
    setChecking(true)
    setStatus(await probeFirestore())
    setChecking(false)
  }

  useEffect(() => {
    void check()
  }, [])

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Connections</CardTitle>
          <p className="mt-0.5 text-xs text-ink-muted">Firebase project and media storage</p>
        </div>
        <Cloud className="h-4 w-4 text-ink-faint" aria-hidden="true" />
      </CardHeader>
      <CardContent className="space-y-3 pt-3 text-xs text-ink-muted">
        <div className="flex items-center justify-between gap-3 border-b border-line pb-2">
          <span>Firebase project</span>
          <span className="font-medium text-ink">{firebaseConfig.projectId || 'Not configured'}</span>
        </div>
        <div className="flex items-center justify-between gap-3 border-b border-line pb-2">
          <span>Firestore</span>
          <span className="flex items-center gap-2">
            <Badge tone={status?.ok ? 'success' : status ? 'danger' : 'neutral'}>
              {checking ? 'Checking' : status?.ok ? 'Reachable' : status ? 'Unavailable' : '—'}
            </Badge>
          </span>
        </div>
        <p className="text-[11px] leading-relaxed text-ink-faint">{status?.message}</p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button variant="secondary" size="sm" onClick={check} disabled={checking}>
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Test connection
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function ManagerSettingsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [resetOpen, setResetOpen] = useState(false)

  const resetDemoData = () => {
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith('dws.'))
      .forEach((key) => window.localStorage.removeItem(key))
    setResetOpen(false)
    toast({
      title: 'Demo data reset',
      description: 'Locally recorded events and match overrides were cleared. Reloading…',
      tone: 'success',
    })
    window.setTimeout(() => window.location.assign('/login'), 700)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Settings"
        title="Workspace settings"
        description="Data source, connections and your sign-in details."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Data mode</CardTitle>
              <p className="mt-0.5 text-xs text-ink-muted">Where this build reads and writes data</p>
            </div>
            <Badge tone="warning">{dataMode === 'mock' ? 'Mock' : 'Firebase'}</Badge>
          </CardHeader>
          <CardContent className="space-y-3 pt-3 text-xs leading-relaxed text-ink-muted">
            <div className="flex items-start gap-2 rounded-control border border-line bg-canvas/40 px-3 py-2.5">
              <Database className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
              <p>
                All reads and writes pass through the repository interfaces in{' '}
                <code className="text-ink-muted">src/services/repositories</code>. Swapping in Firestore
                later does not require page rewrites.
              </p>
            </div>
            <div className="flex items-start gap-2 rounded-control border border-line bg-canvas/40 px-3 py-2.5">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
              <p>
                Access is enforced by Firestore security rules. Changes to official records are audited
                with your name and the time.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Signed-in account</CardTitle>
              <p className="mt-0.5 text-xs text-ink-muted">Current identity</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pt-3 text-xs text-ink-muted">
            <div className="flex items-center justify-between gap-3 border-b border-line pb-2">
              <span>Name</span>
              <span className="font-medium text-ink">{user?.displayName}</span>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-line pb-2">
              <span>Email</span>
              <span className="font-medium text-ink">{user?.email}</span>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-line pb-2">
              <span>Role</span>
              <span className="font-medium capitalize text-ink">{user?.role}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Teams</span>
              <span className="font-medium text-ink">{user?.teamIds.length ?? 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <ConnectionsCard />

      {dataMode === 'mock' ? (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Offline mock data</CardTitle>
              <p className="mt-0.5 text-xs text-ink-muted">
                Only used when VITE_DATA_MODE=mock. Clears records kept in this browser.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-3">
            <p className="text-xs leading-relaxed text-ink-muted">
              Resetting removes every localStorage key starting with <code>dws.</code> and restores the seeded
              mock dataset. It cannot be undone.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="danger" onClick={() => setResetOpen(true)}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Reset mock data
              </Button>
              <Button variant="secondary" onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Reload app
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent
          title="Reset mock data?"
          description="Local mock events, score corrections and team scope will be permanently cleared."
          footer={
            <>
              <Button variant="ghost" onClick={() => setResetOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={resetDemoData}>
                Reset and reload
              </Button>
            </>
          }
        >
          <p className="text-sm text-ink-muted">
            The seeded mock dataset will be restored on reload. Mock events recorded in this browser will be lost.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  )
}
