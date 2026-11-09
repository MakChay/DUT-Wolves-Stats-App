import type { Player } from '@/types/domain'
import type { PlayerSeasonRow } from '@/features/statistics/useTeamAnalytics'
import { Table, TableWrap, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { cn } from '@/utils/cn'

interface PlayerStatsTableProps {
  rows: PlayerSeasonRow[]
  onSelect?: (player: Player) => void
  className?: string
}

export function PlayerStatsTable({ rows, onSelect, className }: PlayerStatsTableProps) {
  if (rows.length === 0) {
    return (
      <p className="rounded-card border border-dashed border-line px-4 py-10 text-center text-xs text-ink-faint">
        No player statistics yet. Complete a match to generate box scores.
      </p>
    )
  }

  return (
    <TableWrap className={className}>
      <Table>
        <THead>
          <tr>
            <TH className="w-8">#</TH>
            <TH>Player</TH>
            <TH className="text-center">GP</TH>
            <TH className="text-center">PPG</TH>
            <TH className="text-center">RPG</TH>
            <TH className="text-center">APG</TH>
            <TH className="text-center">SPG</TH>
            <TH className="text-center">BPG</TH>
            <TH className="text-center">TO</TH>
            <TH className="text-center">FG%</TH>
            <TH className="text-center">3P%</TH>
            <TH className="text-center">FT%</TH>
          </tr>
        </THead>
        <TBody>
          {rows.map((row) => (
            <TR
              key={row.player.id}
              className={cn(onSelect && 'cursor-pointer')}
              onClick={onSelect ? () => onSelect(row.player) : undefined}
            >
              <TD className="stat-num text-ink-faint">{row.player.jerseyNumber}</TD>
              <TD>
                <div className="min-w-[150px]">
                  <p className="font-medium text-ink">
                    {row.player.firstName} {row.player.lastName}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-ink-faint">
                    {row.player.position} · {row.player.heightCm ? `${row.player.heightCm} cm` : '—'}
                  </p>
                </div>
              </TD>
              <TD className="stat-num text-center text-ink">{row.totals.games}</TD>
              <TD className="stat-num text-center text-ink">{row.totals.ppg.toFixed(1)}</TD>
              <TD className="stat-num text-center">{row.totals.rpg.toFixed(1)}</TD>
              <TD className="stat-num text-center">{row.totals.apg.toFixed(1)}</TD>
              <TD className="stat-num text-center">{row.totals.steals}</TD>
              <TD className="stat-num text-center">{row.totals.blocks}</TD>
              <TD className="stat-num text-center">{row.totals.turnovers}</TD>
              <TD className="stat-num text-center">{row.totals.fgPct}%</TD>
              <TD className="stat-num text-center">{row.totals.tpPct}%</TD>
              <TD className="stat-num text-center">{row.totals.ftPct}%</TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </TableWrap>
  )
}
