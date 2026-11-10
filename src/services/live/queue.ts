import type { MatchEvent } from '@/types/domain'

const PREFIX = 'dws.liveQueue.v1.'

function key(matchId: string): string {
  return `${PREFIX}${matchId}`
}

/**
 * Durable per-match event queue for courtside use. Events are written here
 * before any network attempt, so a reload or dropped connection cannot lose a
 * scorekeeper action. The server write remains idempotent by clientEventId.
 */
export function readQueuedEvents(matchId: string): MatchEvent[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(key(matchId))
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as MatchEvent[]) : []
  } catch {
    return []
  }
}

function writeQueue(matchId: string, events: MatchEvent[]): void {
  if (typeof window === 'undefined') return
  try {
    if (events.length === 0) window.localStorage.removeItem(key(matchId))
    else window.localStorage.setItem(key(matchId), JSON.stringify(events))
  } catch {
    // Storage can be unavailable or full; the in-memory event still exists.
  }
}

export function enqueueEvent(matchId: string, event: MatchEvent): void {
  const queue = readQueuedEvents(matchId)
  if (queue.some((entry) => entry.id === event.id)) return
  writeQueue(matchId, [...queue, event])
}

export function dequeueEvent(matchId: string, eventId: string): void {
  writeQueue(
    matchId,
    readQueuedEvents(matchId).filter((entry) => entry.id !== eventId),
  )
}

export function isEventQueued(matchId: string, eventId: string): boolean {
  return readQueuedEvents(matchId).some((entry) => entry.id === eventId)
}

export function clearEventQueue(matchId: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(key(matchId))
  } catch {
    // Ignore storage failures.
  }
}
