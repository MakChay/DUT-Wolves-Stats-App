import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

const buttonVariants = cva(
  'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-control text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-45',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-accent-contrast hover:bg-accent-hover active:bg-accent-hover',
        secondary: 'border border-line bg-surface-raised text-ink hover:border-accent/30 hover:bg-surface-hover',
        ghost: 'text-ink-muted hover:bg-surface-raised hover:text-ink',
        outline: 'border border-accent/40 bg-transparent text-accent hover:bg-accent/10',
        danger: 'bg-danger/15 text-danger hover:bg-danger/25',
        success: 'bg-success/15 text-success hover:bg-success/25',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4',
        lg: 'h-12 px-5 text-base',
        icon: 'h-9 w-9',
        'icon-lg': 'h-11 w-11',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button'
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />
}

export { buttonVariants }
