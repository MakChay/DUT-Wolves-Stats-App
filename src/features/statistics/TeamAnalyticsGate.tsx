import type { ReactNode } from 'react'
import { BarChart3, Users } from 'lucide-react'
import { useTeamScope } from '@/features/teams/TeamScopeContext'
import { useTeamAnalytics, type TeamAnalytics } from '@/features/statistics/useTeamAnalytics'
import { SkeletonCard } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'

export function TeamAnalyticsGate({ children }: { children: (analytics: TeamAnalytics) => ReactNode }) {
  const { teamId, loading: scopeLoading } = useTeamScope()
  const { data, loading, error, reload } = useTeamAnalytics(teamId)

  if (scopeLoading || loading) {
    return (
      <div className="space-y-4">
        <SkeletonCard lines={2} />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonCard key={index} lines={1} />
          ))}
        </div>
        <SkeletonCard lines={6} />
      </div>
    )
  }

  if (error) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Team data could not be loaded"
        description={error}
        action={<Button onClick={reload}>Try again</Button>}
      />
    )
  }

  if (!data) {
    return (
      <EmptyState
        icon={Users}
        title="No team assigned"
        description="This account is not linked to a team yet. An administrator can assign a team in the admin area."
      />
    )
  }

  return <>{children(data)}</>
}
