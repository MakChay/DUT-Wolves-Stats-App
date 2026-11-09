import { Trophy } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TableWrap, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { PublicGate } from '@/features/public/PublicGate'
import { PublicTeamSwitch, usePublicGender } from '@/features/public/PublicTeamSwitch'
import { genderLabel, standingsForGender } from '@/features/public/publicUtils'
import type { PublicData } from '@/features/public/usePublicData'
import type { TeamGender } from '@/types/domain'
import { signed } from '@/utils/format'
import { cn } from '@/utils/cn'

function StandingsContent({
  data,
  gender,
  setGender,
}: {
  data: PublicData
  gender: TeamGender
  setGender: (gender: TeamGender) => void
}) {
  const standings = standingsForGender(data, gender)
  const dutTeamId = gender === 'men' ? 'team-men' : 'team-women'

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Standings"
        title={`${genderLabel(gender)} standings`}
        description="DUT Wolves results against opponents, calculated from completed fixtures."
        actions={<PublicTeamSwitch gender={gender} onChange={setGender} />}
      />

      {standings.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No standings available"
          description="The table appears after the first completed match."
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
                {standings.map((row, index) => {
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
                          row.diff > 0 ? 'text-success' : row.diff < 0 ? 'text-danger' : 'text-ink-muted',
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
              ['Matches played', standings.reduce((total, row) => total + row.played, 0)],
              ['DUT points scored', Math.max(...standings.map((row) => row.pointsFor))],
              ['Best differential', Math.max(...standings.map((row) => row.diff))],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-card border border-line bg-surface px-4 py-3">
                <p className="stat-num text-xl text-ink">{Math.round(Number(value))}</p>
                <p className="mt-0.5 text-[11px] uppercase tracking-wider text-ink-faint">{label}</p>
              </div>
            ))}
          </div>

          <p className="rounded-card border border-line bg-surface/60 px-4 py-3 text-[11px] leading-relaxed text-ink-faint">
            Standings are recalculated from match events on every load. A voided or corrected event changes the
            table immediately — no manual score entry is involved.
          </p>
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
