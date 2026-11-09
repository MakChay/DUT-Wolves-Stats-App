import { PageHeader } from '@/components/ui/page-header'
import { TeamAnalyticsGate } from '@/features/statistics/TeamAnalyticsGate'
import { TeamMatchesView } from '@/features/statistics/TeamMatchesView'

export function ManagerMatchesPage() {
  return (
    <TeamAnalyticsGate>
      {(analytics) => (
        <div className="space-y-5">
          <PageHeader
            eyebrow="Match management"
            title="Matches"
            description={`Fixtures, live matches and results for ${analytics.team.name}. Completed matches open a full box score report.`}
          />
          <TeamMatchesView
            analytics={analytics}
            liveHref={analytics.liveMatch ? `/manager/match/${analytics.liveMatch.id}` : '/manager/live'}
            reportsBase="/manager/reports"
          />
        </div>
      )}
    </TeamAnalyticsGate>
  )
}
