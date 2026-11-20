import { Link } from 'react-router-dom'
import { CalendarDays, MapPin } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { PublicGate } from '@/features/public/PublicGate'
import { PublicTeamSwitch, usePublicGender } from '@/features/public/PublicTeamSwitch'
import {
  PublicCompetitionFilter,
  usePublicCompetitionFilter,
  usePublicHref,
} from '@/features/public/PublicCompetitionFilter'
import {
  displayRound,
  filterByCompetition,
  genderLabel,
  matchesForGender,
} from '@/features/public/publicUtils'
import type { PublicData } from '@/features/public/usePublicData'
import type { Match, TeamGender } from '@/types/domain'
import { formatDate, formatTime, formatWeekday } from '@/utils/format'

function groupByMonth(matches: Match[]): { key: string; label: string; matches: Match[] }[] {
  const groups = new Map<string, Match[]>()
  matches.forEach((match) => {
    const key = match.tipoff.slice(0, 7)
    groups.set(key, [...(groups.get(key) ?? []), match])
  })
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({
      key,
      label: formatDate(`${key}-01T12:00:00`, { month: 'long', year: 'numeric' }),
      matches: value,
    }))
}

function FixturesContent({
  data,
  gender,
  setGender,
}: {
  data: PublicData
  gender: TeamGender
  setGender: (gender: TeamGender) => void
}) {
  const href = usePublicHref()
  const { competitions, competitionId, selectedCompetition, setCompetitionId } =
    usePublicCompetitionFilter(data, gender)
  const fixtures = filterByCompetition(matchesForGender(data, gender), competitionId)
    .filter((match) => match.status === 'scheduled' || match.status === 'live' || match.status === 'paused')
    .sort((a, b) => a.tipoff.localeCompare(b.tipoff))
  const groups = groupByMonth(fixtures)

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Fixtures"
        title={`${genderLabel(gender)} fixtures`}
        description={`Upcoming and in-progress matches in ${
          selectedCompetition ? selectedCompetition.name : 'all tournaments'
        }. All times are South African Standard Time.`}
        actions={
          <>
            <PublicCompetitionFilter
              competitions={competitions}
              value={competitionId}
              onChange={setCompetitionId}
            />
            <PublicTeamSwitch gender={gender} onChange={setGender} />
          </>
        }
      />

      {groups.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No fixtures scheduled"
          description={`There are no upcoming ${genderLabel(gender).toLowerCase()} fixtures ${
            selectedCompetition ? `in ${selectedCompetition.name}` : 'published'
          } yet.`}
          action={
            <Button asChild variant="secondary">
              <Link to={href('/results')}>View results</Link>
            </Button>
          }
        />
      ) : (
        groups.map((group) => (
          <section key={group.key} className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-faint">
              {group.label}
            </h2>
            <div className="space-y-2">
              {group.matches.map((match) => {
                const home = data.teamById.get(match.homeTeamId)
                const away = data.teamById.get(match.awayTeamId)
                const competition = data.competitionById.get(match.competitionId)
                const isLive = match.status === 'live' || match.status === 'paused'
                return (
                  <Card key={match.id}>
                    <CardContent className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center">
                      <div className="flex items-center gap-3 sm:w-44">
                        <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-control bg-canvas/60">
                          <span className="text-[9px] font-semibold uppercase text-ink-faint">
                            {formatWeekday(match.tipoff)}
                          </span>
                          <span className="stat-num text-sm leading-none text-ink">
                            {formatDate(match.tipoff, { day: 'numeric' })}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-ink">{formatTime(match.tipoff)}</p>
                          <p className="text-[11px] text-ink-faint">
                            {displayRound(match.round) ?? 'Fixture'}
                          </p>
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">
                          {home?.name ?? 'Home'} <span className="text-ink-faint">vs</span>{' '}
                          {away?.name ?? 'Away'}
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-ink-faint">
                          <span>{competition?.name ?? 'Competition'}</span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" aria-hidden="true" />
                            {match.venue}
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                        <Badge tone={isLive ? 'live' : 'accent'}>
                          {isLive ? 'Live' : 'Scheduled'}
                        </Badge>
                        {isLive ? (
                          <Button asChild size="sm" variant="secondary">
                            <Link to={href('/live')}>Live score</Link>
                          </Button>
                        ) : null}
                        <Button asChild size="sm" variant="ghost">
                          <Link to={href(`/matches/${match.id}`)}>Match centre</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </section>
        ))
      )}
    </div>
  )
}

export function PublicFixturesPage() {
  const [gender, setGender] = usePublicGender()
  return (
    <PublicGate>
      {(data) => <FixturesContent data={data} gender={gender} setGender={setGender} />}
    </PublicGate>
  )
}
