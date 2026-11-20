import { Moon, Sun, Menu, X, Camera } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { publicNav } from '@/app/navigation'
import { BrandMark } from '@/components/brand/brand-mark'
import { WolfWatermark } from '@/components/brand/wolf-watermark'
import { Button } from '@/components/ui/button'
import { homePathForRole, useAuth } from '@/features/auth/AuthContext'
import { InstallAppButton } from '@/features/pwa/InstallAppButton'
import { useTheme } from '@/features/theme/ThemeContext'
import { cn } from '@/utils/cn'

export function PublicLayout() {
  const { user } = useAuth()
  const { theme, toggle } = useTheme()
  const { search } = useLocation()
  const [open, setOpen] = useState(false)

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="sticky top-0 z-50 border-b border-line bg-canvas/80 shadow-card backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
            <BrandMark />
            <span className="leading-none">
              <span className="block text-[13px] font-bold tracking-[0.14em] text-ink">DUT WOLVES</span>
              <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">
                Stats
              </span>
            </span>
          </Link>

          <nav className="ml-auto hidden items-center gap-0.5 lg:flex" aria-label="Public navigation">
            {publicNav.map((item) => (
              <NavLink
                key={item.to}
                to={{ pathname: item.to, search }}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-control px-2.5 py-2 text-xs font-semibold transition-colors',
                    isActive
                      ? 'bg-white/[0.06] text-ink'
                      : 'text-ink-muted hover:bg-white/[0.04] hover:text-ink',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 lg:ml-2">
            <InstallAppButton />
            <button
              type="button"
              onClick={toggle}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              className="rounded-control border border-line p-2 text-ink-muted transition hover:text-ink"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            {user ? (
              <Button asChild size="sm">
                <Link to={homePathForRole(user)}>Open workspace</Link>
              </Button>
            ) : (
              <Button asChild size="sm">
                <Link to="/login">Sign in</Link>
              </Button>
            )}
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="rounded-control border border-line p-2 text-ink-muted transition hover:text-ink lg:hidden"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {open ? (
          <nav className="border-t border-line bg-sidebar px-4 py-3 lg:hidden" aria-label="Public navigation mobile">
            <div className="grid grid-cols-2 gap-1">
              {publicNav.map((item) => (
                <NavLink
                  key={item.to}
                  to={{ pathname: item.to, search }}
                  end={item.end}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 rounded-control px-2.5 py-2.5 text-sm font-medium transition-colors',
                      isActive ? 'bg-accent/10 text-accent' : 'text-ink-muted hover:bg-white/5 hover:text-ink',
                    )
                  }
                >
                  <item.icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </nav>
        ) : null}
      </header>

      <main className="relative isolate mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <WolfWatermark opacity={0.035} />
        <div className="relative z-10">
          <Outlet />
        </div>
      </main>

      <footer className="border-t border-line bg-sidebar">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <BrandMark size="sm" />
            <div>
              <p className="text-xs font-semibold text-ink">DUT Wolves Stats</p>
              <p className="text-[11px] text-ink-faint">Basketball operations for Durban University of Technology</p>
            </div>
          </div>
          <p className="text-[11px] leading-relaxed text-ink-faint">
            DUT Wolves Basketball · Digital experience by QM Web Designs
          </p>
          <a
            href="https://www.instagram.com/dut_wolves/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted transition hover:text-accent"
            aria-label="Follow DUT Wolves on Instagram (opens in a new tab)"
          >
            <Camera className="h-4 w-4" aria-hidden="true" />
            @dut_wolves
          </a>
        </div>
      </footer>
    </div>
  )
}
