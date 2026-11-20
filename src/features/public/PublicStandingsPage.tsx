import { Trophy } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableWrap, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { PublicGate } from '@/features/public/PublicGate'
import { PublicTeamSwitch, usePublicGender } from '@/features/public/PublicTeamSwitch'
import {
  PublicCompetitionFilter,
  usePublicCompetitionFilter,
} from '@/features/public/PublicCompetitionFilter'
import {
  genderLabel,
  standingsByCompetitionForGender,
  type CompetitionStandings,
} from '@/features/public/publicUtils'
import type { PublicData } from '@/features/public/usePublicData'
import type { TeamGender } from '@/types/domain'
import { signed } from '@/utils/format'
import { cn } from '@/utils/cn'

function CompetitionTable({
  entry,
  data,
  gender,
}: {
  entry: CompetitionStandings
  data: PublicData
  gender: TeamGender
}) {
  const { competition, rows, completed } = entry
  const dutTeamId = gender === 'men' ? 'team-men' : 'team-women'

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-ink">{competition.name}</h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            {genderLabel(gender)} ·{' '}
            {completed > 0
              ? `${completed} completed ${completed === 1 ? 'match' : 'matches'}`
              : 'Awaiting first result'}
          </p>
        </div>
        <Badge tone={completed > 0 ? 'accent' : 'neutral'}>
          {competition.shortName ?? 'Tournament'}
        </Badge>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No teams in this table"
          description="The table appears once fixtures have been published for this tournament."
        />
      ) : (
        <>
          <TableWrap>
            <Table>
              <THead>
                <tr>
                  <TH className="w-12 text-center">Pos</TH>
                  <TH>Team</TH>
                  <TH className="text-center">P</TH>
                  <TH className="text-center">W</TH>
                  <TH className="text-center">L</TH>
                  <TH className="text-center">PF</TH>
                  <TH className="text-center">PA</TH>
                  <TH className="text-center">Diff</TH>
                  <TH className="text-center">Streak</TH>
                </tr>
              </THead>
              <TBody>
                {rows.map((row, index) => {
                  const team = data.teamById.get(row.teamId)
                  const isDut = row.teamId === dutTeamId
                  return (
                    <TR key={row.teamId} className={isDut ? 'bg-accent/[0.06]' : undefined}>
                      <TD className="stat-num text-center">
                        <span
                          className={cn(
                            'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs',
                            index === 0
                              ? 'bg-accent/15 font-bold text-accent'
                              : 'text-ink-muted',
                          )}
                        >
                          {index + 1}
                        </span>
                      </TD>
                      <TD>
                        <span className={cn('font-medium', isDut ? 'text-ink' : '')}>
                          {team?.name ?? row.teamId}
                        </span>
                      </TD>
                      <TD className="stat-num text-center">{row.played}</TD>
                      <TD className="stat-num text-center text-ink">{row.wins}</TD>
                      <TD className="stat-num text-center">{row.losses}</TD>
                      <TD className="stat-num text-center">{row.pointsFor}</TD>
                      <TD className="stat-num text-center">{row.pointsAgainst}</TD>
                      <TD
                        className={cn(
                          'stat-num text-center',
                          row.diff > 0
                            ? 'text-success'
                            : row.diff < 0
                              ? 'text-danger'
                              : 'text-ink-muted',
                        )}
                      >
                        {signed(row.diff)}
                      </TD>
                      <TD className="text-center text-[11px]">{row.streak}</TD>
                    </TR>
                  )
                })}
              </TBody>
            </Table>
          </TableWrap>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ['Matches played', rows.reduce((total, row) => total + row.played, 0)],
              ['Top points scored', Math.max(...rows.map((row) => row.pointsFor))],
              ['Best differential', Math.max(...rows.map((row) => row.diff))],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-card border border-line bg-surface px-4 py-3">
                <p className="stat-num text-xl text-ink">{Math.round(Number(value))}</p>
                <p className="mt-0.5 text-[11px] uppercase tracking-wider text-ink-faint">{label}</p>
              </div>
            ))}
          </div>

          <p className="rounded-card border border-line bg-surface/60 px-4 py-3 text-[11px] leading-relaxed text-ink-faint">
            Only matches from <span className="font-semibold text-ink-muted">{competition.name}</span>{' '}
            are included. DUT Wolves results come from match events; final scores for other teams are
            entered by an administrator.
          </p>
        </>
      )}
    </div>
  )
}

function StandingsContent({
  data,
  gender,
  setGender,
}: {
  data: PublicData
  gender: TeamGender
  setGender: (gender: TeamGender) => void
}) {
  const { competitions, competitionId, setCompetitionId } = usePublicCompetitionFilter(data, gender)
  const entries = standingsByCompetitionForGender(data, gender).filter(
    (entry) => !competitionId || entry.competition.id === competitionId,
  )
  const selected =
    entries.find((entry) => entry.competition.id === competitionId) ??
    entries.find((entry) => entry.completed > 0) ??
    entries[0]

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Standings"
        title={`${genderLabel(gender)} standings`}
        description="Each tournament has its own table. Select a competition to see its standings. DUT Wolves are highlighted."
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

      {entries.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No standings available"
          description="Tables appear once fixtures have been published for a tournament."
        />
      ) : (
        <>
          {entries.length > 1 ? (
            <Tabs value={selected?.competition.id} onValueChange={setCompetitionId}>
              <TabsList className="flex-wrap">
                {entries.map((entry) => (
                  <TabsTrigger key={entry.competition.id} value={entry.competition.id}>
                    {entry.competition.shortName ?? entry.competition.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          ) : null}

          {selected ? (
            <CompetitionTable entry={selected} data={data} gender={gender} />
          ) : null}
        </>
      )}
    </div>
  )
}

export function PublicStandingsPage() {
  const [gender, setGender] = usePublicGender()
  return (
    <PublicGate>
      {(data) => <StandingsContent data={data} gender={gender} setGender={setGender} />}
    </PublicGate>
  )
}
