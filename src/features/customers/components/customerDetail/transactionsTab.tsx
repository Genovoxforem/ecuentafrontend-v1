import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, CalendarClock, ChevronDown, Filter } from 'lucide-react'
import { Card } from '../../../../shared/components/dashboard/DashboardKit'
import { TableExportButtons } from '../../../../shared/components/TableExportButtons'
import { formatMoney } from '../../../../utils/format'
import { LegacyLoadingCard, LegacyErrorCard } from '../../../products/components/LegacyReportStates'
import { useCustomerLedger } from '../../customerDetailTabs.queries'
import { TabTitle } from './CustomerDetailShared'

const DATE_RANGE_PRESETS = ['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'This Month', 'Last Month', 'This Year', 'Last Year', 'Custom Range'] as const

type DateRangePreset = (typeof DATE_RANGE_PRESETS)[number]

export function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function addDays(d: Date, n: number) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function presetRange(preset: DateRangePreset): { from: Date; to: Date } | null {
  const now = startOfDay(new Date())
  switch (preset) {
    case 'Today':
      return { from: now, to: now }
    case 'Yesterday':
      return { from: addDays(now, -1), to: addDays(now, -1) }
    case 'Last 7 Days':
      return { from: addDays(now, -6), to: now }
    case 'Last 30 Days':
      return { from: addDays(now, -29), to: now }
    case 'This Month':
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: new Date(now.getFullYear(), now.getMonth() + 1, 0) }
    case 'Last Month':
      return { from: new Date(now.getFullYear(), now.getMonth() - 1, 1), to: new Date(now.getFullYear(), now.getMonth(), 0) }
    case 'This Year':
      return { from: new Date(now.getFullYear(), 0, 1), to: new Date(now.getFullYear(), 11, 31) }
    case 'Last Year':
      return { from: new Date(now.getFullYear() - 1, 0, 1), to: new Date(now.getFullYear() - 1, 11, 31) }
    case 'Custom Range':
      return null
  }
}

function toInputDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fromInputDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function toUsDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${m}/${d}/${y}`
}

export function shiftMonth(year: number, month: number, delta: number) {
  const d = new Date(year, month + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() }
}

function buildMonthGrid(year: number, month: number) {
  const firstOfMonth = new Date(year, month, 1)
  const gridStart = addDays(firstOfMonth, -firstOfMonth.getDay())
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
}

export const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

const CALENDAR_CURRENT_YEAR = new Date().getFullYear()

const CALENDAR_YEAR_OPTIONS = Array.from({ length: 21 }, (_, i) => CALENDAR_CURRENT_YEAR - 15 + i)

// One month grid, used twice side-by-side inside the date-range dropdown
// panel below. Each side navigates independently (own prev/next + month/year
// selects), matching the legacy jQuery daterangepicker's two-calendar view.
export function MonthCalendar({
  year,
  month,
  onNavigate,
  fromIso,
  toIso,
  onPickDay,
}: {
  year: number
  month: number
  onNavigate: (year: number, month: number) => void
  fromIso: string
  toIso: string
  onPickDay: (d: Date) => void
}) {
  const grid = buildMonthGrid(year, month)
  return (
    <div className="w-64">
      <div className="flex items-center justify-between gap-1 mb-2">
        <button
          type="button"
          onClick={() => {
            const s = shiftMonth(year, month, -1)
            onNavigate(s.year, s.month)
          }}
          className="p-1 rounded hover:bg-surface-hover text-text-faint"
        >
          <ChevronLeft size={14} />
        </button>
        <div className="flex items-center gap-1">
          <select
            value={month}
            onChange={(e) => onNavigate(year, Number(e.target.value))}
            className="text-xs rounded-md border border-input-border bg-input-bg text-text px-1 py-1"
          >
            {MONTH_NAMES.map((m, i) => (
              <option key={m} value={i}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => onNavigate(Number(e.target.value), month)}
            className="text-xs rounded-md border border-input-border bg-input-bg text-text px-1 py-1"
          >
            {CALENDAR_YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => {
            const s = shiftMonth(year, month, 1)
            onNavigate(s.year, s.month)
          }}
          className="p-1 rounded hover:bg-surface-hover text-text-faint"
        >
          <ChevronRight size={14} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w} className="text-[11px] font-medium text-text-faint py-1">
            {w}
          </div>
        ))}
        {grid.map((d) => {
          const iso = toInputDate(d)
          const inMonth = d.getMonth() === month
          const inRange = iso >= fromIso && iso <= toIso
          const isStart = iso === fromIso
          const isEnd = iso === toIso
          const dimClass = inMonth ? 'text-text' : 'text-text-faint/40'
          let cellClass = dimClass
          if (isStart && isEnd) cellClass = 'bg-brand text-white rounded-md'
          else if (isStart) cellClass = 'bg-brand text-white rounded-l-md'
          else if (isEnd) cellClass = 'bg-brand text-white rounded-r-md'
          else if (inRange) cellClass = `bg-brand/15 ${dimClass}`
          return (
            <button key={iso} type="button" onClick={() => onPickDay(d)} className={`text-xs py-1.5 ${cellClass}`}>
              {d.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Native replacement for the legacy page's own jQuery daterangepicker
// (societe/card.php's Transactions tab) — same 9 presets, same dual
// month-calendar layout, and the same pending-selection-until-Apply
// behavior: picking a preset or a day only updates the panel's own pending
// state, nothing is flowed up to the parent (and the ledger query, which
// only re-fetches on the outer "Filter" click per useCustomerLedger's
// datefilter contract — see customerDetailTabs.queries.ts) until "Apply" is
// clicked. "Clear" and an outside click both discard the pending picks.
//
// The panel renders through a portal into document.body (see
// SearchableSelect for the same pattern) rather than as a plain `position:
// absolute` child — this dropdown sits inside a Card with `overflow-hidden`
// (for the table's rounded corners), which silently clips a plain absolute
// child once it's tall/wide enough to spill past the Card's own box.
const DATE_RANGE_PANEL_WIDTH = 704

function DateRangeDropdown({
  preset,
  fromDate,
  toDate,
  onChange,
}: {
  preset: DateRangePreset
  fromDate: string
  toDate: string
  onChange: (preset: DateRangePreset, fromDate: string, toDate: string) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0 })

  const [pendingPreset, setPendingPreset] = useState<DateRangePreset>(preset)
  const [pendingFrom, setPendingFrom] = useState(fromDate)
  const [pendingTo, setPendingTo] = useState(toDate)
  // First day picked in an in-progress custom range click; null once a
  // start+end pair is complete (so the next click starts a fresh range).
  const [anchor, setAnchor] = useState<string | null>(null)
  const [leftCursor, setLeftCursor] = useState(() => {
    const d = fromInputDate(fromDate)
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const [rightCursor, setRightCursor] = useState(() => shiftMonth(leftCursor.year, leftCursor.month, 1))

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node
      if (rootRef.current?.contains(target)) return
      if (panelRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  useLayoutEffect(() => {
    if (!open) return
    function updatePosition() {
      const rect = buttonRef.current?.getBoundingClientRect()
      if (!rect) return
      const left = Math.min(rect.left, window.innerWidth - DATE_RANGE_PANEL_WIDTH - 8)
      setPanelPos({ top: rect.bottom + 4, left: Math.max(8, left) })
    }
    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [open])

  // Reset the panel to the last-applied value every time it's opened, so
  // Clear/outside-click (which just close without calling onChange) always
  // discard back to a known-good state rather than whatever was left
  // mid-pick from the previous time the panel was open.
  useEffect(() => {
    if (!open) return
    setPendingPreset(preset)
    setPendingFrom(fromDate)
    setPendingTo(toDate)
    setAnchor(null)
    const d = fromInputDate(fromDate)
    setLeftCursor({ year: d.getFullYear(), month: d.getMonth() })
    setRightCursor(shiftMonth(d.getFullYear(), d.getMonth(), 1))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function selectPreset(p: DateRangePreset) {
    setPendingPreset(p)
    setAnchor(null)
    const range = presetRange(p)
    if (range) {
      setPendingFrom(toInputDate(range.from))
      setPendingTo(toInputDate(range.to))
      setLeftCursor({ year: range.from.getFullYear(), month: range.from.getMonth() })
      setRightCursor(shiftMonth(range.from.getFullYear(), range.from.getMonth(), 1))
    }
    // Custom Range — leave the pending dates and calendars as-is so the user can pick days.
  }

  function pickDay(d: Date) {
    const iso = toInputDate(d)
    setPendingPreset('Custom Range')
    if (!anchor) {
      setAnchor(iso)
      setPendingFrom(iso)
      setPendingTo(iso)
    } else {
      const [a, b] = anchor <= iso ? [anchor, iso] : [iso, anchor]
      setPendingFrom(a)
      setPendingTo(b)
      setAnchor(null)
    }
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-1.5 min-w-[220px]"
      >
        <CalendarClock size={14} className="text-text-faint shrink-0" />
        <span className="flex-1 text-left">
          {toUsDate(fromDate)} - {toUsDate(toDate)}
        </span>
        <ChevronDown size={14} className="text-text-faint shrink-0" />
      </button>
      {open &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: 'fixed', top: panelPos.top, left: panelPos.left, width: DATE_RANGE_PANEL_WIDTH }}
            className="z-50 flex rounded-lg border border-border bg-surface shadow-lg overflow-hidden"
          >
            <div className="w-36 py-1 border-r border-border shrink-0">
              {DATE_RANGE_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => selectPreset(p)}
                  className={`block w-full text-left px-3 py-1.5 text-sm ${pendingPreset === p ? 'bg-brand text-white' : 'text-text hover:bg-surface-hover'}`}
                >
                  {p}
                </button>
              ))}
            </div>
            <div>
              <div className="flex gap-4 p-3">
                <MonthCalendar
                  year={leftCursor.year}
                  month={leftCursor.month}
                  onNavigate={(y, m) => setLeftCursor({ year: y, month: m })}
                  fromIso={pendingFrom}
                  toIso={pendingTo}
                  onPickDay={pickDay}
                />
                <MonthCalendar
                  year={rightCursor.year}
                  month={rightCursor.month}
                  onNavigate={(y, m) => setRightCursor({ year: y, month: m })}
                  fromIso={pendingFrom}
                  toIso={pendingTo}
                  onPickDay={pickDay}
                />
              </div>
              <div className="flex items-center justify-between gap-3 px-3 py-2 border-t border-border">
                <span className="text-sm text-text">
                  {toUsDate(pendingFrom)} - {toUsDate(pendingTo)}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="text-sm rounded-md border border-border text-text-muted px-3 py-1.5 hover:bg-surface-hover"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(pendingPreset, pendingFrom, pendingTo)
                      setOpen(false)
                    }}
                    className="text-sm font-medium rounded-md bg-brand text-white px-3 py-1.5 hover:bg-brand/90"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}

export function TransactionsTab({ socid }: { socid: string | undefined }) {
  const thisMonth = presetRange('This Month')!

  // "Pending" is whatever's selected in the dropdown/inputs right now;
  // "applied" is what useCustomerLedger actually queries with — only
  // updated when Filter is clicked, so switching presets or editing a
  // custom date doesn't refetch until the user asks it to.
  const [preset, setPreset] = useState<DateRangePreset>('This Month')
  const [fromDate, setFromDate] = useState(toInputDate(thisMonth.from))
  const [toDate, setToDate] = useState(toInputDate(thisMonth.to))
  const [appliedFrom, setAppliedFrom] = useState(fromDate)
  const [appliedTo, setAppliedTo] = useState(toDate)

  const { data, isLoading, isError, error, refetch } = useCustomerLedger(socid, toUsDate(appliedFrom), toUsDate(appliedTo))

  if (isLoading) return <LegacyLoadingCard label="Loading transactions…" />
  if (isError || !data) {
    return <LegacyErrorCard title="Couldn't load transactions" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  }

  const middleRows = data.rows.filter((r) => r.type === 'row')

  function getExportData() {
    const rows = data!.rows.map((r) => [
      r.date,
      r.entry_type,
      r.reference,
      r.contra,
      r.description,
      r.debit ? formatMoney(r.debit) : '',
      r.credit ? formatMoney(r.credit) : '',
      formatMoney(r.cumulative),
    ])
    return { headers: ['Date', 'Entry Type', 'Reference', 'Contra Acc.', 'Description', 'Debit', 'Credit', 'Cumulative'], rows }
  }

  return (
    <div className="space-y-3">
      <TabTitle>Transactions</TabTitle>
      <Card className="!h-auto !p-0 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <label className="text-xs text-text-faint">Date Range:</label>
          <DateRangeDropdown
            preset={preset}
            fromDate={fromDate}
            toDate={toDate}
            onChange={(p, f, t) => {
              setPreset(p)
              setFromDate(f)
              setToDate(t)
            }}
          />
          <button
            type="button"
            onClick={() => {
              setAppliedFrom(fromDate)
              setAppliedTo(toDate)
            }}
            className="flex items-center gap-1.5 text-sm font-medium rounded-md bg-brand text-white px-3 py-1.5 hover:bg-brand/90"
          >
            <Filter size={14} />
            Filter
          </button>
        </div>
        <TableExportButtons title={data.account_title} getExportData={getExportData} />
      </div>
      <div className="p-4 overflow-x-auto">
        <h3 className="font-semibold text-text! mb-3">{data.account_title}</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
              <th className="font-medium py-2 pr-3">Date</th>
              <th className="font-medium py-2 pr-3">Entry Type</th>
              <th className="font-medium py-2 pr-3">Reference</th>
              <th className="font-medium py-2 pr-3">Contra Acc.</th>
              <th className="font-medium py-2 pr-3">Description</th>
              <th className="font-medium py-2 pr-3 text-right">Debit</th>
              <th className="font-medium py-2 pr-3 text-right">Credit</th>
              <th className="font-medium py-2 text-right">Cumulative</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r, i) => (
              <tr key={i} className={`border-b border-border last:border-0 ${r.type !== 'row' ? 'font-semibold' : ''}`}>
                <td className="py-2 pr-3 text-text-muted">{r.date}</td>
                <td className="py-2 pr-3 text-text-muted">{r.entry_type}</td>
                <td className="py-2 pr-3 text-text-muted">{r.reference}</td>
                <td className="py-2 pr-3 text-text-muted">{r.contra}</td>
                <td className="py-2 pr-3 text-text!">{r.description}</td>
                <td className="py-2 pr-3 text-right tabular-nums text-text-muted">{r.debit ? formatMoney(r.debit) : ''}</td>
                <td className="py-2 pr-3 text-right tabular-nums text-text-muted">{r.credit ? formatMoney(r.credit) : ''}</td>
                <td className="py-2 text-right tabular-nums text-text!">{formatMoney(r.cumulative)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {middleRows.length === 0 && <p className="text-center text-text-faint text-sm py-6">No Transactions Found For This Period</p>}
      </div>
      </Card>
    </div>
  )
}
