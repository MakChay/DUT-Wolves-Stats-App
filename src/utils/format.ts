/**
 * Fixtures are published for a South African audience and tip-off times are
 * always quoted in South African Standard Time. Pinning the time zone keeps
 * the schedule consistent for visitors browsing from elsewhere.
 */
const SAST = { timeZone: 'Africa/Johannesburg' } as const

export function formatDate(iso: string, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('en-ZA', {
    ...SAST,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options,
  }).format(new Date(iso))
}

export function formatWeekday(iso: string): string {
  return new Intl.DateTimeFormat('en-ZA', { ...SAST, weekday: 'short' }).format(new Date(iso))
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('en-ZA', {
    ...SAST,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso))
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('en-ZA', {
    ...SAST,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso))
}

/** Long form date used by the broadcast schedule. */
export function formatLongDate(iso: string): string {
  return new Intl.DateTimeFormat('en-ZA', {
    ...SAST,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso))
}

export function initials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
}

export function ordinal(value: number): string {
  const mod100 = value % 100
  if (mod100 >= 11 && mod100 <= 13) return `${value}th`
  switch (value % 10) {
    case 1:
      return `${value}st`
    case 2:
      return `${value}nd`
    case 3:
      return `${value}rd`
    default:
      return `${value}th`
  }
}

export function signed(value: number): string {
  return value > 0 ? `+${value}` : `${value}`
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
}
