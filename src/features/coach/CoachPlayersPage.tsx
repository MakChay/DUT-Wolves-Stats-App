import { PageHeader } from '@/components/ui/page-header'
import { TeamAnalyticsGate } from '@/features/statistics/TeamAnalyticsGate'
import { TeamPlayersView } from '@/features/statistics/TeamPlayersView'

export function CoachPlayersPage() {
  return (
    <TeamAnalyticsGate>
      {(analytics) => (
        <div className="space-y-5">
          <PageHeader
            eyebrow="Squad"
            title="Players"
            description={`${analytics.players.length} registered players. Tap a player to inspect their season game log.`}
          />
          <TeamPlayersView analytics={analytics} />
        </div>
      )}
    </TeamAnalyticsGate>
  )
}
