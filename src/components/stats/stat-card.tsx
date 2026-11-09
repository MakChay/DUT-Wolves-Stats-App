import type { LucideIcon } from 'lucide-react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/utils/cn'

interface StatCardProps {
  label: string
  value: string | number
  hint?: string
  icon?: LucideIcon
  trend?: number
  accent?: boolean
  className?: string
}

export function StatCard({ label, value, hint, icon: Icon, trend, accent, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-card border border-line bg-surface p-4 shadow-card',
        accent && 'border-accent/25 bg-accent/[0.06]',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">{label}</p>
        {Icon ? (
          <Icon className={cn('h-4 w-4', accent ? 'text-accent' : 'text-ink-faint')} aria-hidden="true" />
        ) : null}
      </div>
      <div className="mt-2 flex items-end gap-2">
        <p className={cn('stat-num text-2xl leading-none', accent ? 'text-accent' : 'text-ink')}>
          {value}
        </p>
        {typeof trend === 'number' ? (
          <span
            className={cn(
              'mb-0.5 inline-flex items-center gap-0.5 text-[11px] font-semibold',
              trend >= 0 ? 'text-success' : 'text-danger',
            )}
          >
            {trend >= 0 ? (
              <TrendingUp className="h-3 w-3" aria-hidden="true" />
            ) : (
              <TrendingDown className="h-3 w-3" aria-hidden="true" />
            )}
            {Math.abs(trend).toFixed(1)}
          </span>
        ) : null}
      </div>
      {hint ? <p className="mt-2 text-xs text-ink-muted">{hint}</p> : null}
    </div>
  )
}

export function StatRow({
  label,
  value,
  className,
}: {
  label: string
  value: string | number
  className?: string
}) {
  return (
    <div className={cn('flex items-center justify-between gap-3 py-1.5', className)}>
      <span className="text-xs text-ink-muted">{label}</span>
      <span className="stat-num text-sm text-ink">{value}</span>
    </div>
  )
}
