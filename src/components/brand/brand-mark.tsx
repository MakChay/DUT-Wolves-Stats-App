import { cn } from '@/utils/cn'

interface BrandMarkProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showWordmark?: boolean
}

const sizes = {
  sm: 'h-7 w-7',
  md: 'h-9 w-9',
  lg: 'h-12 w-12',
}

export function BrandMark({ className, size = 'md', showWordmark = false }: BrandMarkProps) {
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-2', className)}>
      <span
        className={cn(
          'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line/60 bg-surface/40 backdrop-blur-sm',
          sizes[size],
        )}
        aria-hidden="true"
      >
        <img
          src="/brand/wolves-on-dark.png"
          alt=""
          className="hidden h-full w-full object-contain p-1 dark:block"
        />
        <img
          src="/brand/wolves-on-light.png"
          alt=""
          className="block h-full w-full object-contain p-1 dark:hidden"
        />
      </span>
      {showWordmark ? (
        <span className="leading-none">
          <span className="block text-[13px] font-bold tracking-[0.14em] text-ink">DUT WOLVES</span>
          <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">
            Stats
          </span>
        </span>
      ) : null}
    </span>
  )
}
