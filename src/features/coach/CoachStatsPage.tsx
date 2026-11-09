import { PageHeader } from '@/components/ui/page-header'
import { TeamAnalyticsGate } from '@/features/statistics/TeamAnalyticsGate'
import { TeamStatsView } from '@/features/statistics/TeamStatsView'

export function CoachStatsPage() {
  return (
    <TeamAnalyticsGate>
      {(analytics) => (
        <div className="space-y-5">
          <PageHeader
            eyebrow="Team analytics"
            title="Team statistics"
            description={`Season statistics derived from match events for ${analytics.team.name}. Read-only.`}
          />
          <TeamStatsView analytics={analytics} />
        </div>
      )}
    </TeamAnalyticsGate>
  )
}
