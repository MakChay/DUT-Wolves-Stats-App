import { Link } from 'react-router-dom'
import { ArrowRight, CalendarDays, MapPin, Radio } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Scoreboard } from '@/components/stats/scoreboard'
import { PublicGate } from '@/features/public/PublicGate'
import { PublicTeamSwitch, usePublicGender } from '@/features/public/PublicTeamSwitch'
import { genderLabel, matchesForGender, scoreOf } from '@/features/public/publicUtils'
import type { PublicData } from '@/features/public/usePublicData'
import type { Match, TeamGender } from '@/types/domain'
import { formatDate, formatTime } from '@/utils/format'

function LiveCard({ data, match }: { data: PublicData; match: Match }) {
  const home = data.teamById.get(match.homeTeamId)
  const away = data.teamById.get(match.awayTeamId)
  if (!home || !away) return null
  const score = scoreOf(data, match)
  return (
    <div>
      <Scoreboard
        homeTeam={home}
        awayTeam={away}
        homeScore={score.home}
        awayScore={score.away}
        period={match.period}
        clockSeconds={match.clockSeconds}
        status={match.status}
        competition={match.round}
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink-faint">
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3 w-3" aria-hidden="true" />
          {match.venue}
        </span>
        <span className="stat-num">{formatDate(match.tipoff)} · {formatTime(match.tipoff)}</span>
      </div>
    </div>
  )
}

function LiveContent({
  data,
  gender,
  setGender,
}: {
  data: PublicData
  gender: TeamGender
  setGender: (gender: TeamGender) => void
}) {
  const genderMatches = matchesForGender(data, gender)
  const live = genderMatches.filter((match) => match.status === 'live' || match.status === 'paused')
  const next = genderMatches
    .filter((match) => match.status === 'scheduled')
    .sort((a, b) => a.tipoff.localeCompare(b.tipoff))
    .slice(0, 4)
  const recent = genderMatches
    .filter((match) => match.status === 'completed')
    .sort((a, b) => b.tipoff.localeCompare(a.tipoff))
    .slice(0, 3)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Live scores"
        title="Live match centre"
        description="Scores and match status update automatically as courtside events are recorded."
        actions={<PublicTeamSwitch gender={gender} onChange={setGender} />}
      />

      <div className="flex items-center gap-2 rounded-card border border-line bg-surface/60 px-4 py-2.5 text-[11px] text-ink-faint">
        <span className="h-1.5 w-1.5 rounded-full bg-danger" aria-hidden="true" />
        <span>
          Public scoreboard · {genderLabel(gender)} fixtures · scores are provisional until the match is completed.
        </span>
      </div>

      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Radio className="h-4 w-4 text-danger" aria-hidden="true" />
          Live now
        </h2>
        {live.length === 0 ? (
          <EmptyState
            icon={Radio}
            title="No match in progress"
            description={`There is no live ${genderLabel(gender).toLowerCase()} fixture right now. Upcoming games are listed below.`}
            action={
              <Button asChild variant="secondary">
                <Link to="/fixtures">View fixtures</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {live.map((match) => (
              <Card key={match.id}>
                <CardHeader>
                  <div>
                    <CardTitle>{match.round ?? 'Live fixture'}</CardTitle>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {data.competitionById.get(match.competitionId)?.shortName ?? 'Competition'}
                    </p>
                  </div>
                  <Badge tone="live">{match.status === 'paused' ? 'Paused' : 'Live'}</Badge>
                </CardHeader>
                <CardContent className="pt-3">
                  <LiveCard data={data} match={match} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Next fixtures</CardTitle>
              <p className="mt-0.5 text-xs text-ink-muted">{genderLabel(gender)} team</p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/fixtures">
                All
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 pt-3">
            {next.length === 0 ? (
              <p className="rounded-control border border-dashed border-line px-3 py-6 text-center text-xs text-ink-faint">
                No fixtures scheduled.
              </p>
            ) : (
              next.map((match) => {
                const home = data.teamById.get(match.homeTeamId)
                const away = data.teamById.get(match.awayTeamId)
                return (
                  <div key={match.id} className="flex items-center gap-3 rounded-control border border-line px-3 py-2.5">
                    <CalendarDays className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">
                        {home?.shortName ?? 'Home'} vs {away?.shortName ?? 'Away'}
                      </p>
                      <p className="truncate text-[11px] text-ink-faint">
                        {formatDate(match.tipoff)} · {formatTime(match.tipoff)} · {match.venue}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Latest results</CardTitle>
              <p className="mt-0.5 text-xs text-ink-muted">{genderLabel(gender)} team</p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/results">
                All
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 pt-3">
            {recent.length === 0 ? (
              <p className="rounded-control border border-dashed border-line px-3 py-6 text-center text-xs text-ink-faint">
                No completed matches yet.
              </p>
            ) : (
              recent.map((match) => {
                const home = data.teamById.get(match.homeTeamId)
                const away = data.teamById.get(match.awayTeamId)
                const score = scoreOf(data, match)
                return (
                  <div key={match.id} className="flex items-center gap-3 rounded-control border border-line px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">
                        {home?.shortName ?? 'Home'} vs {away?.shortName ?? 'Away'}
                      </p>
                      <p className="truncate text-[11px] text-ink-faint">{formatDate(match.tipoff)}</p>
                    </div>
                    <span className="stat-num text-sm text-ink">
                      {score.home}–{score.away}
                    </span>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

export function PublicLivePage() {
  const [gender, setGender] = usePublicGender()
  return (
    <PublicGate>
      {(data) => <LiveContent data={data} gender={gender} setGender={setGender} />}
    </PublicGate>
  )
}
