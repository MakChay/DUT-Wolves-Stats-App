import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ChevronDown, ExternalLink, KeyRound, LogOut, Menu, Moon, Sun, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import type { RoleArea } from '@/app/navigation'
import { BrandMark } from '@/components/brand/brand-mark'
import { WolfWatermark } from '@/components/brand/wolf-watermark'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useAuth } from '@/features/auth/AuthContext'
import { ChangePasswordForm } from '@/features/auth/ChangePasswordForm'
import { dataMode } from '@/services/repositories'
import { useTheme } from '@/features/theme/ThemeContext'
import { useTeamScope } from '@/features/teams/TeamScopeContext'
import { cn } from '@/utils/cn'

function SidebarBody({ area, onNavigate }: { area: RoleArea; onNavigate?: () => void }) {
  const { teams, teamId, setTeamId } = useTeamScope()

  return (
    <div className="flex h-full flex-col">
      <Link
        to={area.base}
        onClick={onNavigate}
        className="flex h-16 items-center gap-2.5 border-b border-line px-4"
      >
        <BrandMark />
        <span className="leading-none">
          <span className="block text-[13px] font-bold tracking-[0.14em] text-ink">DUT WOLVES</span>
          <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">
            Stats
          </span>
        </span>
      </Link>

      <div className="border-b border-line px-3 py-3">
        <p className="label-caps mb-1.5">Team scope</p>
        {teams.length > 0 ? (
          <Select
            label="Team scope"
            value={teamId ?? ''}
            onValueChange={setTeamId}
            options={teams.map((team) => ({ value: team.id, label: team.name }))}
            className="w-full"
          />
        ) : (
          <p className="rounded-control border border-dashed border-line px-2.5 py-2 text-xs text-ink-faint">
            No teams assigned
          </p>
        )}
      </div>

      <nav className="scroll-thin flex-1 space-y-0.5 overflow-y-auto px-2 py-3" aria-label={`${area.label} navigation`}>
        {area.items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-2.5 rounded-control border-l-2 px-2.5 py-2 text-[13px] font-medium transition-colors',
                isActive
                  ? 'border-accent bg-accent/10 text-ink'
                  : 'border-transparent text-ink-muted hover:bg-white/[0.04] hover:text-ink',
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={cn('h-4 w-4 shrink-0', isActive ? 'text-accent' : 'text-ink-faint')}
                  aria-hidden="true"
                />
                <span className="truncate">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-2 border-t border-line p-3">
        <div className="flex items-center gap-2 text-[11px] font-medium text-ink-muted">
          <span className={cn('h-1.5 w-1.5 rounded-full', dataMode === 'firebase' ? 'bg-success' : 'bg-warning')} />
          {dataMode === 'firebase' ? 'Firestore · connected' : 'Offline mock data'}
        </div>
        <p className="text-[10px] leading-relaxed text-ink-faint">
          {dataMode === 'firebase'
            ? 'Signed in with Firebase Auth. Changes are stored in Firestore and synced across devices.'
            : 'VITE_DATA_MODE=mock. Records stay in this browser only.'}
        </p>
      </div>
    </div>
  )
}

export function AppShell({ area }: { area: RoleArea }) {
  const { user, signOut } = useAuth()
  const { theme, toggle } = useTheme()
  const { team } = useTeamScope()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  const initials = user?.displayName
    .split(' ')
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase()

  if (user?.mustChangePassword) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-10">
        <div className="w-full max-w-md rounded-card border border-line bg-surface p-6 shadow-card">
          <BrandMark />
          <h1 className="mt-4 text-xl font-bold text-ink">Activate your account</h1>
          <p className="mb-4 mt-1 text-sm text-ink-muted">
            {user.displayName}, set a new password before using the workspace.
          </p>
          <ChangePasswordForm />
          <Button variant="ghost" className="mt-3 w-full" onClick={() => void signOut()}>
            Sign out
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh bg-canvas">
      <aside className="relative sticky top-0 hidden h-dvh w-[264px] shrink-0 border-r border-line bg-sidebar lg:block">
        <WolfWatermark opacity={0.05} />
        <div className="relative z-10 h-full">
          <SidebarBody area={area} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-line bg-canvas/95 px-4 backdrop-blur lg:px-8">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-control border border-line p-2 text-ink-muted transition hover:text-ink lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <p className="label-caps truncate">{area.label}</p>
            <p className="truncate text-sm font-semibold text-ink">{team?.name ?? 'All teams'}</p>
          </div>

          <Badge tone={dataMode === 'firebase' ? 'success' : 'warning'} className="hidden sm:inline-flex">
            {dataMode === 'firebase' ? 'Live data' : 'Mock data'}
          </Badge>

          <button
            type="button"
            onClick={toggle}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="rounded-control border border-line p-2 text-ink-muted transition hover:text-ink"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-control border border-line bg-surface px-2 py-1.5 text-left transition hover:border-white/20"
                aria-label="Account menu"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/15 text-[11px] font-bold text-accent">
                  {initials || 'DW'}
                </span>
                <span className="hidden min-w-0 sm:block">
                  <span className="block max-w-[150px] truncate text-xs font-semibold text-ink">
                    {user?.displayName}
                  </span>
                  <span className="block text-[10px] capitalize text-ink-faint">{user?.role}</span>
                </span>
                <ChevronDown className="hidden h-3.5 w-3.5 text-ink-faint sm:block" aria-hidden="true" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={6}
                className="z-[90] w-56 rounded-card border border-line bg-surface-raised p-1.5 shadow-card"
              >
                <div className="px-2 py-2">
                  <p className="text-sm font-semibold text-ink">{user?.displayName}</p>
                  <p className="truncate text-[11px] text-ink-faint">{user?.email}</p>
                </div>
                <DropdownMenu.Separator className="my-1 h-px bg-line" />
                <DropdownMenu.Item asChild>
                  <Link
                    to="/"
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-xs font-medium text-ink-muted outline-none transition hover:bg-white/5 hover:text-ink"
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    View public site
                  </Link>
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={() => setPasswordOpen(true)}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-xs font-medium text-ink-muted outline-none transition hover:bg-surface-hover hover:text-ink"
                >
                  <KeyRound className="h-4 w-4" aria-hidden="true" />
                  Change password
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="my-1 h-px bg-line" />
                <DropdownMenu.Item
                  onSelect={() => void signOut()}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-xs font-medium text-danger outline-none transition hover:bg-danger/10"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Sign out
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </header>

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>

      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent title="Change password" description="Use at least 8 characters.">
          <ChangePasswordForm onDone={() => setPasswordOpen(false)} />
        </DialogContent>
      </Dialog>

      <DialogPrimitive.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm lg:hidden" />
          <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-[71] w-[286px] border-r border-line bg-sidebar shadow-card lg:hidden">
            <DialogPrimitive.Title className="sr-only">Navigation</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              Main navigation for {area.label}
            </DialogPrimitive.Description>
            <DialogPrimitive.Close
              className="absolute right-3 top-4 rounded-md p-1.5 text-ink-faint transition hover:bg-white/5 hover:text-ink"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
            <SidebarBody area={area} onNavigate={() => setMobileOpen(false)} />
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  )
}
