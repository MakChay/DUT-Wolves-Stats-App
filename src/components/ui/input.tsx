import type { InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface FieldProps {
  label: string
  htmlFor: string
  hint?: string
  error?: string
  children: ReactNode
}

export function Field({ label, htmlFor, hint, error, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-xs font-semibold text-ink-muted">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-ink-faint">{hint}</p>
      ) : null}
    </div>
  )
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-11 w-full rounded-control border border-line bg-canvas/60 px-3 text-sm text-ink placeholder:text-ink-faint transition-colors hover:border-white/20 focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/30',
        className,
      )}
      {...props}
    />
  )
}
