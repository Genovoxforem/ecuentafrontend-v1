import { useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { LegacyTooltip } from '../legacyTooltip'

// Classic Dolibarr status badge numbers -> tone (badge-status0 draft ... badge-status6 paid / closed, 5 disabled).
const BADGE_TONE: Record<number, string> = {
  0: 'bg-neutral-bg text-neutral-fg',
  1: 'bg-warning-bg text-warning-fg',
  4: 'bg-success-bg text-success-fg',
  5: 'bg-danger-bg text-danger',
  6: 'bg-success-bg text-success-fg',
  8: 'bg-danger-bg text-danger',
  9: 'bg-danger-bg text-danger',
}

const CARD_WIDTH = 288

// The classic lists' hover card for a linked cell (invoice, third party, user), drawn from the backend's own tooltip
// (see legacyTooltip.ts). Shown on hover and on keyboard focus, in a portal so a scrolling table does not clip it;
// without a tooltip the children are shown alone.
export function LegacyTooltipCard({ tip, children }: { tip: LegacyTooltip | null; children: ReactNode }) {
  const anchor = useRef<HTMLSpanElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number; above: boolean } | null>(null)
  if (!tip) return <>{children}</>

  const show = () => {
    const r = anchor.current?.getBoundingClientRect()
    if (!r) return
    const above = r.bottom + 220 > window.innerHeight && r.top > 220
    setPos({ left: Math.max(8, Math.min(r.left, window.innerWidth - CARD_WIDTH - 8)), top: above ? r.top - 6 : r.bottom + 6, above })
  }
  const hide = () => setPos(null)

  return (
    <span ref={anchor} className="inline-block" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      {children}
      {pos &&
        createPortal(
          <div
            role="tooltip"
            style={{ left: pos.left, top: pos.top, width: CARD_WIDTH, transform: pos.above ? 'translateY(-100%)' : undefined }}
            className="pointer-events-none fixed z-[1000] rounded-lg border border-border bg-surface p-3 text-xs text-text shadow-lg"
          >
            <div className="flex items-center gap-2">
              {tip.initials && <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand/15 text-sm font-semibold text-brand">{tip.initials}</span>}
              <div className="min-w-0">
                <div className="truncate font-semibold text-text!">{tip.title}</div>
                {tip.badges.length > 0 && (
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {tip.badges.map((b, i) => (
                      <span key={i} className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${b.status != null ? (BADGE_TONE[b.status] ?? 'bg-neutral-bg text-neutral-fg') : 'bg-neutral-bg text-neutral-fg'}`}>
                        {b.text}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {tip.kind && <div className="mt-2 font-medium underline">{tip.kind}</div>}
            {tip.lines.length > 0 && (
              <div className="mt-1 space-y-0.5">
                {tip.lines.map((l, i) =>
                  l.label ? (
                    <div key={i} className="flex justify-between gap-3">
                      <span className="font-semibold">{l.label}</span>
                      <span className="text-right">{l.value}</span>
                    </div>
                  ) : (
                    <div key={i}>{l.value}</div>
                  ),
                )}
              </div>
            )}
          </div>,
          document.body,
        )}
    </span>
  )
}
