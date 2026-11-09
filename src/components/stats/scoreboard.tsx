import type { MatchStatus, Team } from '@/types/domain'
import { formatClock } from '@/services/analytics/stats'
import { cn } from '@/utils/cn'
import { StatusPill } from './status-pill'

interface ScoreboardProps {
  homeTeam: Pick<Team, 'name' | 'shortName'>
  awayTeam: Pick<Team, 'name' | 'shortName'>
  homeScore: number
  awayScore: number
  period: number
  clockSeconds: number
  status: MatchStatus
  competition?: string
  compact?: boolean
  className?: string
}

export function Scoreboard({
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  period,
  clockSeconds,
  status,
  competition,
  compact,
  className,
}: ScoreboardProps) {
  const leadingHome = homeScore > awayScore
  const leadingAway = awayScore > homeScore
  const isLive = status === 'live' || status === 'paused'

  return (
    <div
      className={cn(
        'overflow-hidden rounded-card border border-line bg-surface shadow-card',
        status === 'live' && 'border-danger/25',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
        <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
          {competition ?? 'Match'}
        </p>
        <StatusPill status={status} />
      </div>

      <div className={cn('grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3', compact ? 'py-4' : 'py-5 sm:px-6')}>
        <div className="min-w-0 text-right">
          <p className={cn('truncate font-semibold text-ink', compact ? 'text-xs' : 'text-sm sm:text-base')}>
            {compact ? homeTeam.shortName : homeTeam.name}
          </p>
          <p
            className={cn(
              'stat-num leading-none',
              compact ? 'mt-1 text-3xl' : 'mt-2 text-5xl sm:text-6xl',
              leadingHome ? 'text-ink' : 'text-ink-muted',
            )}
          >
            {homeScore}
          </p>
        </div>

        <div className="flex min-w-[76px] flex-col items-center gap-1">
          <span className="rounded-md border border-line bg-canvas/70 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-ink-muted">
            Q{period}
          </span>
          <span
            className={cn(
              'stat-num text-lg text-ink',
              isLive && 'text-danger',
            )}
          >
            {formatClock(clockSeconds)}
          </span>
          {status === 'completed' ? (
            <span className="text-[10px] uppercase tracking-wider text-ink-faint">Full time</span>
          ) : null}
        </div>

        <div className="min-w-0">
          <p className={cn('truncate font-semibold text-ink', compact ? 'text-xs' : 'text-sm sm:text-base')}>
            {compact ? awayTeam.shortName : awayTeam.name}
          </p>
          <p
            className={cn(
              'stat-num leading-none',
              compact ? 'mt-1 text-3xl' : 'mt-2 text-5xl sm:text-6xl',
              leadingAway ? 'text-ink' : 'text-ink-muted',
            )}
          >
            {awayScore}
          </p>
        </div>
      </div>
    </div>
  )
}
