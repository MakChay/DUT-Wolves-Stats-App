import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleOff,
  ClipboardCheck,
  Clock,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Square,
  UserRoundPlus,
  WifiOff,
} from 'lucide-react'
import type {
  Match,
  MatchEvent,
  MatchEventType,
  MatchRoster,
  Player,
  PostMatchTeamReport,
  Team,
} from '@/types/domain'
import { EVENT_LABELS, EVENT_POINTS, isDutTeamId, jerseyLabel } from '@/types/domain'
import { derivePlayerGameStats, formatClock, matchScore, teamScore } from '@/services/analytics/stats'
import { captureMatchSnapshot } from '@/services/snapshots/capture'
import { repositories } from '@/services/repositories'
import { useAsync } from '@/hooks/useAsync'
import { useTeamScope } from '@/features/teams/TeamScopeContext'
import { useAuth } from '@/features/auth/AuthContext'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Select } from '@/components/ui/select'
import { EmptyState } from '@/components/ui/empty-state'
import { SkeletonCard } from '@/components/ui/skeleton'
import { Scoreboard } from '@/components/stats/scoreboard'
import { PlayerAvatar } from '@/components/stats/player-avatar'
import { buildPlayerMap, EventTimeline } from '@/components/stats/event-timeline'
import { PostMatchReportDialog } from '@/features/reports/PostMatchReportDialog'
import { reportForTeam } from '@/features/reports/reporting'
import { cn } from '@/utils/cn'
import { formatDate, uid } from '@/utils/format'

interface LoadedMatch {
  match: Match
  rosters: MatchRoster[]
  events: MatchEvent[]
  players: Player[]
  allTeams: Team[]
  reports: PostMatchTeamReport[]
}

async function loadMatch(
  matchId: string,
  teamId: string | null,
  isAdmin: boolean,
): Promise<LoadedMatch | null> {
  const match = await repositories.matches.getById(matchId)
  if (!match) return null
  const dutTeamIds = [match.homeTeamId, match.awayTeamId].filter(isDutTeamId)
  const readTeamIds = isAdmin
    ? dutTeamIds
    : teamId && dutTeamIds.includes(teamId)
      ? [teamId]
      : []
  if (readTeamIds.length === 0) return null

  const [rosters, events, teamPlayerLists, allTeams, reportLists] = await Promise.all([
    Promise.all(
      readTeamIds.map((id) => repositories.rosters.listByMatchAndTeam(matchId, id, true)),
    ).then((rows) => rows.flat()),
    repositories.events.listByMatch(matchId),
    Promise.all(readTeamIds.map((id) => repositories.players.listByTeam(id))),
    repositories.teams.list(),
    Promise.all(readTeamIds.map((id) => repositories.reports.listByTeam(id))),
  ])
  const players = teamPlayerLists.flat()
  const reports = reportLists.flat().filter((report) => report.matchId === matchId)
  return { match, rosters, events, players, allTeams, reports }
}

type ActionTone = 'make' | 'miss' | 'neutral' | 'turnover' | 'foul'

interface ActionDef {
  type: MatchEventType
  label: string
  short: string
  tone: ActionTone
  section: 'Scoring' | 'Possession'
}

const actions: ActionDef[] = [
  { type: 'FG2_MADE', label: '2PT Made', short: '+2', tone: 'make', section: 'Scoring' },
  { type: 'FG2_MISS', label: '2PT Missed', short: 'Miss', tone: 'miss', section: 'Scoring' },
  { type: 'FG3_MADE', label: '3PT Made', short: '+3', tone: 'make', section: 'Scoring' },
  { type: 'FG3_MISS', label: '3PT Missed', short: 'Miss', tone: 'miss', section: 'Scoring' },
  { type: 'FT_MADE', label: 'FT Made', short: '+1', tone: 'make', section: 'Scoring' },
  { type: 'FT_MISS', label: 'FT Missed', short: 'Miss', tone: 'miss', section: 'Scoring' },
  { type: 'REB_OFF', label: 'Off. Rebound', short: 'ORB', tone: 'neutral', section: 'Possession' },
  { type: 'REB_DEF', label: 'Def. Rebound', short: 'DRB', tone: 'neutral', section: 'Possession' },
  { type: 'ASSIST', label: 'Assist', short: 'AST', tone: 'neutral', section: 'Possession' },
  { type: 'STEAL', label: 'Steal', short: 'STL', tone: 'neutral', section: 'Possession' },
  { type: 'BLOCK', label: 'Block', short: 'BLK', tone: 'neutral', section: 'Possession' },
  { type: 'TURNOVER', label: 'Turnover', short: 'TO', tone: 'turnover', section: 'Possession' },
  { type: 'FOUL', label: 'Personal Foul', short: 'PF', tone: 'foul', section: 'Possession' },
]

const TONE_CLASSES: Record<ActionTone, string> = {
  make: 'border-success/30 bg-success/10 text-success hover:bg-success/20 active:bg-success/25',
  miss: 'border-danger/30 bg-danger/[0.08] text-danger hover:bg-danger/15 active:bg-danger/20',
  neutral: 'border-line bg-surface-raised text-ink hover:border-accent/25 hover:bg-surface active:bg-surface',
  turnover: 'border-warning/30 bg-warning/[0.08] text-warning hover:bg-warning/15',
  foul: 'border-danger/25 bg-danger/[0.06] text-danger hover:bg-danger/10',
}

function ActionButton({
  action,
  disabled,
  onRecord,
}: {
  action: ActionDef
  disabled: boolean
  onRecord: (type: MatchEventType) => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onRecord(action.type)}
      className={cn(
        'flex min-h-[62px] flex-col items-center justify-center rounded-control border px-2 py-2 text-center transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-35',
        TONE_CLASSES[action.tone],
      )}
      aria-label={action.label}
    >
      <span className="text-[13px] font-bold leading-tight">{action.label}</span>
      <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider opacity-70">
        {action.short}
      </span>
    </button>
  )
}

export function LiveMatchPage() {
  const { matchId } = useParams<{ matchId: string }>()
  const { teamId } = useTeamScope()
  const { user } = useAuth()
  const { data, loading, error, reload } = useAsync<LoadedMatch | null>(
    () => (matchId ? loadMatch(matchId, teamId, user?.role === 'admin') : Promise.resolve(null)),
    [matchId, teamId, user?.role],
  )

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonCard lines={3} />
        <SkeletonCard lines={8} />
      </div>
    )
  }

  if (error) {
    return (
      <EmptyState
        icon={CircleOff}
        title="Match could not be loaded"
        description={error}
        action={<Button onClick={reload}>Try again</Button>}
      />
    )
  }

  if (!data) {
    return (
      <EmptyState
        icon={Radio}
        title="Match not found"
        description="This match does not exist, or you do not have access to it."
        action={
          <Button asChild>
            <Link to="/manager/matches">Back to matches</Link>
          </Button>
        }
      />
    )
  }

  const ownTeamId =
    data.match.homeTeamId === teamId || data.match.awayTeamId === teamId
      ? (teamId ?? data.match.homeTeamId)
      : data.match.homeTeamId

  return <LiveMatchCentre key={data.match.id} loaded={data} ownTeamId={ownTeamId} />
}

function LiveMatchCentre({ loaded, ownTeamId }: { loaded: LoadedMatch; ownTeamId: string }) {
  const { match: initialMatch, rosters, events: initialEvents, players, allTeams, reports } = loaded
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const ownTeam = allTeams.find((team) => team.id === ownTeamId) ?? allTeams[0]!
  const opponentId = initialMatch.homeTeamId === ownTeamId ? initialMatch.awayTeamId : initialMatch.homeTeamId
  const opponent = allTeams.find((team) => team.id === opponentId) ?? ownTeam
  const homeTeam = allTeams.find((team) => team.id === initialMatch.homeTeamId) ?? ownTeam
  const awayTeam = allTeams.find((team) => team.id === initialMatch.awayTeamId) ?? opponent

  const ownRoster = useMemo(
    () => rosters.filter((entry) => entry.teamId === ownTeamId),
    [rosters, ownTeamId],
  )
  const playerById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players])
  const playerMap = useMemo(
    () => buildPlayerMap([...playerById.values()]),
    [playerById],
  )

  const [match, setMatch] = useState<Match>(initialMatch)
  const [events, setEvents] = useState<MatchEvent[]>(initialEvents)
  const [clockSeconds, setClockSeconds] = useState(initialMatch.clockSeconds)
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [onCourt, setOnCourt] = useState<Set<string>>(
    () => new Set(ownRoster.filter((entry) => entry.isStarter).map((entry) => entry.playerId)),
  )
  const [clockRunning, setClockRunning] = useState(initialMatch.status === 'live')
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)
  const [syncing, setSyncing] = useState(false)
  const [lastAction, setLastAction] = useState<string | null>(null)
  const [subOpen, setSubOpen] = useState(false)
  const [endOpen, setEndOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [ownReport, setOwnReport] = useState<PostMatchTeamReport | null>(() =>
    reportForTeam(reports, initialMatch.id, ownTeamId),
  )
  const [subOut, setSubOut] = useState('')
  const [subIn, setSubIn] = useState('')
  const actionTimer = useRef<number | null>(null)

  const completed = match.status === 'completed'

  useEffect(() => {
    const onOnline = () => setIsOnline(true)
    const onOffline = () => setIsOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  useEffect(() => {
    if (!clockRunning || completed) return
    const interval = window.setInterval(() => {
      setClockSeconds((current) => {
        if (current <= 1) {
          setClockRunning(false)
          return 0
        }
        return current - 1
      })
    }, 1000)
    return () => window.clearInterval(interval)
  }, [clockRunning, completed])

  useEffect(() => {
    return () => {
      if (actionTimer.current) window.clearTimeout(actionTimer.current)
    }
  }, [])

  const ownScore = teamScore(events, ownTeamId, match.id)
  const opponentScore = teamScore(events, opponentId, match.id)
  const homeScore = initialMatch.homeTeamId === ownTeamId ? ownScore : opponentScore
  const awayScore = initialMatch.homeTeamId === ownTeamId ? opponentScore : ownScore
  const score = matchScore(events, initialMatch)

  const selectedPlayer = selectedPlayerId ? playerById.get(selectedPlayerId) ?? null : null
  const selectedStats = selectedPlayer
    ? derivePlayerGameStats(events, selectedPlayer.id, ownTeamId, match.id)
    : null

  const onCourtPlayers = ownRoster
    .filter((entry) => onCourt.has(entry.playerId))
    .map((entry) => ({ entry, player: playerById.get(entry.playerId) }))
    .filter((row): row is { entry: MatchRoster; player: Player } => Boolean(row.player))
  const benchPlayers = ownRoster
    .filter((entry) => !onCourt.has(entry.playerId))
    .map((entry) => ({ entry, player: playerById.get(entry.playerId) }))
    .filter((row): row is { entry: MatchRoster; player: Player } => Boolean(row.player))

  const ownEvents = events.filter((event) => event.teamId === ownTeamId && !event.voided)
  const opponentScoreEvents = events.filter(
    (event) => event.teamId === opponentId && !event.voided && event.type === 'TEAM_SCORE',
  )
  const timelineEvents = events.filter(
    (event) =>
      event.teamId === ownTeamId ||
      (event.teamId === opponentId && event.type === 'TEAM_SCORE'),
  )
  const timelineTeamNames = new Map([
    [ownTeamId, ownTeam.name],
    [opponentId, opponent.name],
  ])

  const flash = (message: string) => {
    setLastAction(message)
    if (actionTimer.current) window.clearTimeout(actionTimer.current)
    actionTimer.current = window.setTimeout(() => setLastAction(null), 3500)
  }

  const persistClock = useCallback(
    (status: Match['status'], clock: number, period: number) => {
      void repositories.matches.update(match.id, {
        status,
        clockSeconds: clock,
        period,
      })
    },
    [match.id],
  )

  const record = useCallback(
    (
      type: MatchEventType,
      playerId?: string,
      eventTeamId = ownTeamId,
      points = EVENT_POINTS[type],
    ) => {
      if (completed) return
      const player = playerId ? playerById.get(playerId) : undefined
      const event: MatchEvent = {
        id: uid('evt'),
        clientEventId: uid('cli'),
        matchId: match.id,
        teamId: eventTeamId,
        playerId,
        type,
        period: match.period,
        clockSeconds,
        createdAt: new Date().toISOString(),
        recordedBy: user?.id ?? 'unknown',
        points,
      }
      setEvents((current) => [event, ...current])
      setSyncing(true)
      const playerLabel = player
        ? [jerseyLabel(player.jerseyNumber), player.firstName, player.lastName].filter(Boolean).join(' ')
        : ''
      const eventLabel =
        type === 'TEAM_SCORE'
          ? `${opponent.shortName} +${points ?? 0}`
          : playerLabel
            ? `${playerLabel} — ${EVENT_LABELS[type]}`
            : EVENT_LABELS[type]
      flash(eventLabel)
      repositories.events
        .record(event)
        .catch(() => {
          toast({
            title: 'Event kept locally',
            description: 'The event could not be saved. It stays in this device’s history until the connection returns.',
            tone: 'error',
          })
        })
        .finally(() => setSyncing(false))
    },
    [completed, playerById, match.id, match.period, clockSeconds, ownTeamId, opponent.shortName, user?.id, toast],
  )

  const handleAction = (type: MatchEventType) => {
    if (!selectedPlayerId) {
      toast({
        title: 'Select a player first',
        description: 'Choose an on-court DUT player, then record the action.',
        tone: 'info',
      })
      return
    }
    record(type, selectedPlayerId)
  }

  const voidEvent = async (event: MatchEvent, reason = 'Corrected by manager') => {
    setEvents((current) =>
      current.map((entry) =>
        entry.id === event.id
          ? {
              ...entry,
              voided: true,
              voidedAt: new Date().toISOString(),
              voidedBy: user?.id ?? 'unknown',
              voidReason: reason,
            }
          : entry,
      ),
    )
    try {
      await repositories.events.voidEvent(event.id, user?.id ?? 'unknown', reason)
      const player = event.playerId ? playerById.get(event.playerId) : undefined
      const playerLabel = player
        ? `${jerseyLabel(player.jerseyNumber)} ${player.lastName}`.trim()
        : event.teamId === opponentId
          ? opponent.shortName
          : 'Team'
      toast({
        title: 'Event voided',
        description: `${playerLabel} — ${EVENT_LABELS[event.type]}. Original history is preserved.`,
        tone: 'success',
      })
    } catch {
      toast({ title: 'Could not void event', description: 'Please try again.', tone: 'error' })
    }
  }

  const undoLast = () => {
    const target = [...ownEvents]
      .filter((event) => Boolean(event.playerId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
    if (!target) {
      toast({ title: 'Nothing to undo', description: 'No player events have been recorded yet.', tone: 'info' })
      return
    }
    void voidEvent(target, 'Undo last event')
  }

  const undoOpponentScore = () => {
    const target = [...opponentScoreEvents].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    )[0]
    if (!target) {
      toast({ title: 'No opponent score to undo', tone: 'info' })
      return
    }
    void voidEvent(target, 'Corrected opponent score')
  }

  const toggleClock = () => {
    if (completed) return
    const next = !clockRunning
    setClockRunning(next)
    const nextStatus: Match['status'] = next ? 'live' : 'paused'
    setMatch((current) => ({ ...current, status: nextStatus }))
    persistClock(nextStatus, clockSeconds, match.period)
  }

  const resetClock = () => {
    setClockSeconds(600)
    setClockRunning(false)
    persistClock('paused', 600, match.period)
  }

  const adjustClock = (delta: number) => {
    setClockSeconds((current) => Math.max(0, Math.min(600, current + delta)))
  }

  const setPeriod = (period: number) => {
    if (period < 1 || period > 4) return
    const nextClock = period === match.period ? clockSeconds : 600
    setClockSeconds(nextClock)
    setMatch((current) => ({ ...current, period }))
    persistClock(match.status === 'live' ? 'live' : 'paused', nextClock, period)
  }

  const confirmSubstitution = () => {
    if (!subOut || !subIn) return
    record('SUB_OUT', subOut)
    record('SUB_IN', subIn)
    setOnCourt((current) => {
      const next = new Set(current)
      next.delete(subOut)
      next.add(subIn)
      return next
    })
    setSelectedPlayerId(subIn)
    setSubOpen(false)
    setSubOut('')
    setSubIn('')
    const incoming = playerById.get(subIn)
    flash(incoming ? `${jerseyLabel(incoming.jerseyNumber)} ${incoming.lastName} checked in` : 'Substitution recorded')
  }

  const endMatch = async () => {
    setClockRunning(false)
    setMatch((current) => ({ ...current, status: 'completed', clockSeconds: 0 }))
    setClockSeconds(0)
    await repositories.matches.update(match.id, { status: 'completed', clockSeconds: 0 })
    if (user) {
      try {
        await captureMatchSnapshot({
          match: { ...match, status: 'completed', clockSeconds: 0 },
          events,
          players,
          userId: user.id,
        })
      } catch (snapshotError) {
        console.error('Could not capture the final match snapshot.', snapshotError)
      }
    }
    setEndOpen(false)
    if (!ownReport) {
      toast({
        title: 'Match ended — report required',
        description:
          'Submit the mandatory post-match team report to make this match administratively complete.',
        tone: 'info',
      })
      setReportOpen(true)
    } else {
      toast({
        title: 'Match completed',
        description: 'Final scores and box scores are now locked.',
        tone: 'success',
      })
    }
  }

  const handleReportSubmitted = async (updated: Match | null) => {
    if (updated) setMatch(updated)
    const latest = await repositories.reports.getByMatchAndTeam(match.id, ownTeamId)
    setOwnReport(latest)
    if (updated?.adminComplete) {
      toast({
        title: 'Match administratively complete',
        description: 'The mandatory team report is on file.',
        tone: 'success',
      })
    }
  }

  const statusLabel = completed
    ? 'Match completed'
    : !isOnline
      ? 'Offline · queued'
      : syncing
        ? 'Syncing…'
        : 'Synced'

  return (
    <div className="space-y-4 pb-24 lg:pb-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/manager/matches">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Matches
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Badge tone={!isOnline ? 'warning' : syncing ? 'accent' : 'success'}>
            {!isOnline ? <WifiOff className="h-3 w-3" aria-hidden="true" /> : <CheckCircle2 className="h-3 w-3" aria-hidden="true" />}
            {statusLabel}
          </Badge>
          <Badge tone="neutral">{formatDate(initialMatch.tipoff)}</Badge>
        </div>
      </div>

      <Scoreboard
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        homeScore={homeScore}
        awayScore={awayScore}
        period={match.period}
        clockSeconds={clockSeconds}
        status={match.status}
        competition={`${match.round ?? 'Match'} · ${opponent.name}`}
      />

      <div className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>{opponent.shortName} score</CardTitle>
                <p className="mt-0.5 text-xs text-ink-muted">
                  Record only the opponent’s team score. No opponent player statistics are collected.
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((points) => (
                  <Button
                    key={points}
                    variant="secondary"
                    size="md"
                    onClick={() => record('TEAM_SCORE', undefined, opponentId, points)}
                    disabled={completed}
                  >
                    +{points}
                  </Button>
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={undoOpponentScore}
                disabled={completed || opponentScoreEvents.length === 0}
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Correct most recent score
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="items-center">
              <div>
                <CardTitle>Select DUT player</CardTitle>
                <p className="mt-0.5 text-xs text-ink-muted">
                  Choose an on-court player to record individual statistics.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSubOpen(true)
                  setSubOut('')
                  setSubIn('')
                }}
                disabled={completed}
              >
                <UserRoundPlus className="h-4 w-4" aria-hidden="true" />
                Substitution
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 pt-3">
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
                {onCourtPlayers.map(({ player }) => {
                  const stats = derivePlayerGameStats(events, player.id, ownTeamId, match.id)
                  const fouledOut = stats.pf >= 5
                  return (
                    <button
                      key={player.id}
                      type="button"
                      disabled={fouledOut || completed}
                      onClick={() => setSelectedPlayerId(player.id)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 rounded-control border px-2 py-2.5 transition disabled:opacity-40',
                        selectedPlayerId === player.id
                          ? 'border-accent/60 bg-accent/10'
                          : 'border-line bg-canvas/40 hover:border-white/20',
                      )}
                      aria-pressed={selectedPlayerId === player.id}
                    >
                      <PlayerAvatar player={player} selected={selectedPlayerId === player.id} />
                      <span className="w-full truncate text-center text-[11px] font-semibold text-ink">
                        {player.lastName}
                      </span>
                      <span className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-ink-faint">
                        {player.position}
                        {stats.pf > 0 ? <span className={stats.pf >= 4 ? 'text-warning' : ''}>{stats.pf} PF</span> : null}
                      </span>
                      {fouledOut ? <span className="text-[9px] font-bold text-danger">FOULED OUT</span> : null}
                    </button>
                  )
                })}
              </div>
              {benchPlayers.length > 0 ? (
                <details className="group">
                  <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-wider text-ink-faint hover:text-ink-muted">
                    Bench ({benchPlayers.length}) · view
                  </summary>
                  <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                    {benchPlayers.map(({ player }) => (
                      <div
                        key={player.id}
                        className="flex items-center gap-2 rounded-control border border-line/70 bg-canvas/30 px-2 py-1.5 opacity-70"
                      >
                        <PlayerAvatar player={player} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-medium text-ink">{player.lastName}</p>
                          <p className="text-[9px] uppercase text-ink-faint">{player.position}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              ) : null}

              {selectedPlayer && selectedStats ? (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-control border border-accent/20 bg-accent/[0.05] px-3 py-2">
                  <span className="text-xs font-semibold text-ink">
                    {jerseyLabel(selectedPlayer.jerseyNumber)} {selectedPlayer.firstName} {selectedPlayer.lastName}
                  </span>
                  <span className="text-[11px] text-ink-muted">
                    {selectedStats.points} PTS · {selectedStats.reb} REB · {selectedStats.ast} AST · {selectedStats.pf} PF
                  </span>
                </div>
              ) : (
                <p className="rounded-control border border-dashed border-line px-3 py-2 text-center text-[11px] text-ink-faint">
                  No DUT player selected — actions are disabled until you pick one.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Record action</CardTitle>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {selectedPlayer
                    ? `Recording for ${jerseyLabel(selectedPlayer.jerseyNumber)} ${selectedPlayer.lastName}`
                    : 'Select an on-court DUT player to enable the action panel'}
                </p>
              </div>
              {lastAction ? (
                <span className="hidden max-w-[45%] truncate text-[11px] font-medium text-success sm:block animate-slide-up">
                  ✓ {lastAction}
                </span>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-3 pt-3">
              <div>
                <p className="label-caps mb-1.5">Scoring</p>
                <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
                  {actions
                    .filter((action) => action.section === 'Scoring')
                    .map((action) => (
                      <ActionButton
                        key={action.type}
                        action={action}
                        disabled={!selectedPlayerId || completed}
                        onRecord={handleAction}
                      />
                    ))}
                </div>
              </div>
              <div>
                <p className="label-caps mb-1.5">Possession & discipline</p>
                <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 xl:grid-cols-7">
                  {actions
                    .filter((action) => action.section === 'Possession')
                    .map((action) => (
                      <ActionButton
                        key={action.type}
                        action={action}
                        disabled={!selectedPlayerId || completed}
                        onRecord={handleAction}
                      />
                    ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-line pt-3">
                <Button variant="secondary" size="md" onClick={undoLast} disabled={completed}>
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  Undo last
                </Button>
                <Button variant="secondary" size="md" onClick={() => setSubOpen(true)} disabled={completed}>
                  <UserRoundPlus className="h-4 w-4" aria-hidden="true" />
                  Substitution
                </Button>
                <Button variant="danger" size="md" className="ml-auto" onClick={() => setEndOpen(true)} disabled={completed}>
                  <Square className="h-3.5 w-3.5" aria-hidden="true" />
                  End match
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="items-center">
              <CardTitle>Clock & periods</CardTitle>
              <div className="flex items-center gap-1.5">
                <Badge tone={match.status === 'live' ? 'live' : match.status === 'paused' ? 'warning' : 'neutral'}>
                  {match.status === 'live' ? 'Running' : match.status === 'paused' ? 'Paused' : match.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              <div className="flex items-center justify-between rounded-control border border-line bg-canvas/50 px-3 py-3">
                <div>
                  <p className="label-caps">Game clock</p>
                  <p className="stat-num text-4xl leading-none text-ink">{formatClock(clockSeconds)}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="icon"
                    variant={clockRunning ? 'secondary' : 'primary'}
                    onClick={toggleClock}
                    disabled={completed}
                    aria-label={clockRunning ? 'Pause clock' : 'Start clock'}
                  >
                    {clockRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={resetClock} disabled={completed} aria-label="Reset clock to 10 minutes">
                    <Clock className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" onClick={() => adjustClock(-10)} disabled={completed} aria-label="Subtract 10 seconds">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-[10px] uppercase tracking-wider text-ink-faint">-10s</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" onClick={() => adjustClock(10)} disabled={completed} aria-label="Add 10 seconds">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <span className="text-[10px] uppercase tracking-wider text-ink-faint">+10s</span>
                </div>
              </div>

              <div>
                <p className="label-caps mb-1.5">Period</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {[1, 2, 3, 4].map((period) => (
                    <button
                      key={period}
                      type="button"
                      onClick={() => setPeriod(period)}
                      disabled={completed}
                      className={cn(
                        'rounded-control border py-2 text-xs font-bold transition',
                        match.period === period
                          ? 'border-accent/50 bg-accent/10 text-accent'
                          : 'border-line bg-canvas/40 text-ink-muted hover:border-white/20 hover:text-ink',
                      )}
                    >
                      Q{period}
                    </button>
                  ))}
                </div>
              </div>
              {clockSeconds === 0 && !completed ? (
                <p className="text-[11px] leading-relaxed text-warning">
                  Clock reached 00:00. Move to the next period or adjust the clock.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Event history</CardTitle>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {timelineEvents.length} events · opponent team scores only · newest first
                </p>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <EventTimeline
                events={timelineEvents}
                players={playerMap}
                teamNames={timelineTeamNames}
                onVoid={(event) => void voidEvent(event)}
                maxHeight="max-h-[420px]"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Score check</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 pt-2">
              <div className="rounded-control border border-line bg-canvas/40 p-3 text-center">
                <p className="truncate text-[11px] text-ink-faint">{ownTeam.shortName}</p>
                <p className="stat-num mt-1 text-2xl text-ink">{ownScore}</p>
              </div>
              <div className="rounded-control border border-line bg-canvas/40 p-3 text-center">
                <p className="truncate text-[11px] text-ink-faint">{opponent.shortName}</p>
                <p className="stat-num mt-1 text-2xl text-ink">{opponentScore}</p>
              </div>
              <p className="col-span-2 text-center text-[11px] text-ink-faint">
                {score.home !== homeScore || score.away !== awayScore ? 'Recalculating…' : 'Derived live from events'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={subOpen} onOpenChange={setSubOpen}>
        <DialogContent
          title="Substitution"
          description="Record the outgoing and incoming player. Both events are written to the match history."
          footer={
            <>
              <Button variant="ghost" onClick={() => setSubOpen(false)}>
                Cancel
              </Button>
              <Button onClick={confirmSubstitution} disabled={!subOut || !subIn || completed}>
                Confirm substitution
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-ink-muted">Player going out</p>
              <Select
                label="Player going out"
                value={subOut}
                onValueChange={setSubOut}
                options={onCourtPlayers.map(({ player }) => ({
                  value: player.id,
                  label: `${jerseyLabel(player.jerseyNumber)} ${player.firstName} ${player.lastName}`,
                }))}
                placeholder="Select on-court player"
                className="w-full"
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-ink-muted">Player coming in</p>
              <Select
                label="Player coming in"
                value={subIn}
                onValueChange={setSubIn}
                options={benchPlayers.map(({ player }) => ({
                  value: player.id,
                  label: `${jerseyLabel(player.jerseyNumber)} ${player.firstName} ${player.lastName}`,
                }))}
                placeholder="Select bench player"
                className="w-full"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={endOpen} onOpenChange={setEndOpen}>
        <DialogContent
          title="End this match?"
          description="The clock stops and the match is marked completed. Events stay in history and can still be reviewed."
          footer={
            <>
              <Button variant="ghost" onClick={() => setEndOpen(false)}>
                Keep playing
              </Button>
              <Button variant="danger" onClick={() => void endMatch()}>
                End match
              </Button>
            </>
          }
        >
          <p className="text-sm text-ink-muted">
            Final score: <span className="font-semibold text-ink">{homeTeam.shortName} {homeScore}</span> —{' '}
            <span className="font-semibold text-ink">{awayTeam.shortName} {awayScore}</span>
          </p>
          <p className="mt-3 rounded-control border border-warning/30 bg-warning/[0.07] px-3 py-2 text-[11px] leading-relaxed text-warning">
            The mandatory post-match team report opens next. The match is not administratively
            complete until that report is submitted.
          </p>
        </DialogContent>
      </Dialog>

      <PostMatchReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        match={match}
        team={ownTeam}
        players={players.filter((player) => player.teamId === ownTeamId)}
        existing={ownReport}
        onSubmitted={(updated) => void handleReportSubmitted(updated)}
      />

      {completed ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/95 p-3 backdrop-blur lg:left-[264px]">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-ink">
                {match.adminComplete
                  ? 'Match administratively complete.'
                  : 'Post-match report outstanding.'}
              </p>
              <p className="text-[11px] text-ink-muted">
                {match.adminComplete
                  ? 'Scores, report and box score are final.'
                  : 'Submit the mandatory team report to close this match.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setReportOpen(true)}>
                <ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" />
                {ownReport ? 'Amend report' : 'Submit report'}
              </Button>
              <Button onClick={() => navigate('/manager/reports')} size="sm">
                View box score
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
