import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Converts this widget's `YYYY-MM` value into the real "Month Year" text
// (e.g. "September 2026") that the real monthPic query param expects —
// confirmed live on payroll/earn_dedu.php, payroll/atten_overall_rip.php
// and payroll/atten_emp_rip.php, all of which parse it server-side via a
// human month-name string, not a machine date format.
export function monthIsoToLabel(value: string): string {
  const [year, month] = value.split('-')
  const d = new Date(Number(year), Number(month) - 1, 1)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

// Matches a real Dolibarr month-picker widget seen on several Payroll
// report pages (payroll/earn_dedu.php, payroll/atten_overall_rip.php,
// confirmed live on both): a blank field until a month is actually
// confirmed, opening a popover with prev/next arrows either side of
// Month/Year dropdowns and a Now/Done footer — not a plain native month
// input. `value` is `YYYY-MM`; callers that need the real widget's own
// "Month Year" text (e.g. for a monthPic query param) format it themselves.
export function MonthYearPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false)
  const [pendingMonth, setPendingMonth] = useState(new Date().getMonth())
  const [pendingYear, setPendingYear] = useState(new Date().getFullYear())
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function openPicker() {
    const now = new Date()
    const [y, m] = value ? value.split('-').map(Number) : [now.getFullYear(), now.getMonth() + 1]
    setPendingYear(y)
    setPendingMonth(m - 1)
    setOpen(true)
  }

  function shiftMonth(delta: number) {
    let m = pendingMonth + delta
    let y = pendingYear
    if (m < 0) {
      m = 11
      y -= 1
    } else if (m > 11) {
      m = 0
      y += 1
    }
    setPendingMonth(m)
    setPendingYear(y)
  }

  function handleNow() {
    const now = new Date()
    setPendingMonth(now.getMonth())
    setPendingYear(now.getFullYear())
  }

  function handleDone() {
    onChange(`${pendingYear}-${String(pendingMonth + 1).padStart(2, '0')}`)
    setOpen(false)
  }

  const yearOptions = useMemo(() => {
    const base = new Date().getFullYear()
    return Array.from({ length: 12 }, (_, i) => base - 6 + i)
  }, [])

  const [displayYear, displayMonth] = value ? value.split('-').map(Number) : [0, 0]

  return (
    <div className="relative" ref={containerRef}>
      <input
        readOnly
        value={value ? `${MONTH_LABELS[displayMonth - 1]} ${displayYear}` : ''}
        onClick={openPicker}
        placeholder="Select Month"
        className={`${inputCls} w-40 cursor-pointer`}
      />
      {open && (
        <div className="absolute z-20 mt-1 w-60 rounded-lg border border-border bg-surface shadow-lg p-2">
          <div className="flex items-center gap-1 mb-2">
            <button type="button" onClick={() => shiftMonth(-1)} className="p-1.5 rounded-md text-text-muted hover:bg-surface-hover">
              <ChevronLeft size={14} />
            </button>
            <select
              value={pendingMonth}
              onChange={(e) => setPendingMonth(Number(e.target.value))}
              className="flex-1 text-sm rounded-md border border-input-border bg-input-bg text-text px-1.5 py-1"
            >
              {MONTH_LABELS.map((m, i) => (
                <option key={m} value={i}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={pendingYear}
              onChange={(e) => setPendingYear(Number(e.target.value))}
              className="flex-1 text-sm rounded-md border border-input-border bg-input-bg text-text px-1.5 py-1"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <button type="button" onClick={() => shiftMonth(1)} className="p-1.5 rounded-md text-text-muted hover:bg-surface-hover">
              <ChevronRight size={14} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleNow} className="flex-1 text-xs rounded-md border border-border px-2 py-1.5 text-text-muted hover:bg-surface-hover">
              Now
            </button>
            <button type="button" onClick={handleDone} className="flex-1 text-xs rounded-md bg-text px-2 py-1.5 text-white hover:opacity-90">
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
