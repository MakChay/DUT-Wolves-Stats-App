import { useMemo, useState } from 'react'
import { BarChart3, Users } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { PlayerAvatar } from '@/components/stats/player-avatar'
import { TrendChart } from '@/components/stats/charts'
import { PlayerDetailDialog } from '@/features/statistics/PlayerDetailDialog'
import { useTeamScope } from '@/features/teams/TeamScopeContext'
import { useTeamAnalytics } from '@/features/statistics/useTeamAnalytics'
import { SkeletonCard } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/utils/format'
import type { Player } from '@/types/domain'

interface Metric {
  label: string
  values: [number, number]
  decimals?: number
  suffix?: string
}

export function CoachAnalyticsPage() {
  const { teamId, loading: scopeLoading } = useTeamScope()
  const { data, loading, error, reload } = useTeamAnalytics(teamId)
  const [leftId, setLeftId] = useState('')
  const [rightId, setRightId] = useState('')
  const [selected, setSelected] = useState<Player | null>(null)

  const rows = data?.playerRows ?? []
  const left = rows.find((row) => row.player.id === leftId) ?? rows[0] ?? null
  const right =
    rows.find((row) => row.player.id === rightId && row.player.id !== left?.player.id) ??
    rows.find((row) => row.player.id !== left?.player.id) ??
    null

  const games = useMemo(() => {
    if (!data || !selected) return []
    const row = data.playerRows.find((entry) => entry.player.id === selected.id)
    if (!row) return []
    return data.completed.map((match, index) => {
      const opponent = data.opponentById.get(
        match.homeTeamId === data.team.id ? match.awayTeamId : match.homeTeamId,
      )
      const stats = row.perGame[index]
      return stats
        ? {
            matchId: match.id,
            label: `vs ${opponent?.shortName ?? 'Opponent'} · ${formatDate(match.tipoff, { day: 'numeric', month: 'short' })}`,
            stats,
          }
        : null
    }).filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
  }, [data, selected])

  if (scopeLoading || loading) {
    return (
      <div className="space-y-4">
        <SkeletonCard lines={2} />
        <div className="grid gap-4 lg:grid-cols-2">
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
        </div>
        <SkeletonCard lines={8} />
      </div>
    )
  }

  if (error) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Analytics could not be loaded"
        description={error}
        action={<Button onClick={reload}>Try again</Button>}
      />
    )
  }

  if (!data || rows.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Not enough player data"
        description="Complete at least one match so player statistics can be compared."
      />
    )
  }

  const options = rows.map((row) => ({
    value: row.player.id,
    label: `#${row.player.jerseyNumber} ${row.player.firstName} ${row.player.lastName}`,
  }))

  const metrics: Metric[] = left && right
    ? [
        { label: 'Points per game', values: [left.totals.ppg, right.totals.ppg], decimals: 1 },
        { label: 'Rebounds per game', values: [left.totals.rpg, right.totals.rpg], decimals: 1 },
        { label: 'Assists per game', values: [left.totals.apg, right.totals.apg], decimals: 1 },
        { label: 'Steals', values: [left.totals.steals, right.totals.steals] },
        { label: 'Blocks', values: [left.totals.blocks, right.totals.blocks] },
        { label: 'Turnovers', values: [left.totals.turnovers, right.totals.turnovers] },
        { label: 'Field goal %', values: [left.totals.fgPct, right.totals.fgPct], decimals: 1, suffix: '%' },
        { label: 'Three point %', values: [left.totals.tpPct, right.totals.tpPct], decimals: 1, suffix: '%' },
        { label: 'Free throw %', values: [left.totals.ftPct, right.totals.ftPct], decimals: 1, suffix: '%' },
      ]
    : []

  const selectedRow = selected
    ? rows.find((row) => row.player.id === selected.id) ?? null
    : null

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Performance analytics"
        title="Player comparison"
        description="Compare two players side by side. All values are derived from recorded match events."
      />

      <Card>
        <CardContent className="grid gap-3 pt-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <span className="block text-xs font-semibold text-ink-muted">Player A</span>
            <Select
              label="Player A"
              value={left?.player.id ?? ''}
              onValueChange={setLeftId}
              options={options}
              className="w-full"
            />
          </div>
          <div className="space-y-1.5">
            <span className="block text-xs font-semibold text-ink-muted">Player B</span>
            <Select
              label="Player B"
              value={right?.player.id ?? ''}
              onValueChange={setRightId}
              options={options.filter((option) => option.value !== left?.player.id)}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      {left && right ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2">
            {[left, right].map((row, index) => (
              <Card key={row.player.id}>
                <CardContent className="flex items-center gap-3 pt-4">
                  <PlayerAvatar player={row.player} size="lg" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-ink">
                        {row.player.firstName} {row.player.lastName}
                      </p>
                      <Badge tone={index === 0 ? 'accent' : 'neutral'}>{index === 0 ? 'A' : 'B'}</Badge>
                    </div>
                    <p className="mt-0.5 text-[11px] text-ink-faint">
                      #{row.player.jerseyNumber} · {row.player.position} · {row.totals.games} GP
                    </p>
                    <div className="mt-2 grid grid-cols-3 gap-1.5">
                      {[
                        ['PPG', row.totals.ppg.toFixed(1)],
                        ['RPG', row.totals.rpg.toFixed(1)],
                        ['APG', row.totals.apg.toFixed(1)],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded border border-line bg-canvas/40 px-1 py-1 text-center">
                          <p className="stat-num text-sm text-ink">{value}</p>
                          <p className="text-[9px] uppercase tracking-wider text-ink-faint">{label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelected(row.player)}>
                    Log
                  </Button>
                </CardContent>
              </Card>
            ))}
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Head to head</CardTitle>
              <span className="text-[11px] text-ink-faint">Orange = Player A</span>
            </CardHeader>
            <CardContent className="space-y-3 pt-3">
              {metrics.map((metric) => {
                const [a, b] = metric.values
                const max = Math.max(a, b, 1)
                const format = (value: number) =>
                  `${metric.decimals ? value.toFixed(metric.decimals) : value}${metric.suffix ?? ''}`
                return (
                  <div key={metric.label}>
                    <div className="mb-1 grid grid-cols-[52px_1fr_52px] items-center gap-2">
                      <span className="stat-num text-right text-xs text-accent">{format(a)}</span>
                      <span className="text-center text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                        {metric.label}
                      </span>
                      <span className="stat-num text-xs text-ink-muted">{format(b)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <div className="flex justify-end overflow-hidden rounded-full bg-white/[0.05]">
                        <div
                          className="h-1.5 rounded-full bg-accent/80"
                          style={{ width: `${Math.max(3, (a / max) * 100)}%` }}
                        />
                      </div>
                      <div className="overflow-hidden rounded-full bg-white/[0.05]">
                        <div
                          className="h-1.5 rounded-full bg-ink-faint/60"
                          style={{ width: `${Math.max(3, (b / max) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            {[left, right].map((row) => (
              <Card key={row.player.id}>
                <CardHeader>
                  <div>
                    <CardTitle>Scoring trend</CardTitle>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {row.player.lastName} · points per completed match
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="pt-3">
                  <TrendChart
                    points={row.perGame.map((stats, index) => ({
                      label: `G${index + 1}`,
                      value: stats.points,
                    }))}
                    height={110}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          icon={Users}
          title="Select two players"
          description="Choose two different players to compare their season statistics."
        />
      )}

      <PlayerDetailDialog row={selectedRow} games={games} onClose={() => setSelected(null)} />
    </div>
  )
}
