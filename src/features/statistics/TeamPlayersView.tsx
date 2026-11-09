import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import type { Player } from '@/types/domain'
import type { TeamAnalytics } from '@/features/statistics/useTeamAnalytics'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { PlayerStatsTable } from '@/features/statistics/PlayerStatsTable'
import { PlayerDetailDialog } from '@/features/statistics/PlayerDetailDialog'
import { PlayerAvatar } from '@/components/stats/player-avatar'

const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C']

export function TeamPlayersView({ analytics }: { analytics: TeamAnalytics }) {
  const [query, setQuery] = useState('')
  const [position, setPosition] = useState('all')
  const [selected, setSelected] = useState<Player | null>(null)

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return analytics.playerRows.filter((row) => {
      const matchesPosition = position === 'all' || row.player.position === position
      const matchesQuery =
        !term ||
        `${row.player.firstName} ${row.player.lastName}`.toLowerCase().includes(term) ||
        String(row.player.jerseyNumber).includes(term)
      return matchesPosition && matchesQuery
    })
  }, [analytics.playerRows, position, query])

  const selectedRow = selected
    ? analytics.playerRows.find((row) => row.player.id === selected.id) ?? null
    : null

  const games =
    selected && selectedRow
      ? analytics.completed.map((match, index) => {
          const opponent = analytics.opponentById.get(
            match.homeTeamId === analytics.team.id ? match.awayTeamId : match.homeTeamId,
          )
          return {
            matchId: match.id,
            label: `vs ${opponent?.shortName ?? 'Opponent'} · Game ${index + 1}`,
            stats: selectedRow.perGame[index]!,
          }
        })
      : []

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search player or jersey number"
            className="pl-9"
            aria-label="Search players"
          />
        </div>
        <Select
          label="Filter by position"
          value={position}
          onValueChange={setPosition}
          options={[
            { value: 'all', label: 'All positions' },
            ...POSITIONS.map((value) => ({ value, label: value })),
          ]}
          className="sm:w-44"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {analytics.playerRows.slice(0, 5).map((row) => (
          <button
            key={row.player.id}
            type="button"
            onClick={() => setSelected(row.player)}
            className="flex items-center gap-2 rounded-full border border-line bg-surface px-2 py-1 transition hover:border-accent/40"
          >
            <PlayerAvatar player={row.player} size="sm" />
            <span className="text-[11px] font-medium text-ink">
              {row.player.lastName} · {row.totals.ppg.toFixed(1)} PPG
            </span>
          </button>
        ))}
      </div>

      <PlayerStatsTable rows={filtered} onSelect={setSelected} />
      <PlayerDetailDialog row={selectedRow} games={games} onClose={() => setSelected(null)} />
    </div>
  )
}
