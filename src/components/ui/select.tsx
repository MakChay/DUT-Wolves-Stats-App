import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface SelectProps {
  value: string
  onValueChange: (value: string) => void
  options: { value: string; label: string }[]
  label: string
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function Select({
  value,
  onValueChange,
  options,
  label,
  placeholder = 'Select…',
  className,
  disabled,
}: SelectProps) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectPrimitive.Trigger
        aria-label={label}
        className={cn(
          'flex h-10 min-w-0 items-center justify-between gap-2 rounded-control border border-line bg-surface-raised px-3 text-sm font-medium text-ink transition-colors hover:border-white/20 focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-50',
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon>
          <ChevronDown className="h-4 w-4 text-ink-faint" aria-hidden="true" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className="z-[90] max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-card border border-line bg-surface-raised shadow-card"
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className="flex cursor-pointer select-none items-center justify-between gap-3 rounded-md px-2.5 py-2 text-sm text-ink-muted outline-none data-[highlighted]:bg-white/5 data-[highlighted]:text-ink data-[state=checked]:text-ink"
              >
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator>
                  <Check className="h-4 w-4 text-accent" aria-hidden="true" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}

export function SelectField({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <span className="block text-xs font-semibold text-ink-muted">{label}</span>
      {children}
    </div>
  )
}
