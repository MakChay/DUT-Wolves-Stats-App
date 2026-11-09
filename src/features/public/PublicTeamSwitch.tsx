import { useSearchParams } from 'react-router-dom'
import type { TeamGender } from '@/types/domain'
import { cn } from '@/utils/cn'

export function usePublicGender(): [TeamGender, (gender: TeamGender) => void] {
  const [params, setParams] = useSearchParams()
  const raw = params.get('team')
  const gender: TeamGender = raw === 'women' ? 'women' : 'men'
  const setGender = (next: TeamGender) => {
    const updated = new URLSearchParams(params)
    updated.set('team', next)
    setParams(updated, { replace: true })
  }
  return [gender, setGender]
}

export function PublicTeamSwitch({
  gender,
  onChange,
  className,
}: {
  gender: TeamGender
  onChange: (gender: TeamGender) => void
  className?: string
}) {
  return (
    <div
      className={cn('inline-flex items-center gap-1 rounded-control border border-line bg-canvas/60 p-1', className)}
      role="group"
      aria-label="Select team"
    >
      {(['men', 'women'] as const).map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          aria-pressed={gender === value}
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
            gender === value
              ? 'bg-accent text-accent-contrast'
              : 'text-ink-muted hover:bg-white/5 hover:text-ink',
          )}
        >
          {value === 'men' ? "Men's" : "Women's"}
        </button>
      ))}
    </div>
  )
}
