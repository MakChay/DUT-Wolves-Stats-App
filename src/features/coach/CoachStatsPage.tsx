import { PageHeader } from '@/components/ui/page-header'
import { TeamAnalyticsGate } from '@/features/statistics/TeamAnalyticsGate'
import { TeamStatsView } from '@/features/statistics/TeamStatsView'
import {
  ArchivedPlayersToggle,
  useArchivedPlayers,
  visiblePlayerRows,
} from '@/features/statistics/archivedPlayers'

export function CoachStatsPage() {
  const [showArchived, setShowArchived] = useArchivedPlayers()

  return (
    <TeamAnalyticsGate>
      {(analytics) => {
        const rows = visiblePlayerRows(analytics.playerRows, showArchived)
        const hidden = analytics.playerRows.length - rows.length
        return (
          <div className="space-y-5">
            <PageHeader
              eyebrow="Team analytics"
              title="Team statistics"
              description={`Season statistics derived from match events for ${analytics.team.name}. Read-only. ${hidden > 0 ? `${hidden} archived player${hidden === 1 ? '' : 's'} hidden.` : ''}`}
            />
            <TeamStatsView
              analytics={analytics}
              playerRows={rows}
              control={
                <ArchivedPlayersToggle showArchived={showArchived} onChange={setShowArchived} />
              }
            />
          </div>
        )
      }}
    </TeamAnalyticsGate>
  )
}
