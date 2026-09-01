import type { ReactNode } from 'react'

// Circular progress ring — used for the hero's Sales/Purchase-share dials
// and the per-bank balance rings. `percent` is a real, derived ratio (e.g.
// a bank's balance vs. the largest balance, or today's sales count vs.
// today's sales+purchase count) — never an invented decorative number.
export function RadialGauge({
  percent,
  size = 96,
  strokeWidth = 8,
  color = 'var(--color-brand)',
  trackColor = 'var(--color-surface-hover)',
  children,
}: {
  percent: number
  size?: number
  strokeWidth?: number
  color?: string
  trackColor?: string
  children?: ReactNode
}) {
  const clamped = Math.max(0, Math.min(100, percent))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - clamped / 100)

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      {children && <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>}
    </div>
  )
}
