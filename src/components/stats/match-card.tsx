import { MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Match, Team } from '@/types/domain'
import { formatDate, formatTime } from '@/utils/format'
import { cn } from '@/utils/cn'
import { StatusPill } from './status-pill'

interface MatchCardProps {
  match: Match
  homeTeam: Team
  awayTeam: Team
  homeScore?: number
  awayScore?: number
  to?: string
  className?: string
}

export function MatchCard({
  match,
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  to,
  className,
}: MatchCardProps) {
  const completed = match.status === 'completed'
  const homeWon = completed && (homeScore ?? 0) > (awayScore ?? 0)
  const awayWon = completed && (awayScore ?? 0) > (homeScore ?? 0)

  const inner = (
    <div
      className={cn(
        'group h-full rounded-card border border-line bg-surface p-4 shadow-card transition-colors hover:border-white/20',
        match.status === 'live' && 'border-danger/30',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
          {match.round ?? 'Fixture'}
        </span>
        <StatusPill status={match.status} />
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <span className={cn('truncate text-sm font-medium', homeWon ? 'text-ink' : 'text-ink-muted')}>
            {homeTeam.name}
          </span>
          {homeScore !== undefined ? (
            <span className={cn('stat-num text-lg', homeWon ? 'text-ink' : 'text-ink-muted')}>{homeScore}</span>
          ) : null}
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className={cn('truncate text-sm font-medium', awayWon ? 'text-ink' : 'text-ink-muted')}>
            {awayTeam.name}
          </span>
          {awayScore !== undefined ? (
            <span className={cn('stat-num text-lg', awayWon ? 'text-ink' : 'text-ink-muted')}>{awayScore}</span>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-2.5 text-[11px] text-ink-faint">
        <span>
          {formatDate(match.tipoff)} · {formatTime(match.tipoff)}
        </span>
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3 w-3" aria-hidden="true" />
          <span className="truncate">{match.venue}</span>
        </span>
      </div>
    </div>
  )

  if (!to) return inner

  return (
    <Link to={to} className="block h-full rounded-card focus-visible:ring-2 focus-visible:ring-accent/60">
      {inner}
    </Link>
  )
}
