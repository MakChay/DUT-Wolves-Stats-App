import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CalendarDays,
  Camera,
  MapPin,
  Radio,
  Trophy,
  TrendingUp,
  Users,
} from 'lucide-react'
import type { Match, Team, TeamGender } from '@/types/domain'
import { MEDIA_CATEGORY_LABELS, jerseyLabel } from '@/types/domain'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Scoreboard } from '@/components/stats/scoreboard'
import { StatusPill } from '@/components/stats/status-pill'
import { BarList } from '@/components/stats/charts'
import { formatDate, formatTime, signed } from '@/utils/format'
import { PublicGate } from '@/features/public/PublicGate'
import { PublicTeamSwitch, usePublicGender } from '@/features/public/PublicTeamSwitch'
import type { PublicData } from '@/features/public/usePublicData'
import { dataMode } from '@/services/repositories'
import {
  genderLabel,
  matchesForGender,
  scoreOf,
  standingsForGender,
} from '@/features/public/publicUtils'
import { cn } from '@/utils/cn'
import { WolfWatermark } from '@/components/brand/wolf-watermark'

function FixtureRow({
  match,
  data,
  ownTeamId,
}: {
  match: Match
  data: PublicData
  ownTeamId: string
}) {
  const opponentId = match.homeTeamId === ownTeamId ? match.awayTeamId : match.homeTeamId
  const opponent = data.teamById.get(opponentId)
  const dateParts = new Intl.DateTimeFormat('en-ZA', { day: '2-digit', month: 'short' }).formatToParts(
    new Date(match.tipoff),
  )
  const month = dateParts.find((part) => part.type === 'month')?.value
  const day = dateParts.find((part) => part.type === 'day')?.value
  return (
    <div className="flex items-center gap-3 rounded-control border border-line px-3 py-2.5">
      <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-control bg-canvas/60 text-center">
        <span className="text-[9px] font-semibold uppercase text-ink-faint">
          {month?.toUpperCase()}
        </span>
        <span className="stat-num text-sm leading-none text-ink">
          {day}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">
          {match.homeTeamId === ownTeamId ? 'vs' : '@'} {opponent?.name ?? 'Opponent'}
        </p>
        <p className="truncate text-[11px] text-ink-faint">
          {match.round} · {formatTime(match.tipoff)} · {match.venue}
        </p>
      </div>
      <StatusPill status={match.status} />
    </div>
  )
}

function HomeContent({
  data,
  gender,
  setGender,
}: {
  data: PublicData
  gender: TeamGender
  setGender: (gender: TeamGender) => void
}) {
  const genderMatches = matchesForGender(data, gender)
  const dutTeam: Team | undefined = data.teams.find(
    (team) => team.gender === gender && team.id.startsWith('team-') && !team.id.includes('ukzn') && (team.id === 'team-men' || team.id === 'team-women'),
  )
  const ownTeam = dutTeam ?? data.teams.find((team) => team.gender === gender)

  const liveMatch = genderMatches.find((match) => match.status === 'live' || match.status === 'paused')
  const upcoming = genderMatches
    .filter((match) => match.status === 'scheduled')
    .sort((a, b) => a.tipoff.localeCompare(b.tipoff))
  const recent = genderMatches
    .filter((match) => match.status === 'completed')
    .sort((a, b) => b.tipoff.localeCompare(a.tipoff))
  const standings = standingsForGender(data, gender)
  const topScorers = data.topScorers
    .filter((row) => data.teams.find((team) => team.id === row.player.teamId)?.gender === gender)
    .slice(0, 5)

  const featuredMedia = (() => {
    const teamIds = new Set(
      data.teams.filter((team) => team.gender === gender).map((team) => team.id),
    )
    const relevant = data.media.filter(
      (asset) => !asset.teamId || teamIds.has(asset.teamId),
    )
    const featured = relevant.filter((asset) => asset.featured)
    return (featured.length ? featured : relevant).slice(0, 4)
  })()

  const liveScore = liveMatch ? scoreOf(data, liveMatch) : null
  const liveHome = liveMatch ? data.teamById.get(liveMatch.homeTeamId) : null
  const liveAway = liveMatch ? data.teamById.get(liveMatch.awayTeamId) : null
  const heroPhoto =
    gender === 'women' ? '/media/dut-wolves-women.webp' : '/media/dut-wolves-men.webp'

  return (
    <div className="space-y-8">
      <section className="relative isolate min-h-[34rem] overflow-hidden rounded-card border border-line bg-[#0B0D10] sm:min-h-[38rem]">
        <img
          key={gender}
          src={heroPhoto}
          alt={`${genderLabel(gender)} DUT Wolves basketball team`}
          className="absolute inset-0 h-full w-full object-cover object-center"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#080A0D]/95 via-[#080A0D]/70 to-[#080A0D]/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#080A0D]/85 via-transparent to-[#080A0D]/15" />
        <WolfWatermark opacity={0.12} className="mix-blend-screen" />
        <div className="absolute inset-x-0 top-0 h-1 jersey-spectrum" />
        <div className="relative grid grid-cols-1 min-h-[34rem] content-between gap-10 p-5 sm:min-h-[38rem] sm:p-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end lg:gap-8 lg:p-12">
          <div className="max-w-2xl self-center py-8 lg:py-12">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/75">
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[rgb(var(--color-jersey-cyan))]" />
                DUT Wolves Basketball
              </span>
              <span className="text-white/35">/</span>
              <span>{dataMode === 'firebase' ? 'Firebase data' : 'Preview data'}</span>
            </div>
            <h1 className="mt-5 max-w-xl text-5xl font-black uppercase leading-[0.93] tracking-[-0.06em] text-white text-balance sm:text-6xl lg:text-7xl">
              The pack
              <br />
              plays as
              <br />
              <span className="text-[rgb(var(--color-jersey-cyan))]">one.</span>
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-relaxed text-white/75 sm:text-base">
              Follow every possession, fixture and result from the Durban University of Technology
              Wolves men’s and women’s teams.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <PublicTeamSwitch gender={gender} onChange={setGender} className="border-white/20 bg-black/35" />
              <Button asChild size="sm" variant="secondary">
                <Link to="/live">
                  <Radio className="h-4 w-4" aria-hidden="true" />
                  Follow live
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/teams">
                  Explore the teams
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="w-full self-end lg:max-w-[31rem] lg:justify-self-end">
            {liveMatch && liveScore && liveHome && liveAway ? (
              <div className="glass-panel p-3 sm:p-4">
                <div className="mb-3 flex items-center justify-between gap-2 px-1">
                  <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-white">
                    <span className="h-1.5 w-1.5 animate-pulse-live rounded-full bg-danger" />
                    Live from the court
                  </span>
                  <span className="text-[11px] text-white/60">{liveMatch.round}</span>
                </div>
                <Scoreboard
                  homeTeam={liveHome}
                  awayTeam={liveAway}
                  homeScore={liveScore.home}
                  awayScore={liveScore.away}
                  period={liveMatch.period}
                  clockSeconds={liveMatch.clockSeconds}
                  status={liveMatch.status}
                  competition={`${genderLabel(gender)} · ${liveMatch.venue}`}
                />
                <div className="mt-3 flex items-center justify-between gap-2 px-1 text-[11px] text-white/65">
                  <span className="inline-flex items-center gap-1 truncate">
                    <MapPin className="h-3 w-3" aria-hidden="true" />
                    {liveMatch.venue}
                  </span>
                  <Link to="/live" className="shrink-0 font-semibold text-[rgb(var(--color-jersey-cyan))] hover:underline">
                    Open scoreboard
                  </Link>
                </div>
              </div>
            ) : upcoming[0] && ownTeam ? (
              <div className="glass-panel p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">
                      Next on the court
                    </p>
                    <h2 className="mt-1 text-lg font-bold text-white">
                      {genderLabel(gender)} team
                    </h2>
                  </div>
                  <CalendarDays className="h-5 w-5 text-[rgb(var(--color-jersey-cyan))]" aria-hidden="true" />
                </div>
                <div className="mt-4 rounded-control border border-white/10 bg-black/20 p-2">
                  <FixtureRow match={upcoming[0]} data={data} ownTeamId={ownTeam.id} />
                </div>
                <Button asChild variant="secondary" size="sm" className="mt-3 w-full">
                    <Link to="/fixtures">All fixtures</Link>
                </Button>
              </div>
            ) : (
              <div className="glass-panel p-5 text-center sm:p-7">
                  <Radio className="mx-auto h-6 w-6 text-[rgb(var(--color-jersey-cyan))]" aria-hidden="true" />
                  <p className="mt-3 text-sm font-semibold text-white">No game in progress</p>
                  <p className="mt-1 text-xs text-white/65">Check the fixtures page for the next tip-off.</p>
                  <Button asChild variant="secondary" size="sm" className="mt-3">
                    <Link to="/fixtures">View fixtures</Link>
                  </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Upcoming fixtures</CardTitle>
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
            {upcoming.length === 0 || !ownTeam ? (
              <p className="rounded-control border border-dashed border-line px-3 py-6 text-center text-xs text-ink-faint">
                No fixtures scheduled yet.
              </p>
            ) : (
              upcoming.slice(0, 3).map((match) => (
                <FixtureRow key={match.id} match={match} data={data} ownTeamId={ownTeam.id} />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Recent results</CardTitle>
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
            {recent.length === 0 || !ownTeam ? (
              <p className="rounded-control border border-dashed border-line px-3 py-6 text-center text-xs text-ink-faint">
                No completed matches yet.
              </p>
            ) : (
              recent.slice(0, 3).map((match) => {
                const score = scoreOf(data, match)
                const isHome = match.homeTeamId === ownTeam.id
                const own = isHome ? score.home : score.away
                const opp = isHome ? score.away : score.home
                const won = own > opp
                const opponent = data.teamById.get(
                  isHome ? match.awayTeamId : match.homeTeamId,
                )
                return (
                  <div
                    key={match.id}
                    className="flex items-center gap-3 rounded-control border border-line px-3 py-2.5"
                  >
                    <span
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                        won ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger',
                      )}
                    >
                      {won ? 'W' : 'L'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">
                        {isHome ? 'vs' : '@'} {opponent?.shortName ?? 'Opponent'}
                      </p>
                      <p className="truncate text-[11px] text-ink-faint">{formatDate(match.tipoff)}</p>
                    </div>
                    <span className="stat-num text-sm text-ink">
                      {own}–{opp}
                    </span>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Standings</CardTitle>
              <p className="mt-0.5 text-xs text-ink-muted">{genderLabel(gender)} competition</p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/standings">
                Full table
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-2">
            <ul className="divide-y divide-line">
              {standings.slice(0, 5).map((row, index) => {
                const team = data.teamById.get(row.teamId)
                return (
                  <li key={row.teamId} className="flex items-center gap-3 py-2.5">
                    <span className="stat-num w-5 text-xs text-ink-faint">{index + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                      {team?.name ?? row.teamId}
                    </span>
                    <span className="stat-num text-xs text-ink-muted">
                      {row.wins}–{row.losses}
                    </span>
                    <span
                      className={cn(
                        'stat-num w-10 text-right text-xs',
                        row.diff >= 0 ? 'text-success' : 'text-danger',
                      )}
                    >
                      {signed(row.diff)}
                    </span>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Top performers</CardTitle>
              <p className="mt-0.5 text-xs text-ink-muted">{genderLabel(gender)} · points per game</p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/players">
                All players
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-3">
            {topScorers.length === 0 ? (
              <p className="rounded-control border border-dashed border-line px-3 py-6 text-center text-xs text-ink-faint">
                Player statistics are published after completed matches.
              </p>
            ) : (
              <BarList
                items={topScorers.map((row) => ({
                  label: `${jerseyLabel(row.player.jerseyNumber)} ${row.player.firstName} ${row.player.lastName}`,
                  value: row.totals.ppg,
                  meta: 'PPG',
                }))}
              />
            )}
          </CardContent>
        </Card>
      </section>

      {featuredMedia.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-ink">Inside the Wolves</h2>
              <p className="text-xs text-ink-muted">Published photography and match-day graphics.</p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/gallery">
                View gallery
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {featuredMedia.map((asset) => (
              <Link
                key={asset.id}
                to="/gallery"
                className="group relative overflow-hidden rounded-card border border-line"
              >
                <img
                  src={asset.thumbnailUrl ?? asset.url}
                  alt={asset.caption ?? asset.title}
                  className="aspect-[4/5] w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                  loading="lazy"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <span className="absolute inset-x-0 bottom-0 p-2.5">
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-accent">
                    {MEDIA_CATEGORY_LABELS[asset.category]}
                  </span>
                  <span className="line-clamp-1 block text-xs font-semibold text-white">
                    {asset.title}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="relative grid overflow-hidden rounded-card border border-line bg-surface-raised sm:grid-cols-[0.9fr_1.1fr]">
        <div className="relative min-h-56 sm:min-h-72">
          <img
            src="/media/dut-wolves-women-squad.webp"
            alt="DUT Wolves basketball squad celebrating a championship"
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent sm:bg-gradient-to-r" />
        </div>
        <div className="flex flex-col justify-center p-5 sm:p-8 lg:p-10">
          <p className="label-caps">Built on the court</p>
          <h2 className="mt-2 max-w-lg text-2xl font-black uppercase leading-tight tracking-tight text-ink sm:text-3xl">
            More than a score. A season of work.
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink-muted">
            Meet the squads, follow their progress and revisit the moments that move DUT Wolves
            basketball forward.
          </p>
          <Button asChild variant="secondary" size="sm" className="mt-5 w-fit">
            <Link to="/gallery">
              See the Wolves story
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { to: '/teams', icon: Users, title: 'Teams', detail: 'Squads, coaches and season records' },
          { to: '/players', icon: TrendingUp, title: 'Player stats', detail: 'Published scoring and shooting leaders' },
          { to: '/gallery', icon: Camera, title: 'Gallery', detail: 'Team photography, posters and match-day graphics' },
          { to: '/standings', icon: Trophy, title: 'Standings', detail: 'Live competition table' },
        ].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="group rounded-card border border-line bg-surface p-4 transition hover:border-accent/40"
          >
            <item.icon className="h-5 w-5 text-accent" aria-hidden="true" />
            <p className="mt-2.5 text-sm font-semibold text-ink">{item.title}</p>
            <p className="mt-0.5 text-xs text-ink-muted">{item.detail}</p>
            <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-accent">
              Explore
              <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
          </Link>
        ))}
      </section>
    </div>
  )
}

export function PublicHomePage() {
  const [gender, setGender] = usePublicGender()
  return (
    <PublicGate>
      {(data) => <HomeContent data={data} gender={gender} setGender={setGender} />}
    </PublicGate>
  )
}
