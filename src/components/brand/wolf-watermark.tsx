import { cn } from '@/utils/cn'

interface WolfWatermarkProps {
  className?: string
  opacity?: number
}

/**
 * Decorative theme-aware wolf watermark. Place inside a relatively-positioned
 * container. `aria-hidden` so it never affects screen-reader output.
 */
export function WolfWatermark({ className, opacity = 0.06 }: WolfWatermarkProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      <img
        src="/brand/wolves-on-dark.png"
        alt=""
        className="absolute right-[-8%] top-[-10%] hidden h-[120%] w-auto select-none object-contain dark:block"
        style={{ opacity }}
      />
      <img
        src="/brand/wolves-on-light.png"
        alt=""
        className="absolute right-[-8%] top-[-10%] block h-[120%] w-auto select-none object-contain dark:hidden"
        style={{ opacity }}
      />
    </div>
  )
}
