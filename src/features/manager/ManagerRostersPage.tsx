import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, Pencil } from 'lucide-react'
import type { MatchRoster, Player } from '@/types/domain'
import { jerseyLabel, playerDisplayName } from '@/types/domain'
import { repositories } from '@/services/repositories'
import { useAsync } from '@/hooks/useAsync'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { SkeletonCard } from '@/components/ui/skeleton'
import { PlayerAvatar } from '@/components/stats/player-avatar'
import { StatusPill } from '@/components/stats/status-pill'
import { formatDate } from '@/utils/format'
import type { TeamAnalytics } from '@/features/statistics/useTeamAnalytics'
import { TeamAnalyticsGate } from '@/features/statistics/TeamAnalyticsGate'

interface RosterData {
  rosters: MatchRoster[]
  players: Player[]
}

function sortRoster(entries: MatchRoster[], players: Player[]) {
  const playersById = new Map(players.map((player) => [player.id, player]))
  return [...entries]
    .sort((a, b) => Number(b.isStarter) - Number(a.isStarter) || (a.jerseyNumber ?? 999) - (b.jerseyNumber ?? 999))
    .map((entry) => ({
      entry,
      player: playersById.get(entry.playerId) ?? {
        id: entry.playerId,
        teamId: entry.teamId,
        firstName: '',
        lastName: '',
        jerseyNumber: entry.jerseyNumber,
        position: null,
        availability: entry.isActive ? 'active' : 'unavailable',
        isActive: entry.isActive,
        publicVisible: false,
        numberOnly: true,
      },
    }))
}

function RosterView({ analytics }: { analytics: TeamAnalytics }) {
  const defaultMatchId =
    analytics.liveMatch?.id ??
    analytics.upcoming[0]?.id ??
    analytics.completed[analytics.completed.length - 1]?.id ??
    ''

  const [matchId, setMatchId] = useState(defaultMatchId)
  const { data, loading, error } = useAsync<RosterData>(
    async () => {
      if (!matchId) return { rosters: [], players: [] }
      const [rosters, teamPlayers, publicPlayers] = await Promise.all([
        repositories.rosters.listByMatchAndTeam(matchId, analytics.team.id, true),
        repositories.players.listByTeam(analytics.team.id),
        repositories.players.listPublic(),
      ])
      const players = [
        ...teamPlayers,
        ...publicPlayers.filter((player) => player.teamId !== analytics.team.id),
      ]
      return { rosters, players }
    },
    [matchId],
  )

  const match = analytics.matches.find((entry) => entry.id === matchId)
  const opponent = match
    ? analytics.opponentById.get(
        match.homeTeamId === analytics.team.id ? match.awayTeamId : match.homeTeamId,
      )
    : null

  const options = analytics.matches.map((entry) => {
    const opposite = analytics.opponentById.get(
      entry.homeTeamId === analytics.team.id ? entry.awayTeamId : entry.homeTeamId,
    )
    return {
      value: entry.id,
      label: `${formatDate(entry.tipoff, { day: 'numeric', month: 'short' })} · ${opposite?.shortName ?? 'Opponent'} · ${entry.round ?? 'Fixture'}`,
    }
  })

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="sm:w-80">
            <Select label="Select match roster" value={matchId} onValueChange={setMatchId} options={options} className="w-full" />
          </div>
          {match ? (
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={match.status} />
              <Badge tone="neutral">{match.round ?? 'Match'}</Badge>
              <span className="text-[11px] text-ink-faint">{match.venue}</span>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <SkeletonCard lines={8} />
          <SkeletonCard lines={8} />
        </div>
      ) : error ? (
        <EmptyState icon={ClipboardList} title="Roster could not be loaded" description={error} />
      ) : !match ? (
        <EmptyState
          icon={ClipboardList}
          title="No match selected"
          description="Choose a match to review its registered roster and starting five."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {[analytics.team, opponent].map((team) => {
            if (!team) return null
            const entries = data?.rosters.filter((entry) => entry.teamId === team.id) ?? []
            const rows = sortRoster(entries, data?.players ?? [])
            const starters = rows.filter((row) => row.entry.isStarter)
            return (
              <Card key={team.id}>
                <CardHeader>
                  <div>
                    <CardTitle>{team.name}</CardTitle>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {rows.length} registered · {starters.length} starters
                    </p>
                  </div>
                  <Badge tone={team.id === analytics.team.id ? 'accent' : 'neutral'}>
                    {team.id === analytics.team.id ? 'Our team' : 'Opponent'}
                  </Badge>
                </CardHeader>
                <CardContent className="pt-3">
                  {rows.length === 0 ? (
                    <p className="rounded-control border border-dashed border-line px-3 py-6 text-center text-xs text-ink-faint">
                      No players registered for this match.
                    </p>
                  ) : (
                    <ul className="space-y-1">
                      {rows.map(({ entry, player }) => (
                        <li
                          key={entry.id}
                          className="flex items-center gap-2.5 rounded-control border border-line/70 px-2 py-1.5"
                        >
                          <PlayerAvatar player={player} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-ink">
                              {playerDisplayName(player)}
                            </p>
                            <p className="text-[10px] uppercase tracking-wider text-ink-faint">
                              {jerseyLabel(player.jerseyNumber)}
                              {player.position ? ` · ${player.position}` : ''}
                              {player.heightCm ? ` · ${player.heightCm} cm` : ''}
                            </p>
                          </div>
                          {entry.isStarter ? <Badge tone="accent">Starter</Badge> : <Badge>Bench</Badge>}
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-3 flex items-center justify-between gap-2 text-[11px] leading-relaxed text-ink-faint">
                    Match roster snapshots stay read-only. Season roster details are managed on the
                    Players page.
                    <Link
                      to="/manager/players"
                      className="inline-flex shrink-0 items-center gap-1 font-semibold text-accent hover:underline"
                    >
                      <Pencil className="h-3 w-3" aria-hidden="true" />
                      Edit roster
                    </Link>
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function ManagerRostersPage() {
  return (
    <TeamAnalyticsGate>
      {(analytics) => (
        <div className="space-y-5">
          <PageHeader
            eyebrow="Match day"
            title="Rosters"
            description="Review the registered squad and starting five for any fixture. Every match keeps its own roster snapshot."
          />
          <RosterView analytics={analytics} />
        </div>
      )}
    </TeamAnalyticsGate>
  )
}
