import type { MatchEvent, MatchEventType, MatchRoster } from '@/types/domain'

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface SimulateOptions {
  matchId: string
  homeTeamId: string
  awayTeamId: string
  homeRoster: MatchRoster[]
  awayRoster: MatchRoster[]
  seed: number
  /** Include events only up to this period (inclusive). */
  throughPeriod?: number
  /** For the final included period, only events at or above this clock (seconds remaining). */
  minClockInFinalPeriod?: number
}

interface TeamContext {
  teamId: string
  roster: MatchRoster[]
}

export function simulateMatch(options: SimulateOptions): MatchEvent[] {
  const random = mulberry32(options.seed)
  const events: MatchEvent[] = []
  let index = 0

  const teams: TeamContext[] = [
    { teamId: options.homeTeamId, roster: options.homeRoster },
    { teamId: options.awayTeamId, roster: options.awayRoster },
  ]

  const pickPlayer = (team: TeamContext, exclude?: string): MatchRoster | undefined => {
    const pool = team.roster.filter((entry) => entry.playerId !== exclude)
    if (pool.length === 0) return undefined
    const weighted: MatchRoster[] = []
    pool.forEach((entry) => {
      const weight = entry.isStarter ? 4 : 1
      for (let i = 0; i < weight; i += 1) weighted.push(entry)
    })
    return weighted[Math.floor(random() * weighted.length)]
  }

  const push = (
    teamId: string,
    type: MatchEventType,
    period: number,
    clockSeconds: number,
    playerId?: string,
    points?: number,
  ) => {
    index += 1
    events.push({
      id: `${options.matchId}_evt_${index}`,
      clientEventId: `${options.matchId}_client_${index}`,
      matchId: options.matchId,
      teamId,
      playerId,
      type,
      period,
      clockSeconds,
      createdAt: new Date(
        Date.UTC(2026, 9, 18, 16, 0, 0) + index * 61_000,
      ).toISOString(),
      recordedBy: 'seed-simulator',
      points,
    })
  }

  const lastPeriod = options.throughPeriod ?? 4

  for (let period = 1; period <= lastPeriod; period += 1) {
    let clock = 600
    push(options.homeTeamId, 'PERIOD_START', period, clock)
    const floor =
      period === lastPeriod && options.minClockInFinalPeriod !== undefined
        ? options.minClockInFinalPeriod
        : 0

    while (clock > floor) {
      clock = Math.max(0, clock - (8 + Math.floor(random() * 19)))
      if (clock < floor) break

      const offenseIndex = random() < 0.5 ? 0 : 1
      const offense = teams[offenseIndex]!
      const defense = teams[1 - offenseIndex]!
      const scorer = pickPlayer(offense)
      if (!scorer) break

      const roll = random()

      if (roll < 0.44) {
        push(offense.teamId, 'FG2_MADE', period, clock, scorer.playerId, 2)
        if (random() < 0.55) {
          const assister = pickPlayer(offense, scorer.playerId)
          if (assister) push(offense.teamId, 'ASSIST', period, clock, assister.playerId)
        }
      } else if (roll < 0.62) {
        push(offense.teamId, 'FG2_MISS', period, clock, scorer.playerId)
        if (random() < 0.12) {
          const blocker = pickPlayer(defense)
          if (blocker) push(defense.teamId, 'BLOCK', period, clock, blocker.playerId)
        }
        if (random() < 0.7) {
          const offensiveBoard = random() < 0.3
          const rebounder = pickPlayer(offensiveBoard ? offense : defense)
          if (rebounder) {
            push(
              offensiveBoard ? offense.teamId : defense.teamId,
              offensiveBoard ? 'REB_OFF' : 'REB_DEF',
              period,
              clock,
              rebounder.playerId,
            )
          }
        }
      } else if (roll < 0.72) {
        push(offense.teamId, 'FG3_MADE', period, clock, scorer.playerId, 3)
        if (random() < 0.6) {
          const assister = pickPlayer(offense, scorer.playerId)
          if (assister) push(offense.teamId, 'ASSIST', period, clock, assister.playerId)
        }
      } else if (roll < 0.84) {
        push(offense.teamId, 'FG3_MISS', period, clock, scorer.playerId)
        if (random() < 0.75) {
          const offensiveBoard = random() < 0.22
          const rebounder = pickPlayer(offensiveBoard ? offense : defense)
          if (rebounder) {
            push(
              offensiveBoard ? offense.teamId : defense.teamId,
              offensiveBoard ? 'REB_OFF' : 'REB_DEF',
              period,
              clock,
              rebounder.playerId,
            )
          }
        }
      } else if (roll < 0.9) {
        push(offense.teamId, 'FT_MADE', period, clock, scorer.playerId, 1)
      } else if (roll < 0.94) {
        push(offense.teamId, 'FT_MISS', period, clock, scorer.playerId)
        if (random() < 0.8) {
          const rebounder = pickPlayer(defense)
          if (rebounder) push(defense.teamId, 'REB_DEF', period, clock, rebounder.playerId)
        }
      } else if (roll < 0.975) {
        push(offense.teamId, 'TURNOVER', period, clock, scorer.playerId)
        if (random() < 0.4) {
          const stealer = pickPlayer(defense)
          if (stealer) push(defense.teamId, 'STEAL', period, clock, stealer.playerId)
        }
      } else {
        push(offense.teamId, 'FOUL', period, clock, scorer.playerId)
      }
    }

    if (period === lastPeriod && options.minClockInFinalPeriod !== undefined) {
      // Live match: do not emit a period-end event for a period still in progress.
      continue
    }
    push(options.homeTeamId, 'PERIOD_END', period, 0)
  }

  return events
}
