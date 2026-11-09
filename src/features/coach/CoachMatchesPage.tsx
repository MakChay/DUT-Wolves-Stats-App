import { PageHeader } from '@/components/ui/page-header'
import { TeamAnalyticsGate } from '@/features/statistics/TeamAnalyticsGate'
import { TeamMatchesView } from '@/features/statistics/TeamMatchesView'

export function CoachMatchesPage() {
  return (
    <TeamAnalyticsGate>
      {(analytics) => (
        <div className="space-y-5">
          <PageHeader
            eyebrow="Match history"
            title="Matches"
            description={`Fixtures and results for ${analytics.team.name}. Completed matches open a full box score report.`}
          />
          <TeamMatchesView analytics={analytics} reportsBase="/coach/reports" />
        </div>
      )}
    </TeamAnalyticsGate>
  )
}
