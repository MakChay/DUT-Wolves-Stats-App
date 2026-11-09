import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, Home, RefreshCw } from 'lucide-react'
import { BrandMark } from '@/components/brand/brand-mark'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

/**
 * Keeps a render or Firestore failure from blanking the workspace during a
 * match. The fallback is deliberately dependency-free so it renders even when
 * the rest of the tree cannot.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('DUT Wolves Stats crashed', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-10">
        <div className="w-full max-w-lg rounded-card border border-line bg-surface p-6 shadow-card">
          <BrandMark size="lg" />
          <div className="mt-5 flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control border border-danger/30 bg-danger/10 text-danger">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-ink">Something went wrong</h1>
              <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                The workspace hit an unexpected error. Your saved match data is safe. Reload the app, or
                return to the public site.
              </p>
            </div>
          </div>
          <p className="mt-4 rounded-control border border-line bg-canvas/50 px-3 py-2 font-mono text-[11px] leading-relaxed text-ink-faint">
            {this.state.error.message || 'Unknown error'}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Reload app
            </Button>
            <Button asChild variant="secondary">
              <a href="/">
                <Home className="h-4 w-4" aria-hidden="true" />
                Public site
              </a>
            </Button>
          </div>
        </div>
      </div>
    )
  }
}
