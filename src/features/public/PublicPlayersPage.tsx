import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, TrendingUp } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { EmptyState } from '@/components/ui/empty-state'
import { PlayerAvatar } from '@/components/stats/player-avatar'
import { Table, TableWrap, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { PublicGate } from '@/features/public/PublicGate'
import { PublicTeamSwitch, usePublicGender } from '@/features/public/PublicTeamSwitch'
import { genderLabel, matchesForGender, playerGameStats } from '@/features/public/publicUtils'
import { aggregate } from '@/services/analytics/stats'
import type { PublicData } from '@/features/public/usePublicData'
import type { TeamGender } from '@/types/domain'
import { jerseyLabel } from '@/types/domain'

type SortKey = 'ppg' | 'rpg' | 'apg' | 'fgPct' | 'points'

function PlayersContent({
  data,
  gender,
  setGender,
}: {
  data: PublicData
  gender: TeamGender
  setGender: (gender: TeamGender) => void
}) {
  const [sort, setSort] = useState<SortKey>('ppg')

  const rows = useMemo(() => {
    const teamIds = new Set(
      data.teams.filter((team) => team.gender === gender).map((team) => team.id),
    )
    const completed = matchesForGender(data, gender).filter((match) => match.status === 'completed')

    return data.players
      .filter((player) => player.publicVisible && player.isActive && teamIds.has(player.teamId))
      .map((player) => {
        const teamMatches = completed.filter(
          (match) => match.homeTeamId === player.teamId || match.awayTeamId === player.teamId,
        )
        const perGame = teamMatches.map((match) =>
          playerGameStats(data, match, player.id, player.teamId),
        )
        return { player, totals: aggregate(perGame) }
      })
      .filter((row) => row.totals.games > 0)
      .sort((a, b) => {
        if (sort === 'points') return b.totals.points - a.totals.points
        if (sort === 'fgPct') return b.totals.fgPct - a.totals.fgPct
        return b.totals[sort] - a.totals[sort]
      })
  }, [data, gender, sort])

  const leaders = rows.slice(0, 3)

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Player statistics"
        title={`${genderLabel(gender)} player stats`}
        description="Published season statistics derived from recorded match events. Private player details are never shown."
        actions={<PublicTeamSwitch gender={gender} onChange={setGender} />}
      />

      {leaders.length > 0 ? (
        <section className="grid gap-3 sm:grid-cols-3">
          {leaders.map((row, index) => (
            <Card key={row.player.id}>
              <CardContent className="pt-4">
                <Link
                  to={`/players/${row.player.id}`}
                  className="flex items-center gap-3 transition hover:text-accent"
                >
                  <PlayerAvatar player={row.player} size="lg" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <Badge tone={index === 0 ? 'accent' : 'neutral'}>#{index + 1}</Badge>
                      <p className="truncate text-sm font-semibold text-ink">
                        {row.player.firstName} {row.player.lastName}
                      </p>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-ink-faint">
                      {data.teamById.get(row.player.teamId)?.shortName ?? 'Team'} ·{' '}
                      {row.totals.games} GP
                    </p>
                    <p className="stat-num mt-1.5 text-xl text-ink">
                      {row.totals.ppg.toFixed(1)}
                      <span className="ml-1 text-[10px] font-normal uppercase tracking-wider text-ink-faint">
                        PPG
                      </span>
                    </p>
                  </div>
                </Link>
              </CardContent>
            </Card>
          ))}
        </section>
      ) : null}

      <Card>
        <CardContent className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="sm:w-64">
            <Select
              label="Sort players by"
              value={sort}
              onValueChange={(value) => setSort(value as SortKey)}
              options={[
                { value: 'ppg', label: 'Points per game' },
                { value: 'points', label: 'Total points' },
                { value: 'rpg', label: 'Rebounds per game' },
                { value: 'apg', label: 'Assists per game' },
                { value: 'fgPct', label: 'Field goal %' },
              ]}
              className="w-full"
            />
          </div>
          <p className="text-[11px] text-ink-faint">{rows.length} players with published statistics</p>
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No published player statistics"
          description={`Player statistics appear after the first completed ${genderLabel(gender).toLowerCase()} match.`}
        />
      ) : (
        <TableWrap>
          <Table>
            <THead>
              <tr>
                <TH className="w-10 text-center">#</TH>
                <TH>Player</TH>
                <TH>Team</TH>
                <TH className="text-center">GP</TH>
                <TH className="text-center">PTS</TH>
                <TH className="text-center">PPG</TH>
                <TH className="text-center">RPG</TH>
                <TH className="text-center">APG</TH>
                <TH className="text-center">FG%</TH>
                <TH className="text-center">3P%</TH>
                <TH className="text-center">FT%</TH>
              </tr>
            </THead>
            <TBody>
              {rows.map((row, index) => (
                <TR key={row.player.id}>
                  <TD className="stat-num text-center text-ink-faint">{index + 1}</TD>
                  <TD>
                    <Link
                      to={`/players/${row.player.id}`}
                      className="flex items-center gap-2 transition hover:text-accent"
                    >
                      <PlayerAvatar player={row.player} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">
                          {row.player.firstName} {row.player.lastName}
                        </p>
                        <p className="text-[10px] uppercase tracking-wider text-ink-faint">
                          {jerseyLabel(row.player.jerseyNumber)}
                          {row.player.position ? ` · ${row.player.position}` : ''}
                        </p>
                      </div>
                    </Link>
                  </TD>
                  <TD>{data.teamById.get(row.player.teamId)?.shortName ?? '—'}</TD>
                  <TD className="stat-num text-center">{row.totals.games}</TD>
                  <TD className="stat-num text-center text-ink">{row.totals.points}</TD>
                  <TD className="stat-num text-center text-accent">{row.totals.ppg.toFixed(1)}</TD>
                  <TD className="stat-num text-center">{row.totals.rpg.toFixed(1)}</TD>
                  <TD className="stat-num text-center">{row.totals.apg.toFixed(1)}</TD>
                  <TD className="stat-num text-center">{row.totals.fgPct}%</TD>
                  <TD className="stat-num text-center">{row.totals.tpPct}%</TD>
                  <TD className="stat-num text-center">{row.totals.ftPct}%</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </TableWrap>
      )}

      <p className="flex items-center gap-2 text-[11px] text-ink-faint">
        <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
        Minimum one completed match. Statistics update automatically after each finalised game.
      </p>
    </div>
  )
}

export function PublicPlayersPage() {
  const [gender, setGender] = usePublicGender()
  return (
    <PublicGate>
      {(data) => <PlayersContent data={data} gender={gender} setGender={setGender} />}
    </PublicGate>
  )
}
