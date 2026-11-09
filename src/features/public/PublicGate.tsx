import type { ReactNode } from 'react'
import { BarChart3, WifiOff } from 'lucide-react'
import { usePublicData, type PublicData } from '@/features/public/usePublicData'
import { SkeletonCard } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'

export function PublicGate({ children }: { children: (data: PublicData) => ReactNode }) {
  const { data, loading, error, reload } = usePublicData()

  if (loading) {
    return (
      <div className="space-y-5">
        <SkeletonCard lines={2} />
        <SkeletonCard lines={5} />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <SkeletonCard key={index} lines={3} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <EmptyState
        icon={WifiOff}
        title="Public data could not be loaded"
        description={error}
        action={<Button onClick={reload}>Try again</Button>}
      />
    )
  }

  if (!data) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No published data"
        description="Nothing has been published to the public site yet."
      />
    )
  }

  return <>{children(data)}</>
}
