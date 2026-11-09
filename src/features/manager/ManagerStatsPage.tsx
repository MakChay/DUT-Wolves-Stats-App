import { PageHeader } from '@/components/ui/page-header'
import { TeamAnalyticsGate } from '@/features/statistics/TeamAnalyticsGate'
import { TeamStatsView } from '@/features/statistics/TeamStatsView'

export function ManagerStatsPage() {
  return (
    <TeamAnalyticsGate>
      {(analytics) => (
        <div className="space-y-5">
          <PageHeader
            eyebrow="Statistics"
            title="Team statistics"
            description={`Derived from recorded match events for ${analytics.team.name}. Tap any player for their game log.`}
          />
          <TeamStatsView analytics={analytics} />
        </div>
      )}
    </TeamAnalyticsGate>
  )
}
