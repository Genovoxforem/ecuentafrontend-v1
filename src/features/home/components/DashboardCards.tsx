import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

const ICON_BG = {
  brand: 'bg-brand/15 text-brand',
  success: 'bg-success-bg text-success-fg',
  warning: 'bg-warning-bg text-warning-fg',
  info: 'bg-info-bg text-info-fg',
  danger: 'bg-danger-bg text-danger-fg',
} as const

export type StatTone = keyof typeof ICON_BG

// Glass card with optional header — a premium surface with border, rounded
// corners, and subtle shadow. Used for chart containers and data sections.
export function GlassCard({
  children,
  className = '',
  header,
  action,
}: {
  children: ReactNode
  className?: string
  header?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className={`rounded-2xl border border-border bg-surface shadow-sm transition-shadow hover:shadow-md hover:shadow-black/5 ${className}`}>
      {(header || action) && (
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
          {header}
          {action}
        </div>
      )}
      <div className={header || action ? 'px-5 pb-5' : 'p-5'}>{children}</div>
    </div>
  )
}

// Card header with icon badge + title + optional subtitle.
export function CardHeader({
  icon: Icon,
  title,
  subtitle,
  tone = 'brand',
}: {
  icon: LucideIcon
  title: string
  subtitle?: string
  tone?: StatTone
}) {
  return (
    <div className="flex items-center gap-3">
      <span className={`shrink-0 w-9 h-9 rounded-xl grid place-items-center ${ICON_BG[tone]}`}>
        <Icon size={17} />
      </span>
      <div className="min-w-0">
        <h3 className="font-semibold text-text leading-tight truncate">{title}</h3>
        {subtitle && <p className="text-xs text-text-faint truncate mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}
