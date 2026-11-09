import type { Match, MatchEvent, MatchSnapshot, Player } from '@/types/domain'
import { derivePlayerGameStats, deriveTeamGameStats, matchScore } from '@/services/analytics/stats'
import { repositories } from '@/services/repositories'

interface CaptureInput {
  match: Match
  events: MatchEvent[]
  players: Player[]
  userId: string
  source?: 'events' | 'manual'
  completedAt?: string
}

/**
 * Freezes the final box score when a match is completed. Event-sourced matches
 * derive player and team stats; manually entered opponent-only results carry
 * the final score without fabricated player stats.
 */
export async function captureMatchSnapshot({
  match,
  events,
  players,
  userId,
  source = 'events',
  completedAt,
}: CaptureInput): Promise<MatchSnapshot | null> {
  if (match.status !== 'completed') return null

  const score = matchScore(events, match)
  const homeStats = deriveTeamGameStats(events, match.homeTeamId, match.id)
  const awayStats = deriveTeamGameStats(events, match.awayTeamId, match.id)

  if (source === 'manual') {
    homeStats.points = score.home
    awayStats.points = score.away
  }

  const playerStats =
    source === 'manual'
      ? []
      : players
          .filter((player) => player.teamId === match.homeTeamId || player.teamId === match.awayTeamId)
          .map((player) =>
            derivePlayerGameStats(events, player.id, player.teamId, match.id),
          )
          .filter((row) =>
            [row.points, row.fgm, row.fga, row.reb, row.ast, row.stl, row.blk, row.tov, row.pf].some(
              (value) => value > 0,
            ),
          )

  const now = new Date().toISOString()
  return repositories.snapshots.capture({
    id: match.id,
    matchId: match.id,
    competitionId: match.competitionId,
    seasonId: match.seasonId,
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
    homeScore: score.home,
    awayScore: score.away,
    period: match.period,
    completedAt: completedAt ?? now,
    capturedAt: now,
    capturedByUserId: userId,
    source,
    homeStats,
    awayStats,
    playerStats,
  })
}
