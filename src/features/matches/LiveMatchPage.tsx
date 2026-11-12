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
  Maximize2,
  Minimize2,
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
import { derivePlayerGameStats, formatClock, teamScore } from '@/services/analytics/stats'
import { captureMatchSnapshot } from '@/services/snapshots/capture'
import {
  dequeueEvent,
  enqueueEvent,
  isEventQueued,
  readQueuedEvents,
} from '@/services/live/queue'
import { repositories } from '@/services/repositories'
import { useAsync } from '@/hooks/useAsync'
import { useTeamScope } from '@/features/teams/TeamScopeContext'
import { useAuth } from '@/features/auth/AuthContext'
import { useFocusMode } from '@/app/FocusModeContext'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { EmptyState } from '@/components/ui/empty-state'
import { SkeletonCard } from '@/components/ui/skeleton'
import { Scoreboard } from '@/components/stats/scoreboard'
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

function parseScore(value: string): number | null {
  if (value.trim() === '') return null
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null
}

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
  courtside = false,
}: {
  action: ActionDef
  disabled: boolean
  onRecord: (type: MatchEventType) => void
  courtside?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onRecord(action.type)}
      className={cn(
        'flex flex-col items-center justify-center rounded-control border px-2 py-2 text-center transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-35',
        courtside ? 'min-h-[84px]' : 'min-h-[62px]',
        TONE_CLASSES[action.tone],
      )}
      aria-label={action.label}
    >
      <span className={cn('font-bold leading-tight', courtside ? 'text-sm' : 'text-[13px]')}>
        {action.label}
      </span>
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
  const [events, setEvents] = useState<MatchEvent[]>(() => {
    const queued = readQueuedEvents(initialMatch.id)
    const storedIds = new Set(initialEvents.map((event) => event.id))
    return [...initialEvents, ...queued.filter((event) => !storedIds.has(event.id))].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    )
  })
  const [pendingCount, setPendingCount] = useState(() => readQueuedEvents(initialMatch.id).length)
  const [clockSeconds, setClockSeconds] = useState(initialMatch.clockSeconds)
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [onCourt, setOnCourt] = useState<Set<string>>(() => {
    const next = new Set(
      ownRoster.filter((entry) => entry.isStarter).map((entry) => entry.playerId),
    )
    const substitutions = [...initialEvents, ...readQueuedEvents(initialMatch.id)]
      .filter(
        (event) =>
          !event.voided &&
          event.teamId === ownTeamId &&
          (event.type === 'SUB_IN' || event.type === 'SUB_OUT'),
      )
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    for (const event of substitutions) {
      if (!event.playerId) continue
      if (event.type === 'SUB_OUT') next.delete(event.playerId)
      else next.add(event.playerId)
    }
    return next
  })
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
  const { focusMode: courtside, setFocusMode } = useFocusMode()
  const [possession, setPossession] = useState<'own' | 'opponent'>(() => {
    try {
      return window.localStorage.getItem(`dws.livePossession.${initialMatch.id}`) === 'opponent'
        ? 'opponent'
        : 'own'
    } catch {
      return 'own'
    }
  })
  const [manualScore, setManualScore] = useState<{ home: string; away: string }>(() => {
    try {
      const raw = window.localStorage.getItem(`dws.liveManualScore.${initialMatch.id}`)
      if (raw) {
        const parsed = JSON.parse(raw) as { home?: unknown; away?: unknown }
        return {
          home: parsed.home === undefined ? '' : String(parsed.home),
          away: parsed.away === undefined ? '' : String(parsed.away),
        }
      }
    } catch {
      // Fall through to an empty manual scoreboard.
    }
    return { home: '', away: '' }
  })
  const [confirmMismatch, setConfirmMismatch] = useState(false)
  const [minutesByPlayer, setMinutesByPlayer] = useState<Record<string, number>>(() => {
    try {
      const raw = window.localStorage.getItem(`dws.liveMinutes.${initialMatch.id}`)
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, unknown>
        if (parsed && typeof parsed === 'object') {
          return Object.fromEntries(
            Object.entries(parsed).map(([playerId, value]) => [
              playerId,
              typeof value === 'number' && value >= 0 ? value : 0,
            ]),
          )
        }
      }
    } catch {
      // Start from zero when storage is unavailable.
    }
    return {}
  })
  const [autoAdvance, setAutoAdvance] = useState(() => {
    try {
      return window.localStorage.getItem(`dws.liveAutoAdvance.${initialMatch.id}`) !== 'off'
    } catch {
      return true
    }
  })
  const actionTimer = useRef<number | null>(null)
  const pageRef = useRef<HTMLDivElement | null>(null)

  const completed = match.status === 'completed'

  useEffect(() => {
    if (!clockRunning || completed) return
    const interval = window.setInterval(() => {
      setMinutesByPlayer((current) => {
        const next = { ...current }
        for (const playerId of onCourt) next[playerId] = (next[playerId] ?? 0) + 1
        return next
      })
      setClockSeconds((current) => {
        if (current <= 1) {
          setClockRunning(false)
          return 0
        }
        return current - 1
      })
    }, 1000)
    return () => window.clearInterval(interval)
  }, [clockRunning, completed, onCourt])

  useEffect(() => {
    return () => {
      if (actionTimer.current) window.clearTimeout(actionTimer.current)
    }
  }, [])

  const ownScore = teamScore(events, ownTeamId, match.id)
  const opponentScore = teamScore(events, opponentId, match.id)
  const homeScore = initialMatch.homeTeamId === ownTeamId ? ownScore : opponentScore
  const awayScore = initialMatch.homeTeamId === ownTeamId ? opponentScore : ownScore

  const periodFouls = (teamId: string) =>
    events.filter(
      (event) =>
        !event.voided &&
        event.teamId === teamId &&
        event.period === match.period &&
        event.type === 'FOUL',
    ).length
  const ownTeamFouls = periodFouls(ownTeamId)
  const opponentTeamFouls = periodFouls(opponentId)
  const bonusLimit = 5
  const ownBonus = ownTeamFouls >= bonusLimit
  const opponentBonus = opponentTeamFouls >= bonusLimit

  const timeoutCount = (teamId: string) =>
    events.filter((event) => !event.voided && event.teamId === teamId && event.type === 'TIMEOUT')
      .length
  const ownTimeouts = timeoutCount(ownTeamId)
  const opponentTimeouts = timeoutCount(opponentId)

  const manualHomeScore = parseScore(manualScore.home)
  const manualAwayScore = parseScore(manualScore.away)
  const scoreMismatch =
    manualHomeScore !== null &&
    manualAwayScore !== null &&
    (manualHomeScore !== homeScore || manualAwayScore !== awayScore)

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

  const flushQueue = useCallback(async () => {
    if (!navigator.onLine) return
    const queued = readQueuedEvents(match.id)
    if (queued.length === 0) {
      setPendingCount(0)
      return
    }
    setSyncing(true)
    for (const queuedEvent of queued) {
      try {
        await repositories.events.record(queuedEvent)
        dequeueEvent(match.id, queuedEvent.id)
        setPendingCount(readQueuedEvents(match.id).length)
      } catch {
        break
      }
    }
    setSyncing(false)
  }, [match.id])

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true)
      void flushQueue()
    }
    const onOffline = () => setIsOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    if (navigator.onLine) void flushQueue()
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [flushQueue])

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
      enqueueEvent(match.id, event)
      setPendingCount(readQueuedEvents(match.id).length)
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
      if (!isOnline) {
        toast({
          title: 'Saved on this device',
          description: 'The event will sync automatically when the connection returns.',
          tone: 'info',
        })
        return
      }
      setSyncing(true)
      repositories.events
        .record(event)
        .then(() => {
          dequeueEvent(match.id, event.id)
          setPendingCount(readQueuedEvents(match.id).length)
        })
        .catch(() => {
          toast({
            title: 'Saved on this device',
            description: 'The server could not be reached. The event stays queued and will retry automatically.',
            tone: 'error',
          })
        })
        .finally(() => setSyncing(false))
    },
    [completed, playerById, match.id, match.period, clockSeconds, ownTeamId, opponent.shortName, user?.id, toast, isOnline],
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
    if (isEventQueued(match.id, event.id)) {
      dequeueEvent(match.id, event.id)
      setEvents((current) => current.filter((entry) => entry.id !== event.id))
      setPendingCount(readQueuedEvents(match.id).length)
      toast({
        title: 'Queued event removed',
        description: 'It had not reached the server yet, so no correction record was needed.',
        tone: 'success',
      })
      return
    }
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
    const target = [...ownEvents, ...opponentScoreEvents]
      .filter(
        (event) =>
          event.type !== 'SUB_IN' &&
          event.type !== 'SUB_OUT' &&
          event.type !== 'PERIOD_START' &&
          event.type !== 'PERIOD_END' &&
          event.type !== 'MATCH_END',
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
    if (!target) {
      toast({
        title: 'Nothing to undo',
        description: 'No scoring or possession events have been recorded yet.',
        tone: 'info',
      })
      return
    }
    void voidEvent(target, 'Undo last event')
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.shiftKey || event.key.toLowerCase() !== 'z') return
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      event.preventDefault()
      undoLast()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

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

  useEffect(() => {
    if (!autoAdvance || completed || clockSeconds !== 0 || match.period >= 4) return
    if (match.status !== 'live' && match.status !== 'paused') return
    const timeout = window.setTimeout(() => {
      setClockRunning(false)
      setPeriod(match.period + 1)
      toast({
        title: `Q${match.period + 1} ready`,
        description: 'The clock was reset to 10:00. Start it when the period begins.',
        tone: 'info',
      })
    }, 1200)
    return () => window.clearTimeout(timeout)
  }, [autoAdvance, completed, clockSeconds, match.period, match.status])

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

  const recordTimeout = (teamId: string, label: string) => {
    if (completed) return
    record('TIMEOUT', undefined, teamId, 0)
    flash(`${label} timeout`)
  }

  const nextPeriod = () => {
    if (completed || match.period >= 4) return
    setClockRunning(false)
    setPeriod(match.period + 1)
  }

  const togglePossession = () => {
    setPossession((current) => (current === 'own' ? 'opponent' : 'own'))
  }

  const endMatch = async () => {
    if (scoreMismatch && !confirmMismatch) {
      setConfirmMismatch(true)
      setEndOpen(true)
      toast({
        title: 'Score mismatch',
        description:
          'The manual scoreboard does not match the event score. Reconcile it, or press End anyway to finish.',
        tone: 'error',
      })
      return
    }
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

  const toggleCourtside = async () => {
    const next = !courtside
    setFocusMode(next)
    if (next) {
      try {
        await document.documentElement.requestFullscreen()
      } catch {
        // The app shell still hides its chrome when the Fullscreen API is unavailable.
      }
    } else if (document.fullscreenElement) {
      try {
        await document.exitFullscreen()
      } catch {
        // Ignore a rejected exit; the overlay is already closing.
      }
    }
  }

  useEffect(() => {
    document.body.style.overflow = courtside ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [courtside])

  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) setFocusMode(false)
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [setFocusMode])

  useEffect(
    () => () => {
      if (document.fullscreenElement) void document.exitFullscreen()
      setFocusMode(false)
    },
    [setFocusMode],
  )

  useEffect(() => {
    try {
      window.localStorage.setItem(`dws.livePossession.${initialMatch.id}`, possession)
    } catch {
      // Ignore storage failures.
    }
  }, [possession, initialMatch.id])

  useEffect(() => {
    try {
      window.localStorage.setItem(
        `dws.liveManualScore.${initialMatch.id}`,
        JSON.stringify(manualScore),
      )
    } catch {
      // Ignore storage failures.
    }
  }, [manualScore, initialMatch.id])

  useEffect(() => {
    try {
      window.localStorage.setItem(
        `dws.liveMinutes.${initialMatch.id}`,
        JSON.stringify(minutesByPlayer),
      )
    } catch {
      // Ignore storage failures.
    }
  }, [minutesByPlayer, initialMatch.id])

  useEffect(() => {
    try {
      window.localStorage.setItem(
        `dws.liveAutoAdvance.${initialMatch.id}`,
        autoAdvance ? 'on' : 'off',
      )
    } catch {
      // Ignore storage failures.
    }
  }, [autoAdvance, initialMatch.id])

  const statusLabel = completed
    ? 'Match completed'
    : pendingCount > 0
      ? `${pendingCount} queued${isOnline ? ' · retrying' : ' · offline'}`
      : !isOnline
        ? 'Offline'
        : syncing
          ? 'Syncing…'
          : 'Synced'

  return (
    <div ref={pageRef} className="space-y-4 pb-24 lg:pb-6">
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-2',
          courtside && 'sticky top-0 z-10 border-b border-line bg-canvas/95 py-2 backdrop-blur',
        )}
      >
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/manager/matches">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Matches
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Badge tone={!isOnline || pendingCount > 0 ? 'warning' : syncing ? 'accent' : 'success'}>
            {!isOnline ? <WifiOff className="h-3 w-3" aria-hidden="true" /> : <CheckCircle2 className="h-3 w-3" aria-hidden="true" />}
            {statusLabel}
          </Badge>
          {pendingCount > 0 && isOnline ? (
            <Button variant="secondary" size="sm" onClick={() => void flushQueue()} disabled={syncing}>
              Sync now
            </Button>
          ) : null}
          <Button
            variant="secondary"
            size="sm"
            onClick={undoLast}
            disabled={completed}
            aria-label="Undo last event"
            title="Undo last event (Ctrl+Z)"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Undo</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void toggleCourtside()}
            aria-pressed={courtside}
            aria-label={courtside ? 'Exit full-screen courtside mode' : 'Open full-screen courtside mode'}
            title={courtside ? 'Exit full-screen courtside mode' : 'Open full-screen courtside mode'}
          >
            {courtside ? <Minimize2 className="h-3.5 w-3.5" aria-hidden="true" /> : <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />}
            <span className="hidden sm:inline">{courtside ? 'Exit full screen' : 'Full screen'}</span>
          </Button>
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
                      aria-label={`${jerseyLabel(player.jerseyNumber)} ${player.firstName} ${player.lastName}`}
                    >
                      <span
                        className={cn(
                          'stat-num text-3xl font-black leading-none',
                          selectedPlayerId === player.id ? 'text-accent' : 'text-ink',
                        )}
                      >
                        {player.jerseyNumber ?? '—'}
                      </span>
                      <span className="w-full truncate text-center text-[11px] font-semibold text-ink">
                        {player.lastName}
                      </span>
                      <span className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-ink-faint">
                        {player.position}
                        {stats.pf > 0 ? <span className={stats.pf >= 4 ? 'text-warning' : ''}>{stats.pf} PF</span> : null}
                      </span>
                      <span className="text-[9px] tabular-nums text-ink-faint">
                        {formatClock(minutesByPlayer[player.id] ?? 0)} min
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
                        <span className="stat-num w-8 shrink-0 text-center text-lg font-black leading-none text-ink">
                          {player.jerseyNumber ?? '—'}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-medium text-ink">{player.lastName}</p>
                          <p className="text-[9px] uppercase text-ink-faint">
                            {player.position} · {formatClock(minutesByPlayer[player.id] ?? 0)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              ) : null}

              {selectedPlayer && selectedStats ? (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-control border border-accent/20 bg-accent/[0.05] px-3 py-2">
                  <span className="stat-num text-xl font-black leading-none text-accent">
                    {jerseyLabel(selectedPlayer.jerseyNumber)}
                  </span>
                  <span className="text-xs font-semibold text-ink">
                    {selectedPlayer.firstName} {selectedPlayer.lastName}
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
                        courtside={courtside}
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
                        courtside={courtside}
                      />
                    ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-line pt-3">
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
            <CardHeader>
              <div>
                <CardTitle>Game state</CardTitle>
                <p className="mt-0.5 text-xs text-ink-muted">
                  Team fouls reset each period. Bonus starts at {bonusLimit}.
                </p>
              </div>
              <Badge tone={ownBonus || opponentBonus ? 'warning' : 'neutral'}>
                {possession === 'own' ? `${ownTeam.shortName} ball` : `${opponent.shortName} ball`}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { team: ownTeam, fouls: ownTeamFouls, bonus: ownBonus },
                  { team: opponent, fouls: opponentTeamFouls, bonus: opponentBonus },
                ].map((row) => (
                  <div
                    key={row.team.id}
                    className="rounded-control border border-line bg-canvas/40 p-2.5 text-center"
                  >
                    <p className="truncate text-[10px] uppercase tracking-wider text-ink-faint">
                      {row.team.shortName}
                    </p>
                    <p className="stat-num mt-0.5 text-2xl text-ink">{row.fouls}</p>
                    <p className="text-[10px] text-ink-faint">team fouls · Q{match.period}</p>
                    {row.bonus ? (
                      <Badge tone="danger" className="mt-1">BONUS</Badge>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between gap-2 rounded-control border border-line bg-canvas/40 px-3 py-2">
                <div className="min-w-0">
                  <p className="label-caps">Possession</p>
                  <p className="truncate text-sm font-semibold text-ink">
                    {possession === 'own' ? ownTeam.name : opponent.name}
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={togglePossession} disabled={completed}>
                  Switch
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => recordTimeout(ownTeamId, ownTeam.shortName)}
                  disabled={completed}
                >
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  {ownTeam.shortName} · {ownTimeouts}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => recordTimeout(opponentId, opponent.shortName)}
                  disabled={completed}
                >
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  {opponent.shortName} · {opponentTimeouts}
                </Button>
              </div>
              <p className="text-center text-[10px] text-ink-faint">timeouts used</p>

              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={nextPeriod}
                disabled={completed || match.period >= 4}
              >
                Start Q{match.period + 1}
              </Button>
            </CardContent>
          </Card>

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
              <label className="flex cursor-pointer items-center gap-2 text-[11px] text-ink-muted">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[rgb(var(--color-accent))]"
                  checked={autoAdvance}
                  disabled={completed}
                  onChange={(event) => setAutoAdvance(event.target.checked)}
                />
                Auto-advance to the next period at 00:00
              </label>
              {clockSeconds === 0 && !completed ? (
                <p className="text-[11px] leading-relaxed text-warning">
                  Clock reached 00:00.{' '}
                  {autoAdvance && match.period < 4
                    ? 'Advancing to the next period…'
                    : 'Move to the next period or adjust the clock.'}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <details>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-ink">
                <span>Match history</span>
                <span className="text-[11px] font-normal text-ink-faint">
                  {timelineEvents.length} events
                </span>
              </summary>
              <CardContent className="pt-0">
                <EventTimeline
                  events={timelineEvents}
                  players={playerMap}
                  teamNames={timelineTeamNames}
                  onVoid={(event) => void voidEvent(event)}
                  maxHeight="max-h-[420px]"
                />
              </CardContent>
            </details>
          </Card>

          <Card>
            <details>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-ink">
                <span>Score check</span>
                <Badge tone={scoreMismatch ? 'danger' : manualHomeScore !== null && manualAwayScore !== null ? 'success' : 'neutral'}>
                  {scoreMismatch
                    ? 'Mismatch'
                    : manualHomeScore !== null && manualAwayScore !== null
                      ? 'Reconciled'
                      : 'Not checked'}
                </Badge>
              </summary>
              <CardContent className="space-y-3 pt-0">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-control border border-line bg-canvas/40 p-3 text-center">
                  <p className="truncate text-[11px] text-ink-faint">{homeTeam.shortName} · events</p>
                  <p className="stat-num mt-1 text-2xl text-ink">{homeScore}</p>
                </div>
                <div className="rounded-control border border-line bg-canvas/40 p-3 text-center">
                  <p className="truncate text-[11px] text-ink-faint">{awayTeam.shortName} · events</p>
                  <p className="stat-num mt-1 text-2xl text-ink">{awayScore}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                  Manual {homeTeam.shortName}
                  <Input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={manualScore.home}
                    onChange={(event) => setManualScore({ ...manualScore, home: event.target.value })}
                    placeholder={String(homeScore)}
                    className="mt-1"
                    disabled={completed}
                  />
                </label>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                  Manual {awayTeam.shortName}
                  <Input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={manualScore.away}
                    onChange={(event) => setManualScore({ ...manualScore, away: event.target.value })}
                    placeholder={String(awayScore)}
                    className="mt-1"
                    disabled={completed}
                  />
                </label>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setManualScore({ home: String(homeScore), away: String(awayScore) })}
                  disabled={completed}
                >
                  Use event score
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setManualScore({ home: '', away: '' })}
                  disabled={completed}
                >
                  Clear check
                </Button>
              </div>

              <p
                className={cn(
                  'text-center text-[11px]',
                  scoreMismatch ? 'text-danger' : 'text-ink-faint',
                )}
              >
                {manualHomeScore === null || manualAwayScore === null
                  ? 'Enter the physical scoreboard to reconcile before finishing.'
                  : scoreMismatch
                    ? `Mismatch: scoreboard ${manualHomeScore}–${manualAwayScore}, events ${homeScore}–${awayScore}.`
                    : 'Scoreboard matches the event-derived score.'}
              </p>
              </CardContent>
            </details>
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
                  label: `${jerseyLabel(player.jerseyNumber)} ${player.firstName} ${player.lastName} · ${formatClock(minutesByPlayer[player.id] ?? 0)}`,
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
                  label: `${jerseyLabel(player.jerseyNumber)} ${player.firstName} ${player.lastName} · ${formatClock(minutesByPlayer[player.id] ?? 0)}`,
                }))}
                placeholder="Select bench player"
                className="w-full"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={endOpen}
        onOpenChange={(open) => {
          setEndOpen(open)
          if (!open) setConfirmMismatch(false)
        }}
      >
        <DialogContent
          title="End this match?"
          description="The clock stops and the match is marked completed. Events stay in history and can still be reviewed."
          footer={
            <>
              <Button variant="ghost" onClick={() => setEndOpen(false)}>
                Keep playing
              </Button>
              <Button variant="danger" onClick={() => void endMatch()}>
                {confirmMismatch ? 'End anyway' : 'End match'}
              </Button>
            </>
          }
        >
          <p className="text-sm text-ink-muted">
            Event score: <span className="font-semibold text-ink">{homeTeam.shortName} {homeScore}</span> —{' '}
            <span className="font-semibold text-ink">{awayTeam.shortName} {awayScore}</span>
          </p>
          {manualHomeScore !== null && manualAwayScore !== null ? (
            <p
              className={cn(
                'mt-2 rounded-control border px-3 py-2 text-[11px] leading-relaxed',
                scoreMismatch
                  ? 'border-danger/30 bg-danger/[0.07] text-danger'
                  : 'border-success/30 bg-success/[0.07] text-success',
              )}
            >
              Manual scoreboard: {manualHomeScore}–{manualAwayScore}.{' '}
              {scoreMismatch
                ? 'This differs from the event score. Reconcile before finishing, or press End anyway.'
                : 'Reconciled with the event score.'}
            </p>
          ) : (
            <p className="mt-2 text-[11px] text-ink-faint">
              No manual score check entered. You can add one in the Score check card before ending.
            </p>
          )}
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
