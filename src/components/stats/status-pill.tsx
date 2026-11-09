import type { MatchStatus } from '@/types/domain'
import { cn } from '@/utils/cn'

const LABELS: Record<MatchStatus, string> = {
  scheduled: 'Scheduled',
  live: 'Live',
  paused: 'Paused',
  completed: 'Final',
  postponed: 'Postponed',
}

export function StatusPill({ status, className }: { status: MatchStatus; className?: string }) {
  const live = status === 'live'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
        live && 'border-danger/40 bg-danger/10 text-danger',
        status === 'paused' && 'border-warning/40 bg-warning/10 text-warning',
        status === 'completed' && 'border-line bg-white/5 text-ink-muted',
        status === 'scheduled' && 'border-accent/30 bg-accent/10 text-accent',
        status === 'postponed' && 'border-danger/30 bg-danger/10 text-danger',
        className,
      )}
    >
      {live ? <span className="h-1.5 w-1.5 animate-pulse-live rounded-full bg-danger" /> : null}
      {LABELS[status]}
    </span>
  )
}
