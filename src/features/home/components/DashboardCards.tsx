import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { AnimatedCounter } from './AnimatedCounter'

// Premium gradient stat card with icon badge, animated counter, and trend badge.
// Uses a subtle gradient surface that adapts to dark mode via token overrides.
const GRADIENTS = {
  brand: 'from-brand/15 to-brand/5',
  success: 'from-success/15 to-success/5',
  warning: 'from-warning/15 to-warning/5',
  info: 'from-info/15 to-info/5',
  danger: 'from-danger/15 to-danger/5',
} as const

const ICON_BG = {
  brand: 'bg-brand/15 text-brand',
  success: 'bg-success-bg text-success-fg',
  warning: 'bg-warning-bg text-warning-fg',
  info: 'bg-info-bg text-info-fg',
  danger: 'bg-danger-bg text-danger-fg',
} as const

export type StatTone = keyof typeof GRADIENTS

export function StatCard({
  icon: Icon,
  label,
  value,
  format,
  trend,
  trendUp,
  sublabel,
  tone = 'brand',
}: {
  icon: LucideIcon
  label: string
  value: number
  format?: (n: number) => string
  trend?: number
  trendUp?: boolean
  sublabel?: string
  tone?: StatTone
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br ${GRADIENTS[tone]} p-4 h-full flex flex-col justify-center transition-shadow hover:shadow-lg hover:shadow-black/5`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wide truncate">{label}</p>
          <p className="mt-1.5 text-2xl font-bold text-text leading-tight">
            <AnimatedCounter value={value} format={format} />
          </p>
          {sublabel && <p className="mt-0.5 text-xs text-text-faint truncate">{sublabel}</p>}
        </div>
        <span className={`shrink-0 w-10 h-10 rounded-xl grid place-items-center ${ICON_BG[tone]}`}>
          <Icon size={18} />
        </span>
      </div>
      {trend !== undefined && (
        <div className="mt-2 flex items-center gap-1.5">
          <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${trendUp ? 'text-success' : 'text-danger'}`}>
            {trendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(trend).toFixed(1)}%
          </span>
          <span className="text-xs text-text-faint">vs last year</span>
        </div>
      )}
    </div>
  )
}

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
