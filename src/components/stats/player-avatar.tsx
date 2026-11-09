import type { Player } from '@/types/domain'
import { initials } from '@/utils/format'
import { cn } from '@/utils/cn'

interface PlayerAvatarProps {
  player: Pick<Player, 'firstName' | 'lastName' | 'jerseyNumber'> & { photoUrl?: string }
  size?: 'sm' | 'md' | 'lg' | 'xl'
  selected?: boolean
  className?: string
}

const SIZES = {
  sm: 'h-8 w-8 text-[11px]',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
  xl: 'h-20 w-20 text-2xl',
}

export function PlayerAvatar({ player, size = 'md', selected, className }: PlayerAvatarProps) {
  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-visible rounded-full border font-bold',
        selected
          ? 'border-accent/60 bg-accent/15 text-accent'
          : 'border-line bg-surface-raised text-ink-muted',
        SIZES[size],
        className,
      )}
      aria-hidden="true"
    >
      {player.photoUrl ? (
        <img
          src={player.photoUrl}
          alt=""
          className="h-full w-full rounded-full object-cover"
          loading="lazy"
        />
      ) : (
        initials(player.firstName, player.lastName)
      )}
      {player.jerseyNumber !== null && player.jerseyNumber !== undefined ? (
        <span className="absolute -bottom-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-line bg-canvas px-1 text-[9px] font-bold text-ink-muted">
          {player.jerseyNumber}
        </span>
      ) : null}
    </span>
  )
}
