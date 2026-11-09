import { cn } from '@/utils/cn'

interface BarListItem {
  label: string
  value: number
  meta?: string
}

interface BarListProps {
  items: BarListItem[]
  max?: number
  suffix?: string
  className?: string
}

export function BarList({ items, max, suffix = '', className }: BarListProps) {
  const ceiling = max ?? Math.max(1, ...items.map((item) => item.value))
  return (
    <ul className={cn('space-y-2.5', className)}>
      {items.map((item) => (
        <li key={item.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="truncate text-xs font-medium text-ink-muted">{item.label}</span>
            <span className="stat-num shrink-0 text-xs text-ink">
              {item.value}
              {suffix}
              {item.meta ? <span className="ml-1.5 font-normal text-ink-faint">{item.meta}</span> : null}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-accent/80"
              style={{ width: `${Math.max(2, (item.value / ceiling) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

interface TrendPoint {
  label: string
  value: number
}

interface TrendChartProps {
  points: TrendPoint[]
  height?: number
  className?: string
  accent?: string
}

export function TrendChart({ points, height = 120, className, accent = '#F97316' }: TrendChartProps) {
  if (points.length < 2) {
    return (
      <p className="rounded-control border border-dashed border-line px-3 py-8 text-center text-xs text-ink-faint">
        Not enough games to show a trend yet.
      </p>
    )
  }

  const values = points.map((point) => point.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const width = 300
  const padding = 6
  const usableWidth = width - padding * 2
  const usableHeight = height - padding * 2

  const coordinates = points.map((point, index) => {
    const x = padding + (index / (points.length - 1)) * usableWidth
    const y = padding + (1 - (point.value - min) / range) * usableHeight
    return { x, y, ...point }
  })

  const line = coordinates.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ')
  const area = `M ${padding},${height - padding} L ${line.replaceAll(' ', ' L ')} L ${width - padding},${height - padding} Z`

  return (
    <div className={cn('w-full', className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Trend from ${points[0]?.value} to ${points[points.length - 1]?.value}`}
        className="h-auto w-full"
      >
        <defs>
          <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.28" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((ratio) => (
          <line
            key={ratio}
            x1={padding}
            x2={width - padding}
            y1={padding + usableHeight * ratio}
            y2={padding + usableHeight * ratio}
            stroke="rgba(148,163,184,0.12)"
            strokeWidth="1"
          />
        ))}
        <path d={area} fill="url(#trend-fill)" />
        <polyline
          points={line}
          fill="none"
          stroke={accent}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {coordinates.map((point) => (
          <circle key={point.label} cx={point.x} cy={point.y} r="2.5" fill={accent} />
        ))}
      </svg>
      <div className="mt-1 flex justify-between gap-1 text-[10px] text-ink-faint">
        {points.map((point) => (
          <span key={point.label} className="truncate">
            {point.label}
          </span>
        ))}
      </div>
    </div>
  )
}

interface DonutProps {
  value: number
  label: string
  sublabel?: string
}

export function DonutStat({ value, label, sublabel }: DonutProps) {
  const clamped = Math.max(0, Math.min(100, value))
  const circumference = 2 * Math.PI * 26
  const offset = circumference - (clamped / 100) * circumference
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90" role="img" aria-label={`${label}: ${value}%`}>
        <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(148,163,184,0.14)" strokeWidth="7" />
        <circle
          cx="32"
          cy="32"
          r="26"
          fill="none"
          stroke="#F97316"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div>
        <p className="stat-num text-lg text-ink">{value}%</p>
        <p className="text-xs text-ink-muted">{label}</p>
        {sublabel ? <p className="text-[11px] text-ink-faint">{sublabel}</p> : null}
      </div>
    </div>
  )
}
