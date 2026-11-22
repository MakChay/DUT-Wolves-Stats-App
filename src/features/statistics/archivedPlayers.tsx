import { useSearchParams } from 'react-router-dom'
import type { PlayerSeasonRow } from '@/features/statistics/useTeamAnalytics'

/**
 * A player is archived when the manager removed them from the selected squad.
 * Coach screens hide these players by default; they are only revealed when a
 * coach explicitly opts in.
 */
export function isArchivedPlayer(player: {
  archivedAt?: string | null
  availability?: string
}): boolean {
  return Boolean(player.archivedAt) || player.availability === 'inactive'
}

/** `?archived=1` is shared across coach screens so the opt-in survives navigation. */
export function useArchivedPlayers(): [boolean, (next: boolean) => void] {
  const [params, setParams] = useSearchParams()
  const showArchived = params.get('archived') === '1'
  const setShowArchived = (next: boolean) => {
    const updated = new URLSearchParams(params)
    if (next) updated.set('archived', '1')
    else updated.delete('archived')
    setParams(updated, { replace: true })
  }
  return [showArchived, setShowArchived]
}

/** Apply the coach opt-in to player season rows. */
export function visiblePlayerRows(
  rows: PlayerSeasonRow[],
  showArchived: boolean,
): PlayerSeasonRow[] {
  return showArchived ? rows : rows.filter((row) => !isArchivedPlayer(row.player))
}

export function ArchivedPlayersToggle({
  showArchived,
  onChange,
}: {
  showArchived: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[11px] text-ink-muted">
      <input
        type="checkbox"
        className="h-4 w-4 accent-[rgb(var(--color-accent))]"
        checked={showArchived}
        onChange={(event) => onChange(event.target.checked)}
      />
      Show archived players
    </label>
  )
}

export function ArchivedSummary({ hidden, showArchived }: { hidden: number; showArchived: boolean }) {
  if (showArchived) return null
  return (
    <p className="text-[11px] text-ink-faint">
      {hidden} archived player{hidden === 1 ? '' : 's'} hidden. Tick “Show archived players” to
      include their statistics.
    </p>
  )
}
