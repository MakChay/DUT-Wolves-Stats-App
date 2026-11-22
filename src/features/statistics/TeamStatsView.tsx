import { useState, type ReactNode } from 'react'
import type { Player } from '@/types/domain'
import { derivePlayerGameStats } from '@/services/analytics/stats'
import type { PlayerSeasonRow, TeamAnalytics } from '@/features/statistics/useTeamAnalytics'
import { StatCard } from '@/components/stats/stat-card'
import { DonutStat } from '@/components/stats/charts'
import { PlayerStatsTable } from '@/features/statistics/PlayerStatsTable'
import { PlayerDetailDialog } from '@/features/statistics/PlayerDetailDialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableWrap, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { formatDate } from '@/utils/format'

export function TeamStatsView({
  analytics,
  playerRows: rows,
  control,
}: {
  analytics: TeamAnalytics
  playerRows?: PlayerSeasonRow[]
  control?: ReactNode
}) {
  const [selected, setSelected] = useState<Player | null>(null)
  const { teamTotals, completed, eventsByMatch, opponentById, record } = analytics
  const playerRows = rows ?? analytics.playerRows

  const selectedRow = selected
    ? playerRows.find((row) => row.player.id === selected.id) ?? null
    : null

  const games =
    selected && selectedRow
      ? completed.map((match, index) => {
          const opponent = opponentById.get(
            match.homeTeamId === analytics.team.id ? match.awayTeamId : match.homeTeamId,
          )
          return {
            matchId: match.id,
            label: `vs ${opponent?.shortName ?? 'Opponent'} · ${formatDate(match.tipoff, { day: 'numeric', month: 'short' })}`,
            stats:
              selectedRow.perGame[index] ??
              derivePlayerGameStats(
                eventsByMatch.get(match.id) ?? [],
                selected.id,
                analytics.team.id,
                match.id,
              ),
          }
        })
      : []

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Points per game"
          value={record.ppg.toFixed(1)}
          hint={`${record.pointsFor} total points`}
          accent
        />
        <StatCard
          label="Field goal %"
          value={`${teamTotals.fgPct}%`}
          hint={`${teamTotals.fgm}/${teamTotals.fga} attempts`}
        />
        <StatCard
          label="Rebounds per game"
          value={teamTotals.rpg.toFixed(1)}
          hint={`${teamTotals.rebounds} total rebounds`}
        />
        <StatCard
          label="Assists per game"
          value={teamTotals.apg.toFixed(1)}
          hint={`${teamTotals.assists} total assists`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Shooting splits</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-3">
            <DonutStat
              value={teamTotals.fgPct}
              label="Field goals"
              sublabel={`${teamTotals.fgm}/${teamTotals.fga}`}
            />
            <DonutStat
              value={teamTotals.tpPct}
              label="Three points"
              sublabel={`${teamTotals.tpm}/${teamTotals.tpa}`}
            />
            <DonutStat
              value={teamTotals.ftPct}
              label="Free throws"
              sublabel={`${teamTotals.ftm}/${teamTotals.fta}`}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team totals</CardTitle>
            <span className="text-[11px] text-ink-faint">{completed.length} completed games</span>
          </CardHeader>
          <CardContent className="pt-2">
            <TableWrap>
              <Table>
                <THead>
                  <tr>
                    <TH>Metric</TH>
                    <TH className="text-center">Total</TH>
                    <TH className="text-center">Per game</TH>
                  </tr>
                </THead>
                <TBody>
                  {[
                    ['Points', teamTotals.points, record.ppg],
                    ['Rebounds', teamTotals.rebounds, teamTotals.rpg],
                    ['Assists', teamTotals.assists, teamTotals.apg],
                    ['Steals', teamTotals.steals, completed.length ? teamTotals.steals / completed.length : 0],
                    ['Blocks', teamTotals.blocks, completed.length ? teamTotals.blocks / completed.length : 0],
                    ['Turnovers', teamTotals.turnovers, teamTotals.turnovers ? teamTotals.turnovers / Math.max(1, completed.length) : 0],
                    ['Fouls', teamTotals.fouls, completed.length ? teamTotals.fouls / completed.length : 0],
                  ].map(([label, total, perGame]) => (
                    <TR key={String(label)}>
                      <TD className="text-ink">{label}</TD>
                      <TD className="stat-num text-center text-ink">{total}</TD>
                      <TD className="stat-num text-center">{Number(perGame).toFixed(1)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-ink">Player statistics</h2>
            <p className="text-xs text-ink-muted">Tap a player for their season game log.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-ink-faint">{playerRows.length} players</span>
            {control}
          </div>
        </div>
        <PlayerStatsTable rows={playerRows} onSelect={setSelected} />
      </div>

      <PlayerDetailDialog row={selectedRow} games={games} onClose={() => setSelected(null)} />
    </div>
  )
}
