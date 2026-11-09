import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarDays,
  Ruler,
  Shield,
  TrendingUp,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { PlayerAvatar } from '@/components/stats/player-avatar'
import { Table, TableWrap, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { PublicGate } from '@/features/public/PublicGate'
import {
  playerGameStats,
  publicAvailabilityLabel,
  scoreOf,
} from '@/features/public/publicUtils'
import type { PublicData } from '@/features/public/usePublicData'
import { aggregate } from '@/services/analytics/stats'
import { formatDate } from '@/utils/format'
import type { PublicPlayer } from '@/types/domain'

const AVAILABILITY_TONE = {
  active: 'success',
  unavailable: 'warning',
  injured: 'warning',
  inactive: 'neutral',
} as const

function PlayerProfileContent({ data, player }: { data: PublicData; player: PublicPlayer }) {
  const team = data.teamById.get(player.teamId) ?? null
  const matches = data.matches
    .filter(
      (match) =>
        match.status === 'completed' &&
        (match.homeTeamId === player.teamId || match.awayTeamId === player.teamId),
    )
    .sort((a, b) => b.tipoff.localeCompare(a.tipoff))

  const gameLog = matches.map((match) => {
    const stats = playerGameStats(data, match, player.id, player.teamId)
    const score = scoreOf(data, match)
    const isHome = match.homeTeamId === player.teamId
    const teamScore = isHome ? score.home : score.away
    const opponentScore = isHome ? score.away : score.home
    const opponentId = isHome ? match.awayTeamId : match.homeTeamId
    return {
      match,
      stats,
      teamScore,
      opponentScore,
      opponent: data.teamById.get(opponentId) ?? null,
      result: teamScore > opponentScore ? 'W' : teamScore < opponentScore ? 'L' : 'D',
    }
  })

  const totals = aggregate(gameLog.map((row) => row.stats))
  const heroPhoto = player.photoUrl
  const availabilityTone = AVAILABILITY_TONE[player.availability]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/players">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            All players
          </Link>
        </Button>
        {team ? (
          <Button asChild variant="secondary" size="sm">
            <Link to={`/teams/${team.id}`}>
              <Shield className="h-3.5 w-3.5" aria-hidden="true" />
              {team.name}
            </Link>
          </Button>
        ) : null}
      </div>

      <section className="overflow-hidden rounded-card border border-line bg-sidebar">
        <div className="grid lg:grid-cols-[minmax(0,320px)_1fr]">
          <div className="relative min-h-[280px] bg-gradient-to-b from-accent/20 to-sidebar">
            {heroPhoto ? (
              <img
                src={heroPhoto}
                alt={`${player.firstName} ${player.lastName}`}
                className="h-full max-h-[420px] w-full object-cover"
              />
            ) : (
              <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-3 p-8">
                <PlayerAvatar player={player} size="xl" />
                <p className="text-[11px] uppercase tracking-[0.25em] text-ink-faint">
                  Portrait pending
                </p>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-sidebar via-sidebar/70 to-transparent p-4 lg:hidden">
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">
                DUT Wolves
              </p>
              <h1 className="mt-1 text-2xl font-bold text-ink">
                {player.firstName} {player.lastName}
              </h1>
            </div>
          </div>

          <div className="flex flex-col justify-center p-5 sm:p-7">
            <div className="hidden flex-wrap items-center gap-2 lg:flex">
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">
                DUT Wolves Basketball
              </p>
              <Badge tone={availabilityTone}>{publicAvailabilityLabel(player.availability)}</Badge>
            </div>
            <h1 className="mt-2 hidden text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl lg:block">
              {player.firstName} {player.lastName}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {player.jerseyNumber !== null ? (
                <span className="rounded-control border border-accent/40 bg-accent/10 px-3 py-1.5 text-sm font-bold text-accent">
                  #{player.jerseyNumber}
                </span>
              ) : (
                <span className="rounded-control border border-line px-3 py-1.5 text-xs text-ink-faint">
                  Jersey not assigned
                </span>
              )}
              {player.position ? (
                <span className="rounded-control border border-line bg-canvas/50 px-3 py-1.5 text-xs font-semibold text-ink">
                  {player.position}
                  {player.secondaryPosition ? ` / ${player.secondaryPosition}` : ''}
                </span>
              ) : null}
              {team ? (
                <span className="rounded-control border border-line bg-canvas/50 px-3 py-1.5 text-xs text-ink-muted">
                  {team.name}
                </span>
              ) : null}
              {player.heightCm ? (
                <span className="inline-flex items-center gap-1 rounded-control border border-line bg-canvas/50 px-3 py-1.5 text-xs text-ink-muted">
                  <Ruler className="h-3.5 w-3.5" aria-hidden="true" />
                  {player.heightCm} cm
                </span>
              ) : null}
            </div>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-muted">
              {player.bio ??
                'Published profile for a DUT Wolves student-athlete. Private student information, campus details and injury records are never shown publicly.'}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: 'GP', value: totals.games },
                { label: 'PPG', value: totals.ppg.toFixed(1) },
                { label: 'RPG', value: totals.rpg.toFixed(1) },
                { label: 'APG', value: totals.apg.toFixed(1) },
              ].map((item) => (
                <div key={item.label} className="rounded-control border border-line bg-canvas/45 px-3 py-2.5">
                  <p className="stat-num text-xl text-ink">{item.value}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Season statistics</CardTitle>
            <Badge tone="neutral">{totals.games} games</Badge>
          </CardHeader>
          <CardContent className="pt-3">
            {totals.games === 0 ? (
              <p className="py-6 text-center text-xs text-ink-faint">
                Statistics appear after the first completed match.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {[
                  { label: 'Points', value: totals.points },
                  { label: 'Field goal %', value: `${totals.fgPct}%` },
                  { label: 'Three point %', value: `${totals.tpPct}%` },
                  { label: 'Free throw %', value: `${totals.ftPct}%` },
                  { label: 'Rebounds', value: totals.rebounds },
                  { label: 'Assists', value: totals.assists },
                  { label: 'Steals', value: totals.steals },
                  { label: 'Blocks', value: totals.blocks },
                  { label: 'Turnovers', value: totals.turnovers },
                ].map((item) => (
                  <div key={item.label} className="rounded-control border border-line/70 px-3 py-2">
                    <p className="stat-num text-lg text-ink">{item.value}</p>
                    <p className="text-[10px] uppercase tracking-wider text-ink-faint">
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      <Card>
        <CardHeader>
          <CardTitle>Game log</CardTitle>
          <Badge tone="neutral">{gameLog.length} completed</Badge>
        </CardHeader>
        <CardContent className="pt-3">
          {gameLog.length === 0 ? (
            <p className="py-6 text-center text-xs text-ink-faint">No completed matches yet.</p>
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
                  </tr>
                </THead>
                <TBody>
                  {gameLog.map((row) => (
                    <TR key={row.match.id}>
                      <TD className="whitespace-nowrap">
                        {formatDate(row.match.tipoff, { day: 'numeric', month: 'short' })}
                      </TD>
                      <TD>{row.opponent?.shortName ?? 'Opponent'}</TD>
                      <TD className="text-center">
                        <span
                          className={
                            row.result === 'W'
                              ? 'font-semibold text-success'
                              : row.result === 'L'
                                ? 'font-semibold text-danger'
                                : 'font-semibold text-ink-muted'
                          }
                        >
                          {row.result} {row.teamScore}–{row.opponentScore}
                        </span>
                      </TD>
                      <TD className="stat-num text-center text-ink">{row.stats.points}</TD>
                      <TD className="stat-num text-center">{row.stats.reb}</TD>
                      <TD className="stat-num text-center">{row.stats.ast}</TD>
                      <TD className="stat-num text-center">{row.stats.stl}</TD>
                      <TD className="stat-num text-center">{row.stats.blk}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
          )}
        </CardContent>
      </Card>

      <p className="flex items-center gap-2 text-[11px] text-ink-faint">
        <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
        Public profiles exclude student numbers, campus, residence and injury details.
      </p>
    </div>
  )
}

export function PublicPlayerPage() {
  const { playerId } = useParams()
  return (
    <PublicGate>
      {(data) => {
        const player = playerId ? data.playerById.get(playerId) : null
        if (!player || !player.publicVisible) {
          return (
            <EmptyState
              icon={CalendarDays}
              title="Player not found"
              description="This profile is not published, or the player is no longer on a public roster."
              action={
                <Button asChild>
                  <Link to="/players">Back to player statistics</Link>
                </Button>
              }
            />
          )
        }
        return <PlayerProfileContent data={data} player={player} />
      }}
    </PublicGate>
  )
}
