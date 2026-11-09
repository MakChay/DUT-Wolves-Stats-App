import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Radio } from 'lucide-react'
import type { TeamAnalytics } from '@/features/statistics/useTeamAnalytics'
import { matchScore } from '@/services/analytics/stats'
import { MatchCard } from '@/components/stats/match-card'
import { Scoreboard } from '@/components/stats/scoreboard'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { EmptyState } from '@/components/ui/empty-state'
import { cn } from '@/utils/cn'

type Filter = 'all' | 'upcoming' | 'results'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'results', label: 'Results' },
]

interface TeamMatchesViewProps {
  analytics: TeamAnalytics
  liveHref?: string
  reportsBase?: string
}

export function TeamMatchesView({ analytics, liveHref, reportsBase }: TeamMatchesViewProps) {
  const [filter, setFilter] = useState<Filter>('all')
  const [competition, setCompetition] = useState('all')
  const { matches, completed, upcoming, liveMatch, eventsByMatch, opponentById, team, competitions } =
    analytics

  const competitionOptions = [
    { value: 'all', label: 'All competitions' },
    ...competitions
      .filter((entry) => matches.some((match) => match.competitionId === entry.id))
      .map((entry) => ({ value: entry.id, label: entry.shortName })),
  ]

  const scoped = matches.filter(
    (match) => competition === 'all' || match.competitionId === competition,
  )

  const shown =
    filter === 'upcoming'
      ? scoped.filter((match) => match.status === 'scheduled')
      : filter === 'results'
        ? scoped.filter((match) => match.status === 'completed')
        : scoped

  const liveScores = liveMatch ? matchScore(eventsByMatch.get(liveMatch.id) ?? [], liveMatch) : null

  return (
    <div className="space-y-4">
      {liveMatch && liveScores ? (
        <div className="rounded-card border border-danger/25 bg-surface p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-danger">
              <Radio className="h-3.5 w-3.5" aria-hidden="true" />
              Live match
            </span>
            <span className="text-[11px] text-ink-faint">{liveMatch.venue}</span>
          </div>
          <Scoreboard
            homeTeam={opponentById.get(liveMatch.homeTeamId) ?? team}
            awayTeam={opponentById.get(liveMatch.awayTeamId) ?? team}
            homeScore={liveScores.home}
            awayScore={liveScores.away}
            period={liveMatch.period}
            clockSeconds={liveMatch.clockSeconds}
            status={liveMatch.status}
            competition={liveMatch.round}
            compact
          />
          <div className="mt-3 flex justify-end">
            {liveHref ? (
              <Button asChild size="sm">
                <Link to={liveHref}>Open Live Match Centre</Link>
              </Button>
            ) : (
              <Button asChild size="sm" variant="secondary">
                <Link to="/live">View public scoreboard</Link>
              </Button>
            )}
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex items-center gap-1 rounded-control border border-line bg-canvas/50 p-1">
          {FILTERS.map((entry) => (
            <button
              key={entry.value}
              type="button"
              onClick={() => setFilter(entry.value)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-semibold transition',
                filter === entry.value
                  ? 'bg-surface-raised text-ink'
                  : 'text-ink-muted hover:text-ink',
              )}
            >
              {entry.label}
            </button>
          ))}
        </div>
        <Select
          label="Competition filter"
          value={competition}
          onValueChange={setCompetition}
          options={competitionOptions}
          className="sm:w-52"
        />
      </div>

      {shown.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No matches in this view"
          description="Try a different competition or switch between upcoming fixtures and results."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((match) => {
            const home = opponentById.get(match.homeTeamId)
            const away = opponentById.get(match.awayTeamId)
            if (!home || !away) return null
            const score = matchScore(eventsByMatch.get(match.id) ?? [], match)
            const isCompleted = match.status === 'completed'
            const to =
              isCompleted && reportsBase
                ? `${reportsBase}?match=${match.id}`
                : match.status === 'live' && liveHref
                  ? liveHref
                  : undefined
            return (
              <MatchCard
                key={match.id}
                match={match}
                homeTeam={home}
                awayTeam={away}
                homeScore={isCompleted || match.status === 'live' ? score.home : undefined}
                awayScore={isCompleted || match.status === 'live' ? score.away : undefined}
                to={to}
              />
            )
          })}
        </div>
      )}

      <p className="text-[11px] text-ink-faint">
        {completed.length} completed · {upcoming.length} scheduled · {matches.length} total
      </p>
    </div>
  )
}
