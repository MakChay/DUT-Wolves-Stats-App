import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertTriangle, BarChart3, Download, FileText, Printer, ShieldCheck } from 'lucide-react'
import type {
  Match,
  MatchEvent,
  MatchRoster,
  Player,
  PostMatchTeamReport,
  Team,
} from '@/types/domain'
import { repositories } from '@/services/repositories'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/features/auth/AuthContext'
import { canSubmitMatchReport } from '@/features/auth/permissions'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { SkeletonCard } from '@/components/ui/skeleton'
import { MatchReport, buildBoxScore, periodScores } from '@/features/matches/MatchReport'
import { PostMatchReportDialog } from '@/features/reports/PostMatchReportDialog'
import { reportForTeam } from '@/features/reports/reporting'
import { useTeamScope } from '@/features/teams/TeamScopeContext'
import {
  ArchivedPlayersToggle,
  isArchivedPlayer,
  useArchivedPlayers,
} from '@/features/statistics/archivedPlayers'
import { matchScore } from '@/services/analytics/stats'
import { formatDate } from '@/utils/format'

interface ReportData {
  matches: Match[]
  teams: Team[]
  players: Player[]
  rosters: MatchRoster[]
  events: MatchEvent[]
  reports: PostMatchTeamReport[]
  matchId: string
}

async function loadReport(teamId: string): Promise<ReportData> {
  const [matches, teams, teamPlayers, reports] = await Promise.all([
    repositories.matches.listByTeam(teamId),
    repositories.teams.list(),
    repositories.players.listByTeam(teamId),
    repositories.reports.listByTeam(teamId),
  ])
  const completed = matches
    .filter((match) => match.status === 'completed')
    .sort((a, b) => b.tipoff.localeCompare(a.tipoff))
  const matchId = completed[0]?.id ?? ''
  const perMatch = await Promise.all(
    completed.map(async (match) => {
      const [rosters, events] = await Promise.all([
        repositories.rosters.listByMatchAndTeam(match.id, teamId),
        repositories.events.listByMatch(match.id),
      ])
      return { rosters, events }
    }),
  )
  return {
    matches: completed,
    teams,
    players: teamPlayers,
    rosters: perMatch.flatMap((entry) => entry.rosters),
    events: perMatch.flatMap((entry) => entry.events),
    reports,
    matchId,
  }
}

function toCsv(rows: (string | number)[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell)
          return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
        })
        .join(','),
    )
    .join('\r\n')
}

export function ManagerReportsPage({
  eyebrow = 'Reports',
  title = 'Match reports',
  description = 'Printable box scores and CSV exports generated from recorded events. Nothing is recalculated by hand.',
  archivedFilter = false,
}: {
  eyebrow?: string
  title?: string
  description?: string
  /** Coach views hide archived players unless the coach opts in. */
  archivedFilter?: boolean
} = {}) {
  const { teamId, loading: scopeLoading } = useTeamScope()
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const [showArchived, setShowArchived] = useArchivedPlayers()
  const [reportOpen, setReportOpen] = useState(false)
  const { data, loading, error, reload } = useAsync<ReportData | null>(
    () => (teamId ? loadReport(teamId) : Promise.resolve(null)),
    [teamId],
  )

  const selectedId = params.get('match') ?? data?.matchId ?? ''

  const archivedIds = useMemo(
    () => new Set((data?.players ?? []).filter(isArchivedPlayer).map((player) => player.id)),
    [data],
  )
  const visiblePlayers = useMemo(
    () =>
      archivedFilter && !showArchived
        ? (data?.players ?? []).filter((player) => !isArchivedPlayer(player))
        : (data?.players ?? []),
    [data, archivedFilter, showArchived],
  )
  const visibleRosters = useMemo(
    () =>
      archivedFilter && !showArchived
        ? (data?.rosters ?? []).filter((entry) => !archivedIds.has(entry.playerId))
        : (data?.rosters ?? []),
    [data, archivedFilter, showArchived, archivedIds],
  )

  const report = useMemo(() => {
    if (!data || !selectedId) return null
    const match = data.matches.find((entry) => entry.id === selectedId) ?? null
    if (!match) return null
    const rosters = visibleRosters.filter((entry) => entry.matchId === match.id)
    return { match, rosters, events: data.events }
  }, [data, selectedId, visibleRosters])

  if (scopeLoading || loading) {
    return (
      <div className="space-y-4">
        <SkeletonCard lines={2} />
        <SkeletonCard lines={10} />
      </div>
    )
  }

  if (error) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Reports could not be loaded"
        description={error}
        action={<Button onClick={reload}>Try again</Button>}
      />
    )
  }

  if (!data) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No team assigned"
        description="This account is not linked to a team yet."
      />
    )
  }

  const team = data.teams.find((entry) => entry.id === teamId) ?? null
  const homeTeam = report ? data.teams.find((entry) => entry.id === report.match.homeTeamId) : null
  const awayTeam = report ? data.teams.find((entry) => entry.id === report.match.awayTeamId) : null
  const selectedReport =
    report && teamId ? reportForTeam(data.reports, report.match.id, teamId) : null
  const pendingMatches = data.matches.filter(
    (match) => !reportForTeam(data.reports, match.id, teamId ?? ''),
  )
  const canSubmit = Boolean(user && teamId && canSubmitMatchReport(user, teamId))

  const exportCsv = () => {
    if (!report || !homeTeam || !awayTeam) return
    const score = matchScore(report.events, report.match)
    const periods = periodScores(report.match, report.events)
    const rows: (string | number)[][] = [
      ['DUT Wolves Stats — match report'],
      ['Match', `${homeTeam.name} vs ${awayTeam.name}`],
      ['Competition round', report.match.round ?? ''],
      ['Date', formatDate(report.match.tipoff)],
      ['Venue', report.match.venue],
      ['Final score', `${homeTeam.shortName} ${score.home}`, `${awayTeam.shortName} ${score.away}`],
      [],
      ['Period', homeTeam.shortName, awayTeam.shortName],
      ...periods.map((row) => [`Q${row.period}`, row.home, row.away]),
      [],
    ]

    for (const [side, sideTeam] of [
      ['Home', homeTeam],
      ['Away', awayTeam],
    ] as const) {
      rows.push([`${side} box score — ${sideTeam.name}`])
      rows.push([
        '#',
        'Player',
        'PTS',
        'REB',
        'AST',
        'STL',
        'BLK',
        'TO',
        'PF',
        'FGM',
        'FGA',
        '3PM',
        '3PA',
        'FTM',
        'FTA',
      ])
      buildBoxScore(report.match, report.events, report.rosters, visiblePlayers, sideTeam.id).forEach(
        (row) => {
          rows.push([
            row.player.jerseyNumber ?? '',
            `${row.player.firstName} ${row.player.lastName}`,
            row.stats.points,
            row.stats.reb,
            row.stats.ast,
            row.stats.stl,
            row.stats.blk,
            row.stats.tov,
            row.stats.pf,
            row.stats.fgm,
            row.stats.fga,
            row.stats.tpm,
            row.stats.tpa,
            row.stats.ftm,
            row.stats.fta,
          ])
        },
      )
      rows.push([])
    }

    const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${report.match.id}-report.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={
          report ? (
            <>
              <Button variant="secondary" onClick={exportCsv}>
                <Download className="h-4 w-4" aria-hidden="true" />
                Export CSV
              </Button>
              <Button onClick={() => window.print()}>
                <Printer className="h-4 w-4" aria-hidden="true" />
                Print / PDF
              </Button>
            </>
          ) : null
        }
      />

      {pendingMatches.length > 0 ? (
        <Card className="border-warning/40 bg-warning/[0.06] print:hidden">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">
                {pendingMatches.length} match{pendingMatches.length === 1 ? '' : 'es'} awaiting a
                post-match report
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
                These matches are not administratively complete. Submit the mandatory team report,
                including an explicit injury answer.
              </p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {pendingMatches.map((match) => {
                  const opponentId =
                    match.homeTeamId === team?.id ? match.awayTeamId : match.homeTeamId
                  const opponent = data.teams.find((entry) => entry.id === opponentId)
                  return (
                    <li key={match.id}>
                      <button
                        type="button"
                        onClick={() => setParams({ match: match.id }, { replace: true })}
                        className="rounded-full border border-warning/40 bg-canvas/50 px-2.5 py-1 text-[11px] font-medium text-ink transition hover:border-warning"
                      >
                        {formatDate(match.tipoff, { day: 'numeric', month: 'short' })} ·{' '}
                        {opponent?.shortName ?? 'Opponent'}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {data.matches.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No completed matches"
          description="Complete a match in the Live Match Centre to generate a report."
          action={
            <Button asChild>
              <a href="/manager/matches">Go to matches</a>
            </Button>
          }
        />
      ) : (
        <>
          <Card className="print:hidden">
            <CardContent className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="sm:w-96">
                <Select
                  label="Select completed match"
                  value={selectedId}
                  onValueChange={(value) => setParams({ match: value }, { replace: true })}
                  options={data.matches.map((match) => {
                    const opponentId = match.homeTeamId === team?.id ? match.awayTeamId : match.homeTeamId
                    const opponent = data.teams.find((entry) => entry.id === opponentId)
                    return {
                      value: match.id,
                      label: `${formatDate(match.tipoff, { day: 'numeric', month: 'short' })} · ${opponent?.shortName ?? 'Opponent'} · ${match.round ?? 'Match'}`,
                    }
                  })}
                  className="w-full"
                />
              </div>
              <div className="flex flex-col items-start gap-2 self-start sm:self-auto">
                {archivedFilter ? (
                  <ArchivedPlayersToggle showArchived={showArchived} onChange={setShowArchived} />
                ) : null}
                <Button
                  variant="ghost"
                  onClick={() => {
                    const updated = new URLSearchParams(params)
                    updated.delete('match')
                    setParams(updated, { replace: true })
                  }}
                >
                  Clear selection
                </Button>
              </div>
            </CardContent>
          </Card>

          {report && homeTeam && awayTeam ? (
            <>
              <Card className={selectedReport ? 'print:hidden' : 'border-warning/40 print:hidden'}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-accent" aria-hidden="true" />
                        <p className="text-sm font-semibold text-ink">
                          Mandatory post-match team report
                        </p>
                        <Badge
                          tone={
                            !selectedReport
                              ? 'warning'
                              : selectedReport.status === 'amended'
                                ? 'accent'
                                : 'success'
                          }
                        >
                          {selectedReport ? selectedReport.status : 'outstanding'}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-ink-muted">
                        {selectedReport
                          ? `Submitted by ${selectedReport.submittedByName} · ${formatDate(selectedReport.submittedAt)}`
                          : 'The match stays administratively incomplete until this report is submitted.'}
                      </p>
                    </div>
                    {canSubmit ? (
                      <Button
                        size="sm"
                        variant={selectedReport ? 'secondary' : 'primary'}
                        onClick={() => setReportOpen(true)}
                      >
                        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                        {selectedReport ? 'Amend report' : 'Submit report'}
                      </Button>
                    ) : null}
                  </div>

                  {selectedReport ? (
                    <div className="space-y-3">
                      {selectedReport.injuriesReported ? (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-ink">
                            {selectedReport.injuries.length} injur
                            {selectedReport.injuries.length === 1 ? 'y' : 'ies'} reported
                          </p>
                          {selectedReport.injuries.map((injury) => (
                            <div
                              key={injury.id}
                              className="rounded-control border border-line bg-canvas/40 p-3"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-xs font-semibold text-ink">
                                  {injury.playerName}
                                </p>
                                <span className="text-[11px] text-ink-faint">
                                  Q{injury.period}
                                  {injury.timeLabel ? ` · ${injury.timeLabel}` : ''}
                                </span>
                              </div>
                              <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                                {injury.description}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                <Badge tone={injury.continuedPlaying ? 'success' : 'neutral'}>
                                  {injury.continuedPlaying ? 'Continued' : 'Did not continue'}
                                </Badge>
                                <Badge tone={injury.substitutedDueToInjury ? 'warning' : 'neutral'}>
                                  {injury.substitutedDueToInjury ? 'Substituted' : 'Not substituted'}
                                </Badge>
                                <Badge tone={injury.medicalAttention ? 'accent' : 'neutral'}>
                                  {injury.medicalAttention ? 'Medical attention' : 'No treatment'}
                                </Badge>
                              </div>
                              {injury.followUpNotes ? (
                                <p className="mt-2 text-[11px] text-ink-muted">
                                  <span className="font-semibold text-ink">Follow-up:</span>{' '}
                                  {injury.followUpNotes}
                                </p>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="rounded-control border border-success/30 bg-success/[0.07] px-3 py-2 text-xs font-bold uppercase tracking-wide text-success">
                          NO INJURIES REPORTED
                        </p>
                      )}
                      {selectedReport.additionalNotes ? (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                            Additional notes
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                            {selectedReport.additionalNotes}
                          </p>
                        </div>
                      ) : null}
                      {selectedReport.amendments.length ? (
                        <div className="border-t border-line pt-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                            Amendment history
                          </p>
                          <ul className="mt-1 space-y-1">
                            {selectedReport.amendments.map((amendment) => (
                              <li key={amendment.id} className="text-[11px] text-ink-muted">
                                <span className="font-medium text-ink">
                                  {amendment.amendedByName}
                                </span>{' '}
                                · {amendment.reason}{' '}
                                <span className="text-ink-faint">
                                  ({formatDate(amendment.amendedAt)})
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <div className="rounded-card border border-line bg-surface p-4 sm:p-6 print:border-0 print:bg-white print:p-0 print:text-black">
              <div className="mb-4 hidden print:block">
                <p className="text-lg font-bold">DUT Wolves Stats</p>
                <p className="text-xs">
                  {homeTeam.name} vs {awayTeam.name} · {formatDate(report.match.tipoff)} · {report.match.venue}
                </p>
              </div>
              <MatchReport
                match={report.match}
                events={report.events}
                rosters={report.rosters}
                players={visiblePlayers}
                homeTeam={homeTeam}
                awayTeam={awayTeam}
              />
              </div>
            </>
          ) : (
            <EmptyState
              icon={FileText}
              title="Select a match"
              description="Choose a completed match above to open its box score report."
            />
          )}
        </>
      )}

      {report && team && canSubmit ? (
        <PostMatchReportDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          match={report.match}
          team={team}
          players={data.players.filter((player) => player.teamId === team.id)}
          existing={selectedReport}
          onSubmitted={() => {
            void reload()
          }}
        />
      ) : null}
    </div>
  )
}
