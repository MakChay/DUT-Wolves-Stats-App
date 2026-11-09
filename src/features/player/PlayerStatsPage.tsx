import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/stats/stat-card'
import { DonutStat, BarList } from '@/components/stats/charts'
import { Table, TableWrap, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { PlayerAreaGate } from '@/features/player/PlayerDashboardPage'
import { formatDate } from '@/utils/format'
import { BarChart3, Target, TrendingUp, Users } from 'lucide-react'

export function PlayerStatsPage() {
  return (
    <PlayerAreaGate>
      {(ctx) => {
        const { player, team, totals, gameLog } = ctx
        const bestGame = gameLog.reduce<typeof gameLog[number] | null>(
          (best, entry) => (!best || entry.stats.points > best.stats.points ? entry : best),
          null,
        )

        return (
          <div className="space-y-5">
            <PageHeader
              eyebrow="My statistics"
              title="Season statistics"
              description={`Every value is derived from recorded match events for #${player.jerseyNumber} ${player.firstName} ${player.lastName} · ${team.shortName}.`}
            />

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Games played" value={totals.games} hint={`${totals.points} total points`} icon={Users} accent />
              <StatCard label="Points per game" value={totals.ppg.toFixed(1)} hint={`Best game: ${bestGame?.stats.points ?? 0} pts`} icon={TrendingUp} />
              <StatCard label="Field goal %" value={`${totals.fgPct}%`} hint={`${totals.fgm}/${totals.fga} attempts`} icon={Target} />
              <StatCard label="True contributions" value={`${totals.rebounds + totals.assists}`} hint={`${totals.rebounds} REB · ${totals.assists} AST`} icon={BarChart3} />
            </section>

            <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Shooting splits</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-2 pt-3">
                  <DonutStat value={totals.fgPct} label="Field goals" sublabel={`${totals.fgm}/${totals.fga}`} />
                  <DonutStat value={totals.tpPct} label="Three points" sublabel={`${totals.tpm}/${totals.tpa}`} />
                  <DonutStat value={totals.ftPct} label="Free throws" sublabel={`${totals.ftm}/${totals.fta}`} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Production breakdown</CardTitle>
                  <span className="text-[11px] text-ink-faint">Season totals</span>
                </CardHeader>
                <CardContent className="pt-3">
                  <BarList
                    items={[
                      { label: 'Points', value: totals.points },
                      { label: 'Rebounds', value: totals.rebounds },
                      { label: 'Assists', value: totals.assists },
                      { label: 'Steals', value: totals.steals },
                      { label: 'Blocks', value: totals.blocks },
                      { label: 'Turnovers', value: totals.turnovers },
                      { label: 'Personal fouls', value: totals.fouls },
                    ]}
                  />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Game log</CardTitle>
                  <p className="mt-0.5 text-xs text-ink-muted">Completed matches only</p>
                </div>
                <span className="text-[11px] text-ink-faint">{gameLog.length} games</span>
              </CardHeader>
              <CardContent className="pt-3">
                {gameLog.length === 0 ? (
                  <p className="rounded-control border border-dashed border-line px-3 py-8 text-center text-xs text-ink-faint">
                    No completed games yet.
                  </p>
                ) : (
                  <TableWrap>
                    <Table>
                      <THead>
                        <tr>
                          <TH>Date</TH>
                          <TH>Opponent</TH>
                          <TH className="text-center">Result</TH>
                          <TH className="text-center">PTS</TH>
                          <TH className="text-center">REB</TH>
                          <TH className="text-center">AST</TH>
                          <TH className="text-center">STL</TH>
                          <TH className="text-center">BLK</TH>
                          <TH className="text-center">TO</TH>
                          <TH className="text-center">PF</TH>
                          <TH className="text-center">FG</TH>
                          <TH className="text-center">3PT</TH>
                          <TH className="text-center">FT</TH>
                        </tr>
                      </THead>
                      <TBody>
                        {gameLog
                          .slice()
                          .reverse()
                          .map((entry) => (
                            <TR key={entry.match.id}>
                              <TD>{formatDate(entry.match.tipoff, { day: 'numeric', month: 'short' })}</TD>
                              <TD className="text-ink">
                                {entry.isHome ? 'vs' : '@'} {entry.opponent?.shortName ?? 'Opponent'}
                              </TD>
                              <TD className="text-center">
                                <span className={entry.won ? 'text-success' : 'text-danger'}>
                                  {entry.won ? 'W' : 'L'} {entry.ownScore}–{entry.oppScore}
                                </span>
                              </TD>
                              <TD className="stat-num text-center text-ink">{entry.stats.points}</TD>
                              <TD className="stat-num text-center">{entry.stats.reb}</TD>
                              <TD className="stat-num text-center">{entry.stats.ast}</TD>
                              <TD className="stat-num text-center">{entry.stats.stl}</TD>
                              <TD className="stat-num text-center">{entry.stats.blk}</TD>
                              <TD className="stat-num text-center">{entry.stats.tov}</TD>
                              <TD className="stat-num text-center">{entry.stats.pf}</TD>
                              <TD className="stat-num text-center">{entry.stats.fgm}/{entry.stats.fga}</TD>
                              <TD className="stat-num text-center">{entry.stats.tpm}/{entry.stats.tpa}</TD>
                              <TD className="stat-num text-center">{entry.stats.ftm}/{entry.stats.fta}</TD>
                            </TR>
                          ))}
                      </TBody>
                    </Table>
                  </TableWrap>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Season averages</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2 pt-3 sm:grid-cols-4 lg:grid-cols-6">
                {[
                  ['PPG', totals.ppg.toFixed(1)],
                  ['RPG', totals.rpg.toFixed(1)],
                  ['APG', totals.apg.toFixed(1)],
                  ['FG%', `${totals.fgPct}`],
                  ['3P%', `${totals.tpPct}`],
                  ['FT%', `${totals.ftPct}`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-control border border-line bg-canvas/40 p-2.5 text-center">
                    <p className="stat-num text-lg text-ink">{value}</p>
                    <p className="text-[10px] uppercase tracking-wider text-ink-faint">{label}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )
      }}
    </PlayerAreaGate>
  )
}
