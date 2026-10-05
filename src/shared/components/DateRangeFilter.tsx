import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { CalendarRange } from 'lucide-react'

// Date-range picker used by the list pages' toolbar (Customers, Vendors, Orders,
// Invoices, Quotations, Contracts, Purchase Orders…): a button showing the active
// range that opens a small menu of presets plus a custom from/to. Filtering is
// done client-side by the list, with `inRange` below, on whichever date column
// that list has.

export type RangeKey = 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'lastYear' | 'custom'

export const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'last7', label: 'Last 7 Days' },
  { key: 'last30', label: 'Last 30 Days' },
  { key: 'thisMonth', label: 'This Month' },
  { key: 'lastMonth', label: 'Last Month' },
  { key: 'thisYear', label: 'This Year' },
  { key: 'lastYear', label: 'Last Year' },
  { key: 'custom', label: 'Custom Range' },
]

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}
function endOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

export function computeRange(key: RangeKey, customFrom: string, customTo: string): { from: Date; to: Date } | null {
  const now = new Date()
  switch (key) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) }
    case 'yesterday': {
      const y = new Date(now)
      y.setDate(y.getDate() - 1)
      return { from: startOfDay(y), to: endOfDay(y) }
    }
    case 'last7': {
      const from = new Date(now)
      from.setDate(from.getDate() - 6)
      return { from: startOfDay(from), to: endOfDay(now) }
    }
    case 'last30': {
      const from = new Date(now)
      from.setDate(from.getDate() - 29)
      return { from: startOfDay(from), to: endOfDay(now) }
    }
    case 'thisMonth':
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfDay(now) }
    case 'lastMonth': {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const to = new Date(now.getFullYear(), now.getMonth(), 0)
      return { from: startOfDay(from), to: endOfDay(to) }
    }
    case 'thisYear':
      return { from: new Date(now.getFullYear(), 0, 1), to: endOfDay(now) }
    case 'lastYear':
      return { from: new Date(now.getFullYear() - 1, 0, 1), to: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999) }
    case 'custom':
      if (!customFrom || !customTo) return null
      return { from: startOfDay(new Date(customFrom)), to: endOfDay(new Date(customTo)) }
  }
}

function useClickOutside(ref: RefObject<HTMLElement | null>, onOutside: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [active, onOutside, ref])
}

export interface DateRangeState {
  key: RangeKey | null
  customFrom: string
  customTo: string
  setKey: (k: RangeKey | null) => void
  setCustomFrom: (v: string) => void
  setCustomTo: (v: string) => void
  clear: () => void
  // True when `dateValue` (anything `new Date()` parses, e.g. "2026-10-02" or
  // "2026-10-02 06:47:00") falls inside the chosen range; always true when no
  // range is chosen. A row without a usable date doesn't match an active range.
  inRange: (dateValue: string | null | undefined) => boolean
}

export function useDateRange(): DateRangeState {
  const [key, setKey] = useState<RangeKey | null>(null)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const range = useMemo(() => (key ? computeRange(key, customFrom, customTo) : null), [key, customFrom, customTo])
  const clear = useCallback(() => {
    setKey(null)
    setCustomFrom('')
    setCustomTo('')
  }, [])
  const inRange = useCallback(
    (dateValue: string | null | undefined) => {
      if (!range) return true
      if (!dateValue) return false
      const d = new Date(dateValue.length === 10 ? `${dateValue}T12:00:00` : dateValue.replace(' ', 'T'))
      return !Number.isNaN(d.getTime()) && d >= range.from && d <= range.to
    },
    [range],
  )
  return { key, customFrom, customTo, setKey, setCustomFrom, setCustomTo, clear, inRange }
}

export function DateRangeButton({ state, className = 'ml-auto' }: { state: DateRangeState; className?: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useClickOutside(ref, () => setOpen(false), open)
  const label = RANGE_OPTIONS.find((o) => o.key === state.key)?.label ?? 'Select Date Range'

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-md border border-input-border bg-input-bg px-3 py-1.5 text-sm text-text-muted hover:bg-surface-hover"
      >
        <CalendarRange size={14} /> {label}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-lg border border-border bg-white py-1 shadow-lg dark:bg-gray-900">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => {
                state.setKey(opt.key)
                if (opt.key !== 'custom') setOpen(false)
              }}
              className={`block w-full text-left px-3 py-2 text-sm ${state.key === opt.key ? 'bg-brand text-white' : 'text-text hover:bg-surface-hover'}`}
            >
              {opt.label}
            </button>
          ))}
          {state.key === 'custom' && (
            <div className="space-y-2 border-t border-border px-3 py-2">
              <input
                type="date"
                value={state.customFrom}
                onChange={(e) => state.setCustomFrom(e.target.value)}
                className="w-full rounded-md border border-input-border bg-input-bg px-2 py-1 text-sm text-text"
              />
              <input
                type="date"
                value={state.customTo}
                onChange={(e) => state.setCustomTo(e.target.value)}
                className="w-full rounded-md border border-input-border bg-input-bg px-2 py-1 text-sm text-text"
              />
              <button type="button" onClick={() => setOpen(false)} className="w-full rounded-md bg-brand py-1.5 text-sm text-white hover:bg-brand-hover">
                Apply
              </button>
            </div>
          )}
          {state.key && (
            <button
              type="button"
              onClick={() => {
                state.clear()
                setOpen(false)
              }}
              className="block w-full border-t border-border px-3 py-2 text-left text-sm text-danger hover:bg-surface-hover"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  )
}
