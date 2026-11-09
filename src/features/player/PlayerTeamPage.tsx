import { PageHeader } from '@/components/ui/page-header'
import { TeamAnalyticsGate } from '@/features/statistics/TeamAnalyticsGate'
import { TeamStatsView } from '@/features/statistics/TeamStatsView'

export function PlayerTeamPage() {
  return (
    <TeamAnalyticsGate>
      {(analytics) => (
        <div className="space-y-5">
          <PageHeader
            eyebrow="Team statistics"
            title={analytics.team.name}
            description="Full team statistics are visible to squad members. Individual private details are never published."
          />
          <TeamStatsView analytics={analytics} />
        </div>
      )}
    </TeamAnalyticsGate>
  )
}
