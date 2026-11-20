import { Link } from 'react-router-dom'
import { ArrowRight, CalendarDays, Clock, MapPin, Radio, Star, Trophy } from 'lucide-react'
import type { Competition, Match, Team } from '@/types/domain'
import { isDutTeamId } from '@/types/domain'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { StatusPill } from '@/components/stats/status-pill'
import { PublicGate } from '@/features/public/PublicGate'
import {
  PublicCompetitionFilter,
  usePublicCompetition,
  usePublicHref,
} from '@/features/public/PublicCompetitionFilter'
import type { PublicData } from '@/features/public/usePublicData'
import {
  competitionsForMatches,
  courtFromVenue,
  displayRound,
  isPlaceholderTeam,
  scoreOf,
  venueName,
} from '@/features/public/publicUtils'
import { formatLongDate, formatTime } from '@/utils/format'
import { cn } from '@/utils/cn'

interface TimeSlot {
  key: string
  tipoff: string
  matches: Match[]
}

interface DayGroup {
  key: string
  date: string
  slots: TimeSlot[]
}

function groupSchedule(matches: Match[]): DayGroup[] {
  const byDay = new Map<string, Map<string, Match[]>>()
  for (const match of matches) {
    const day = match.tipoff.slice(0, 10)
    const slot = formatTime(match.tipoff)
    if (!byDay.has(day)) byDay.set(day, new Map())
    const slots = byDay.get(day)!
    slots.set(slot, [...(slots.get(slot) ?? []), match])
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, slots]) => ({
      key: day,
      date: `${day}T12:00:00Z`,
      slots: [...slots.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, slotMatches]) => ({
          key,
          tipoff: slotMatches[0].tipoff,
          matches: [...slotMatches].sort((a, b) =>
            (courtFromVenue(a.venue) ?? '').localeCompare(courtFromVenue(b.venue) ?? ''),
          ),
        })),
    }))
}

function TeamRow({
  team,
  teamId,
  score,
  showScore,
}: {
  team?: Team
  teamId: string
  score: number
  showScore: boolean
}) {
  const dut = isDutTeamId(teamId)
  const pending = isPlaceholderTeam(teamId)
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={cn(
            'h-2 w-2 shrink-0 rounded-full',
            dut ? 'bg-accent' : pending ? 'border border-line bg-transparent' : 'bg-ink-faint/50',
          )}
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className={cn('truncate text-sm font-semibold', dut ? 'text-accent' : 'text-ink')}>
            {pending ? 'To be decided' : (team?.shortName ?? team?.name ?? 'TBD')}
          </p>
          {pending ? (
            <p className="truncate text-[10px] text-ink-faint">{team?.name ?? 'Winner of earlier game'}</p>
          ) : null}
        </div>
      </div>
      <span className={cn('stat-num text-base', showScore ? 'text-ink' : 'text-ink-faint')}>
        {showScore ? score : '–'}
      </span>
    </div>
  )
}

function MatchupCard({
  match,
  data,
  isNext,
}: {
  match: Match
  data: PublicData
  isNext: boolean
}) {
  const href = usePublicHref()
  const home = data.teamById.get(match.homeTeamId)
  const away = data.teamById.get(match.awayTeamId)
  const score = scoreOf(data, match)
  const court = courtFromVenue(match.venue)
  const dutMatch = isDutTeamId(match.homeTeamId) || isDutTeamId(match.awayTeamId)
  const live = match.status === 'live' || match.status === 'paused'
  const showScore = live || match.status === 'completed'

  return (
    <Card
      className={cn(
        'h-full transition-colors',
        live && 'border-danger/40',
        dutMatch && !live && 'border-accent/40',
        isNext && 'ring-1 ring-accent/60',
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between gap-2 border-b border-line px-3 py-2',
          live && 'bg-danger/5',
          isNext && !live && 'bg-accent/5',
        )}
      >
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-[10px] font-bold uppercase tracking-wider text-ink-faint">
            {court ?? 'Match'}
          </span>
          {dutMatch ? <Star className="h-3 w-3 shrink-0 text-accent" aria-label="DUT Wolves" /> : null}
        </div>
        <StatusPill status={match.status} />
      </div>
      <CardContent className="space-y-2.5 p-3">
        <TeamRow
          team={home}
          teamId={match.homeTeamId}
          score={score.home}
          showScore={showScore}
        />
        <TeamRow
          team={away}
          teamId={match.awayTeamId}
          score={score.away}
          showScore={showScore}
        />
        <div className="flex items-center justify-between gap-2 border-t border-line pt-2">
          <span className="truncate text-[10px] text-ink-faint">
            {displayRound(match.round) ?? 'Fixture'}
          </span>
          <Link
            to={href(`/matches/${match.id}`)}
            className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-accent hover:underline"
          >
            Details
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

function CompetitionBanner({
  competition,
  matches,
  nextMatch,
  data,
}: {
  competition: Competition
  matches: Match[]
  nextMatch?: Match
  data: PublicData
}) {
  const first = matches[0]
  const venue = venueName(first?.venue ?? '')
  const nextTeams = nextMatch
    ? [nextMatch.homeTeamId, nextMatch.awayTeamId]
        .map((id) => {
          if (isPlaceholderTeam(id)) return 'TBD'
          const team = data.teamById.get(id)
          return team?.shortName ?? team?.name ?? 'TBD'
        })
        .join(' vs ')
    : null

  return (
    <div className="relative overflow-hidden rounded-card bg-[#0B0D10] p-5 text-white sm:p-7">
      <div className="jersey-spectrum absolute inset-x-0 top-0 h-1" aria-hidden="true" />
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgb(var(--color-jersey-cyan))]">
        Tournament · {competition.shortName ?? 'Finals'}
      </p>
      <h2 className="mt-2 max-w-2xl text-2xl font-black uppercase leading-tight tracking-tight sm:text-3xl">
        {competition.name}
      </h2>
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-white/70">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
          {formatLongDate(first?.tipoff ?? competition.startDate)}
        </span>
        {venue ? (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {venue}
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          All times SAST (UTC+2)
        </span>
      </div>

      {nextMatch ? (
        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-control border border-white/15 bg-white/[0.06] px-3 py-2.5">
          <Radio className="h-4 w-4 shrink-0 text-[rgb(var(--color-jersey-cyan))]" aria-hidden="true" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">
            {nextMatch.status === 'live' || nextMatch.status === 'paused' ? 'On court now' : 'Next up'}
          </span>
          <span className="stat-num text-sm font-semibold text-white">{formatTime(nextMatch.tipoff)}</span>
          <span className="min-w-0 truncate text-sm text-white/90">{nextTeams}</span>
          <span className="text-[11px] text-white/50">{courtFromVenue(nextMatch.venue)}</span>
        </div>
      ) : null}
    </div>
  )
}

function ScheduleContent({ data }: { data: PublicData }) {
  const href = usePublicHref()
  const [rawCompetitionId, setCompetitionId] = usePublicCompetition()
  const allTournaments = competitionsForMatches(data, data.matches).filter(
    (competition) => competition.type === 'tournament',
  )
  const competitionId =
    rawCompetitionId && allTournaments.some((entry) => entry.id === rawCompetitionId)
      ? rawCompetitionId
      : ''
  const tournaments = allTournaments
    .filter((competition) => !competitionId || competition.id === competitionId)
    .map((competition) => ({
      competition,
      matches: data.matches
        .filter((match) => match.competitionId === competition.id && match.publicVisible)
        .sort((a, b) => a.tipoff.localeCompare(b.tipoff)),
    }))
    .filter((entry) => entry.matches.length > 0)

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Broadcast schedule"
        title="Tournament schedule"
        description="Every tip-off, court and matchup in one place. Times are shown in South African Standard Time (SAST)."
        actions={
          <>
            <PublicCompetitionFilter
              competitions={allTournaments}
              value={competitionId}
              onChange={setCompetitionId}
            />
            <Button asChild variant="secondary" size="sm">
              <Link to={href('/fixtures')}>All fixtures</Link>
            </Button>
          </>
        }
      />

      {tournaments.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No tournament fixtures published"
          description="Scheduled tournament games will appear here once they are published."
        />
      ) : (
        tournaments.map(({ competition, matches }) => {
          const liveMatch = matches.find(
            (match) => match.status === 'live' || match.status === 'paused',
          )
          const nextMatch =
            liveMatch ?? matches.find((match) => match.status === 'scheduled')
          const days = groupSchedule(matches)

          return (
            <section key={competition.id} className="space-y-5">
              <CompetitionBanner
                competition={competition}
                matches={matches}
                nextMatch={nextMatch}
                data={data}
              />

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[11px] text-ink-faint">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
                  DUT Wolves fixture
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full border border-line" aria-hidden="true" />
                  To be decided from an earlier game
                </span>
                <span>Scores appear once a game is live or final.</span>
              </div>

              {days.map((day) => (
                <div key={day.key} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-ink">
                      {formatLongDate(day.date)}
                    </h3>
                    <div className="h-px flex-1 bg-line" />
                  </div>

                  {day.slots.map((slot) => (
                    <div
                      key={slot.key}
                      className="grid grid-cols-[3.25rem_1fr] gap-3 sm:grid-cols-[4.5rem_1fr] sm:gap-5"
                    >
                      <div className="pt-1">
                        <p className="stat-num text-lg font-bold leading-none text-ink sm:text-xl">
                          {slot.key}
                        </p>
                        <p className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-ink-faint">
                          SAST
                        </p>
                      </div>
                      <div
                        className={cn(
                          'grid gap-2',
                          slot.matches.length > 1 && 'md:grid-cols-2',
                        )}
                      >
                        {slot.matches.map((match) => (
                          <MatchupCard
                            key={match.id}
                            match={match}
                            data={data}
                            isNext={nextMatch?.id === match.id}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </section>
          )
        })
      )}
    </div>
  )
}

export function PublicSchedulePage() {
  return (
    <PublicGate>
      {(data) => <ScheduleContent data={data} />}
    </PublicGate>
  )
}
