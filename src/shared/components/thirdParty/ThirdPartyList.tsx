import { useEffect, useMemo, useRef, useState, type ComponentType, type RefObject } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, CalendarRange } from 'lucide-react'
import { Card, ICON_STYLES, type IconColor } from '../dashboard/DashboardKit'
import { ListPagination } from '../ListPagination'
import { TableExportButtons } from '../TableExportButtons'
import { Avatar } from '../Avatar'
import { formatMoney, formatDateTimeAmPm } from '../../../utils/format'
import { ROUTES } from '../../../routes'
import { useUserIdByName } from '../../../features/users/users.queries'

const COLUMNS = ['Third-Party Name', 'Country', 'Outstanding Balance', 'Tpin', 'Sales Representatives', 'Email & Phone', 'Nature Of Third Party', 'Tracking Id', 'Creation Date', 'Status']
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

function matchesSearch(row: ThirdPartyRow, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [row.name, row.country, row.tpin, row.email, row.phone, row.nature, row.trackingId, row.salesRep].some((field) => field.toLowerCase().includes(q))
}

export interface ThirdPartyRow {
  name: string
  country: string
  outstandingBalance: number
  tpin: string
  salesRep: string
  email: string
  phone: string
  nature: string
  trackingId: string
  // Raw, parseable timestamp (MySQL datetime string) — formatted for
  // display via formatDateTimeAmPm at render time, and parsed directly for
  // the date-range filter below. Keeping it raw here (not pre-formatted by
  // the caller) is what lets both uses work off the same value.
  creationDate: string
  creatorName: string
  status: 'Active' | 'Inactive'
}

export interface ThirdPartyStatSpec {
  label: string
  value: string | number
  caption: string
  icon: ComponentType<{ size?: number }>
  color: IconColor
}

function StatCard({ stat }: { stat: ThirdPartyStatSpec }) {
  const Icon = stat.icon
  return (
    <Card className="!p-3 !flex-row items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">{stat.label}</p>
        <p className="text-xl font-bold text-text! mt-1">{stat.value}</p>
        <p className="text-xs text-text-faint mt-0.5">{stat.caption}</p>
      </div>
      <span className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${ICON_STYLES[stat.color]}`}>
        <Icon size={20} />
      </span>
    </Card>
  )
}

// "Creation Date" column's creator name — resolved to a real user id
// on a best-effort basis (see useUserIdByName's own doc comment) and only
// rendered as a link to that user's detail page when the match is
// unambiguous; otherwise falls back to plain text so it never links to the
// wrong profile. Split into its own component (not inlined in the row map)
// because useUserIdByName is a hook and can't be called from inside .map().
function CreatorCell({ name, date }: { name: string; date: string }) {
  const userId = useUserIdByName(name)
  if (!name) return null
  return (
    <div className="flex items-center gap-2">
      <Avatar name={name} size={28} color="bg-teal-500" className="text-xs" />
      <div className="min-w-0">
        {userId !== undefined ? (
          <Link to={ROUTES.userDetail.replace(':id', String(userId))} className="block truncate text-brand hover:underline">
            {name}
          </Link>
        ) : (
          <div className="truncate text-brand">{name}</div>
        )}
        <div className="whitespace-nowrap text-xs text-text-faint">On : {formatDateTimeAmPm(date)}</div>
      </div>
    </div>
  )
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

type RangeKey = 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'lastYear' | 'custom'

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
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

function computeRange(key: RangeKey, customFrom: string, customTo: string): { from: Date; to: Date } | null {
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

export function ThirdPartyList({
  icon: HeaderIcon,
  title,
  newPath,
  newLabel,
  stats,
  rows,
}: {
  icon: ComponentType<{ size?: number; className?: string }>
  title: string
  newPath: string
  newLabel: string
  stats: ThirdPartyStatSpec[]
  rows: ThirdPartyRow[]
}) {
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [search, setSearch] = useState('')

  const [dateMenuOpen, setDateMenuOpen] = useState(false)
  const [dateRangeKey, setDateRangeKey] = useState<RangeKey | null>(null)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const dateMenuRef = useRef<HTMLDivElement>(null)
  useClickOutside(dateMenuRef, () => setDateMenuOpen(false), dateMenuOpen)

  const filteredRows = useMemo(() => {
    const range = dateRangeKey ? computeRange(dateRangeKey, customFrom, customTo) : null
    return rows.filter((r) => {
      if (!matchesSearch(r, search)) return false
      if (!range) return true
      if (!r.creationDate) return false
      const d = new Date(r.creationDate)
      return !Number.isNaN(d.getTime()) && d >= range.from && d <= range.to
    })
  }, [rows, dateRangeKey, customFrom, customTo, search])

  useEffect(() => {
    setPage(1)
  }, [dateRangeKey, customFrom, customTo, search, perPage])

  const pageRows = filteredRows.slice((page - 1) * perPage, page * perPage)
  const activeRangeLabel = RANGE_OPTIONS.find((o) => o.key === dateRangeKey)?.label ?? 'Select Date Range'

  function getExportData() {
    const rows = filteredRows.map((r) => [
      r.name,
      r.country,
      `${formatMoney(r.outstandingBalance)} ZMW`,
      r.tpin,
      r.salesRep,
      [r.email, r.phone].filter(Boolean).join(' '),
      r.nature,
      r.trackingId,
      r.creationDate ? formatDateTimeAmPm(r.creationDate) : '',
      r.status,
    ])
    return { headers: COLUMNS, rows }
  }

  return (
    // -m-6 + flex-1 flex-col: same pattern as StickyFormShell.tsx — lets the table Card
    // stretch to fill leftover height so ListPagination below sits flush against main's true
    // bottom even when there are only a few rows, instead of floating right under the table
    // with dead space below it.
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      {/* sticky -top-6 (not top-0): position:sticky's offset is always measured from main's
          own padding edge (24px inset), not its true edge — -24px shifts the stick point to
          clamp flush against main's true top instead. See StickyFormShell.tsx for the full
          writeup. -mx-6 bleeds it edge-to-edge horizontally the same way. */}
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <HeaderIcon size={20} className="text-brand" /> {title}
        </h2>
        <Link to={newPath} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          <Plus size={14} /> {newLabel}
        </Link>
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          {stats.map((s) => (
            <StatCard key={s.label} stat={s} />
          ))}
        </div>

        <Card className="!p-0 overflow-hidden flex-1 min-h-0">
          <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
            <select
              value={perPage}
              onChange={(e) => setPerPage(Number(e.target.value))}
              className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <div className="relative w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search"
                className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text pl-8 pr-3 py-1.5"
              />
            </div>
            <TableExportButtons title={title} getExportData={getExportData} />
            <div className="relative ml-auto" ref={dateMenuRef}>
              <button
                type="button"
                onClick={() => setDateMenuOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-md border border-input-border bg-input-bg px-3 py-1.5 text-sm text-text-muted hover:bg-surface-hover"
              >
                <CalendarRange size={14} /> {activeRangeLabel}
              </button>
              {dateMenuOpen && (
                <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-lg border border-border bg-white py-1 shadow-lg dark:bg-gray-900">
                  {RANGE_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => {
                        setDateRangeKey(opt.key)
                        if (opt.key !== 'custom') setDateMenuOpen(false)
                      }}
                      className={`block w-full text-left px-3 py-2 text-sm ${dateRangeKey === opt.key ? 'bg-brand text-white' : 'text-text hover:bg-surface-hover'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                  {dateRangeKey === 'custom' && (
                    <div className="space-y-2 border-t border-border px-3 py-2">
                      <input
                        type="date"
                        value={customFrom}
                        onChange={(e) => setCustomFrom(e.target.value)}
                        className="w-full rounded-md border border-input-border bg-input-bg px-2 py-1 text-sm text-text"
                      />
                      <input
                        type="date"
                        value={customTo}
                        onChange={(e) => setCustomTo(e.target.value)}
                        className="w-full rounded-md border border-input-border bg-input-bg px-2 py-1 text-sm text-text"
                      />
                      <button type="button" onClick={() => setDateMenuOpen(false)} className="w-full rounded-md bg-brand py-1.5 text-sm text-white hover:bg-brand-hover">
                        Apply
                      </button>
                    </div>
                  )}
                  {dateRangeKey && (
                    <button
                      type="button"
                      onClick={() => {
                        setDateRangeKey(null)
                        setCustomFrom('')
                        setCustomTo('')
                        setDateMenuOpen(false)
                      }}
                      className="block w-full border-t border-border px-3 py-2 text-left text-sm text-danger hover:bg-surface-hover"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          {/* flex-1 + min-h-0 (not a fixed max-h-[60vh]): lets this scroll area size itself
              to whatever room the flex-stretched Card actually has, rather than a hard-coded
              viewport fraction that leaves dead space in a short list or is arbitrary in a
              tall one. min-h-0 is what lets overflow-auto actually engage inside a flex
              column instead of growing to fit all rows unclipped (the usual nested-flexbox-
              scroll gotcha). */}
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                {COLUMNS.map((col) => (
                  <th key={col} className="font-medium px-4 py-2.5 whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-text-faint italic" colSpan={COLUMNS.length}>
                    No Data Available In Table
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-text-faint italic" colSpan={COLUMNS.length}>
                    No records match your search or filter.
                  </td>
                </tr>
              ) : (
                pageRows.map((r, i) => (
                  // r.name isn't guaranteed unique (backend data can have
                  // two rows with the same display name, e.g. duplicate
                  // "customer5" entries) and there's no real id field on
                  // ThirdPartyRow — index within this read-only, paginated
                  // slice is stable and always unique.
                  <tr key={i} className="border-b border-border">
                    <td className="px-4 py-3 text-brand">{r.name}</td>
                    <td className="px-4 py-3 text-text-muted">{r.country}</td>
                    <td className="px-4 py-3 text-text! tabular-nums">{formatMoney(r.outstandingBalance)} ZMW</td>
                    <td className="px-4 py-3 text-text-muted">{r.tpin}</td>
                    <td className="px-4 py-3 text-text-muted">{r.salesRep}</td>
                    <td className="px-4 py-3 text-text-muted">
                      {r.email}
                      <br />
                      {r.phone}
                    </td>
                    <td className="px-4 py-3 text-text-muted">{r.nature}</td>
                    <td className="px-4 py-3 text-text-muted">{r.trackingId}</td>
                    <td className="px-4 py-3">
                      <CreatorCell name={r.creatorName} date={r.creationDate} />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${r.status === 'Active' ? 'bg-success-bg text-success-fg' : 'bg-neutral-bg text-neutral-fg'}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </Card>
      </div>
      <ListPagination page={page} perPage={perPage} total={filteredRows.length} onPageChange={setPage} edgeToEdge />
    </div>
  )
}
