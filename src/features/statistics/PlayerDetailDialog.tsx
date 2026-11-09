import type { Player, PlayerGameStats } from '@/types/domain'
import type { PlayerSeasonRow } from '@/features/statistics/useTeamAnalytics'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { PlayerAvatar } from '@/components/stats/player-avatar'
import { Table, TableWrap, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { StatRow } from '@/components/stats/stat-card'
import { formatDate } from '@/utils/format'

interface PlayerDetailDialogProps {
  row: PlayerSeasonRow | null
  games: { matchId: string; label: string; stats: PlayerGameStats }[]
  onClose: () => void
}

export function PlayerDetailDialog({ row, games, onClose }: PlayerDetailDialogProps) {
  return (
    <Dialog open={Boolean(row)} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      {row ? (
        <DialogContent
          title={`#${row.player.jerseyNumber} ${row.player.firstName} ${row.player.lastName}`}
          description={`${row.player.position} · ${row.player.heightCm ?? '—'} cm · ${row.totals.games} games played`}
          className="max-w-2xl"
        >
          <div className="flex items-center gap-3">
            <PlayerAvatar player={row.player} size="lg" />
            <div className="grid flex-1 grid-cols-3 gap-2">
              <div className="rounded-control border border-line bg-canvas/40 p-2 text-center">
                <p className="stat-num text-lg text-accent">{row.totals.ppg.toFixed(1)}</p>
                <p className="text-[10px] uppercase tracking-wider text-ink-faint">PPG</p>
              </div>
              <div className="rounded-control border border-line bg-canvas/40 p-2 text-center">
                <p className="stat-num text-lg text-ink">{row.totals.rpg.toFixed(1)}</p>
                <p className="text-[10px] uppercase tracking-wider text-ink-faint">RPG</p>
              </div>
              <div className="rounded-control border border-line bg-canvas/40 p-2 text-center">
                <p className="stat-num text-lg text-ink">{row.totals.apg.toFixed(1)}</p>
                <p className="text-[10px] uppercase tracking-wider text-ink-faint">APG</p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-control border border-line px-3 py-2">
              <StatRow label="Field goals" value={`${row.totals.fgm}/${row.totals.fga} · ${row.totals.fgPct}%`} />
              <StatRow label="Three pointers" value={`${row.totals.tpm}/${row.totals.tpa} · ${row.totals.tpPct}%`} />
              <StatRow label="Free throws" value={`${row.totals.ftm}/${row.totals.fta} · ${row.totals.ftPct}%`} />
            </div>
            <div className="rounded-control border border-line px-3 py-2">
              <StatRow label="Steals" value={row.totals.steals} />
              <StatRow label="Blocks" value={row.totals.blocks} />
              <StatRow label="Turnovers" value={row.totals.turnovers} />
              <StatRow label="Personal fouls" value={row.totals.fouls} />
            </div>
          </div>

          <div className="mt-4">
            <p className="label-caps mb-1.5">Game log</p>
            {games.length === 0 ? (
              <p className="rounded-control border border-dashed border-line px-3 py-5 text-center text-xs text-ink-faint">
                No completed games yet.
              </p>
            ) : (
              <TableWrap>
                <Table>
                  <THead>
                    <tr>
                      <TH>Match</TH>
                      <TH className="text-center">PTS</TH>
                      <TH className="text-center">REB</TH>
                      <TH className="text-center">AST</TH>
                      <TH className="text-center">FG</TH>
                      <TH className="text-center">3PT</TH>
                      <TH className="text-center">FT</TH>
                      <TH className="text-center">PF</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {games.map((game) => (
                      <TR key={game.matchId}>
                        <TD className="text-ink">{game.label}</TD>
                        <TD className="stat-num text-center text-ink">{game.stats.points}</TD>
                        <TD className="stat-num text-center">{game.stats.reb}</TD>
                        <TD className="stat-num text-center">{game.stats.ast}</TD>
                        <TD className="stat-num text-center">
                          {game.stats.fgm}/{game.stats.fga}
                        </TD>
                        <TD className="stat-num text-center">
                          {game.stats.tpm}/{game.stats.tpa}
                        </TD>
                        <TD className="stat-num text-center">
                          {game.stats.ftm}/{game.stats.fta}
                        </TD>
                        <TD className="stat-num text-center">{game.stats.pf}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </TableWrap>
            )}
          </div>
        </DialogContent>
      ) : null}
    </Dialog>
  )
}

export function gameLabel(tipoff: string, opponentName: string): string {
  return `${formatDate(tipoff, { day: 'numeric', month: 'short' })} · ${opponentName}`
}

export function makeGameLog(
  player: Player,
  rows: PlayerSeasonRow[],
): { matchId: string; label: string; stats: PlayerGameStats }[] {
  const row = rows.find((entry) => entry.player.id === player.id)
  if (!row) return []
  return row.perGame.map((stats, index) => ({
    matchId: stats.matchId,
    label: `Game ${index + 1}`,
    stats,
  }))
}
