import { Undo2 } from 'lucide-react'
import type { MatchEvent, Player } from '@/types/domain'
import { EVENT_LABELS, EVENT_POINTS, jerseyLabel } from '@/types/domain'
import { formatClock } from '@/services/analytics/stats'
import { cn } from '@/utils/cn'

export interface TimelinePlayer {
  id: string
  name: string
  jerseyNumber: number | null
}

function toTimelinePlayer(player: Player): TimelinePlayer {
  return {
    id: player.id,
    name: `${player.firstName} ${player.lastName}`,
    jerseyNumber: player.jerseyNumber,
  }
}

export function buildPlayerMap(players: Player[]): Map<string, TimelinePlayer> {
  return new Map(players.map((player) => [player.id, toTimelinePlayer(player)]))
}

interface EventTimelineProps {
  events: MatchEvent[]
  players: Map<string, TimelinePlayer>
  onVoid?: (event: MatchEvent) => void
  emptyHint?: string
  className?: string
  maxHeight?: string
}

export function EventTimeline({
  events,
  players,
  onVoid,
  emptyHint = 'Recorded actions will appear here.',
  className,
  maxHeight = 'max-h-[420px]',
}: EventTimelineProps) {
  if (events.length === 0) {
    return (
      <p className={cn('rounded-control border border-dashed border-line px-3 py-6 text-center text-xs text-ink-faint', className)}>
        {emptyHint}
      </p>
    )
  }

  return (
    <ul className={cn('scroll-thin space-y-1 overflow-y-auto pr-1', maxHeight, className)} aria-label="Event history">
      {events.map((event) => {
        const player = event.playerId ? players.get(event.playerId) : undefined
        const points = event.points ?? EVENT_POINTS[event.type] ?? 0
        return (
          <li
            key={event.id}
            className={cn(
              'flex items-center gap-2 rounded-control border border-line/70 bg-canvas/40 px-2.5 py-2',
              event.voided && 'opacity-45',
            )}
          >
            <span className="stat-num w-10 shrink-0 text-[11px] text-ink-faint">
              {formatClock(event.clockSeconds)}
            </span>
            <span className="shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-[9px] font-bold text-ink-faint">
              Q{event.period}
            </span>
            <div className="min-w-0 flex-1">
              <p className={cn('truncate text-xs font-medium text-ink', event.voided && 'line-through')}>
                {player ? `${jerseyLabel(player.jerseyNumber)} ${player.name}` : 'Team'}
              </p>
              <p className="truncate text-[11px] text-ink-muted">
                {EVENT_LABELS[event.type]}
                {points > 0 ? ` · +${points}` : ''}
                {event.voided ? ' · voided' : ''}
              </p>
            </div>
            {onVoid && !event.voided ? (
              <button
                type="button"
                onClick={() => onVoid(event)}
                className="shrink-0 rounded-md border border-line p-1.5 text-ink-faint transition hover:border-danger/40 hover:text-danger"
                aria-label={`Void ${EVENT_LABELS[event.type]} for ${player?.name ?? 'team'}`}
                title="Void this event"
              >
                <Undo2 className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
