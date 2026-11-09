import { Navigate } from 'react-router-dom'
import { Radio } from 'lucide-react'
import { useAsync } from '@/hooks/useAsync'
import { repositories } from '@/services/repositories'
import { useTeamScope } from '@/features/teams/TeamScopeContext'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import type { Match } from '@/types/domain'

/**
 * /manager/live is a stable sidebar entry. It resolves to the current live
 * match, then the next scheduled fixture, so navigation never dead-ends.
 */
export function ManagerLiveRedirectPage() {
  const { teamId, loading: scopeLoading } = useTeamScope()
  const { data, loading } = useAsync<Match | null>(async () => {
    if (!teamId) return null
    const matches = await repositories.matches.listByTeam(teamId)
    const live = matches.find((match) => match.status === 'live' || match.status === 'paused')
    if (live) return live
    const scheduled = matches
      .filter((match) => match.status === 'scheduled')
      .sort((a, b) => a.tipoff.localeCompare(b.tipoff))
    return scheduled[0] ?? matches[matches.length - 1] ?? null
  }, [teamId])

  if (scopeLoading || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-ink-faint">
          Opening match centre…
        </p>
      </div>
    )
  }

  if (data) {
    return <Navigate to={`/manager/match/${data.id}`} replace />
  }

  return (
    <EmptyState
      icon={Radio}
      title="No match available"
      description="There is no live or scheduled fixture for this team yet. Create a fixture before opening the Live Match Centre."
      action={
        <Button asChild>
          <Link to="/manager/matches">Back to matches</Link>
        </Button>
      }
    />
  )
}
