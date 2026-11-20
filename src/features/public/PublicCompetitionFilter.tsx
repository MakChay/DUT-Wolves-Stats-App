import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Select } from '@/components/ui/select'
import { cn } from '@/utils/cn'
import type { Competition, TeamGender } from '@/types/domain'
import { competitionsForGender } from '@/features/public/publicUtils'
import type { PublicData } from '@/features/public/usePublicData'

/** Raw `?competition=` state shared by all public screens. */
export function usePublicCompetition(): [string, (competitionId: string) => void] {
  const [params, setParams] = useSearchParams()
  const competitionId = params.get('competition') ?? ''
  const setCompetition = (next: string) => {
    const updated = new URLSearchParams(params)
    if (next) updated.set('competition', next)
    else updated.delete('competition')
    setParams(updated, { replace: true })
  }
  return [competitionId, setCompetition]
}

/** Resolve the URL value against tournaments actually available for a gender. */
export function usePublicCompetitionFilter(data: PublicData, gender: TeamGender) {
  const [rawCompetitionId, setCompetitionId] = usePublicCompetition()
  const competitions = competitionsForGender(data, gender)
  const competitionId =
    rawCompetitionId && competitions.some((entry) => entry.id === rawCompetitionId)
      ? rawCompetitionId
      : ''
  const selectedCompetition = competitions.find((entry) => entry.id === competitionId) ?? null
  return { competitions, competitionId, selectedCompetition, setCompetitionId }
}

/** Raw `?day=` state shared by the schedule screen. */
export function usePublicDay(): [string, (day: string) => void] {
  const [params, setParams] = useSearchParams()
  const day = params.get('day') ?? ''
  const setDay = (next: string) => {
    const updated = new URLSearchParams(params)
    if (next) updated.set('day', next)
    else updated.delete('day')
    setParams(updated, { replace: true })
  }
  return [day, setDay]
}

/** Append the current public filters to internal links. */
export function usePublicHref() {
  const [params] = useSearchParams()
  return useCallback(
    (path: string) => {
      const query = params.toString()
      return query ? `${path}?${query}` : path
    },
    [params],
  )
}

export function PublicCompetitionFilter({
  competitions,
  value,
  onChange,
  className,
}: {
  competitions: Competition[]
  value: string
  onChange: (competitionId: string) => void
  className?: string
}) {
  return (
    <Select
      label="Filter by tournament"
      value={value || 'all'}
      onValueChange={(next) => onChange(next === 'all' ? '' : next)}
      options={[
        { value: 'all', label: 'All tournaments' },
        ...competitions.map((competition) => ({
          value: competition.id,
          label: competition.shortName || competition.name,
        })),
      ]}
      className={cn('h-9 min-w-[10.5rem] text-xs', className)}
    />
  )
}
