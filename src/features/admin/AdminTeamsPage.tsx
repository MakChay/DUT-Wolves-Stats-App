import { ShieldCheck } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PlayerAvatar } from '@/components/stats/player-avatar'
import { EmptyState } from '@/components/ui/empty-state'
import { SkeletonCard } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useAdminData } from '@/features/admin/useAdminData'
import { jerseyLabel } from '@/types/domain'

export function AdminTeamsPage() {
  const { data, loading, error, reload } = useAdminData()

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonCard lines={2} />
        <div className="grid gap-4 lg:grid-cols-2">
          <SkeletonCard lines={8} />
          <SkeletonCard lines={8} />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Teams could not be loaded"
        description={error}
        action={<Button onClick={reload}>Try again</Button>}
      />
    )
  }

  if (!data) return null

  const dutTeams = data.teams.filter((team) => team.id === 'team-men' || team.id === 'team-women')

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Teams"
        title="Team administration"
        description="DUT Wolves squads share one application and one data layer. Each team keeps its own manager, coaches, roster and statistics."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {dutTeams.map((team) => {
          const manager = data.users.find((user) => user.id === team.managerId)
          const coaches = data.users.filter((user) => team.coachIds.includes(user.id))
          const players = data.players.filter((player) => player.teamId === team.id)
          const matches = data.matches.filter(
            (match) => match.homeTeamId === team.id || match.awayTeamId === team.id,
          )

          return (
            <Card key={team.id}>
              <CardHeader>
                <div>
                  <CardTitle>{team.name}</CardTitle>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {players.length} players · {matches.length} fixtures · {coaches.length} coaches
                  </p>
                </div>
                <Badge tone={team.publicVisible ? 'success' : 'neutral'}>
                  {team.publicVisible ? 'Public' : 'Hidden'}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3 pt-3">
                <div className="rounded-control border border-line px-3 py-2">
                  <p className="label-caps">Team manager</p>
                  <p className="mt-0.5 text-sm font-medium text-ink">{manager?.displayName ?? 'Unassigned'}</p>
                  <p className="text-[11px] text-ink-faint">{manager?.email ?? '—'}</p>
                </div>

                <div>
                  <p className="label-caps mb-1.5">Coaching staff</p>
                  <ul className="space-y-1">
                    {coaches.map((coach) => (
                      <li
                        key={coach.id}
                        className="flex items-center justify-between gap-3 rounded-control border border-line/70 px-2.5 py-1.5"
                      >
                        <span className="text-xs text-ink">{coach.displayName}</span>
                        <span className="text-[10px] uppercase tracking-wider text-ink-faint">Coach</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="label-caps mb-1.5">Active roster</p>
                  <div className="grid grid-cols-2 gap-1">
                    {players.slice(0, 8).map((player) => (
                      <div
                        key={player.id}
                        className="flex items-center gap-2 rounded-control border border-line/70 px-2 py-1.5"
                      >
                        <PlayerAvatar player={player} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-medium text-ink">
                            {player.firstName} {player.lastName}
                          </p>
                          <p className="text-[9px] uppercase text-ink-faint">
                            {jerseyLabel(player.jerseyNumber)} · {player.position ?? 'Unassigned'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {players.length > 8 ? (
                    <p className="mt-1 text-[11px] text-ink-faint">+{players.length - 8} more players</p>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <p className="text-[11px] leading-relaxed text-ink-faint">
        Opponent teams are registered for fixtures and standings. They do not have manager or coach accounts
        linked to this workspace.
      </p>
    </div>
  )
}
