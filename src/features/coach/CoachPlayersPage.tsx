import { PageHeader } from '@/components/ui/page-header'
import { TeamAnalyticsGate } from '@/features/statistics/TeamAnalyticsGate'
import { TeamPlayersView } from '@/features/statistics/TeamPlayersView'
import {
  ArchivedPlayersToggle,
  useArchivedPlayers,
  visiblePlayerRows,
} from '@/features/statistics/archivedPlayers'

export function CoachPlayersPage() {
  const [showArchived, setShowArchived] = useArchivedPlayers()

  return (
    <TeamAnalyticsGate>
      {(analytics) => {
        const rows = visiblePlayerRows(analytics.playerRows, showArchived)
        const hidden = analytics.playerRows.length - rows.length
        return (
          <div className="space-y-5">
            <PageHeader
              eyebrow="Squad"
              title="Players"
              description={`${rows.length} selected players. ${hidden > 0 ? `${hidden} archived — opt in to see their stats.` : 'Tap a player to inspect their season game log.'}`}
            />
            <TeamPlayersView
              analytics={analytics}
              rows={rows}
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
