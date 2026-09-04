import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalendarDays, ChevronLeft, ChevronRight, ChevronDown, Check, Plus, RotateCcw, RefreshCw, Cake, Umbrella, Search, Clock } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Avatar } from '../../../shared/components/Avatar'
import { formatDateTimeAmPm } from '../../../utils/format'
import { useAuth } from '../../auth/AuthContext'
import { AddEventModal } from './AddEventModal'
import { EventDetailModal } from './EventDetailModal'
import { useAgendaFilterOptions, useCalendarEvents, type ActionType, type CalendarEvent, type CalendarViewMode } from '../calendarApi.queries'

// Real "no owner restriction" sentinel this endpoint itself uses (see
// calendar_api.php: only `filtert > 0` adds the assignment WHERE clause) —
// not an app-invented value.
const ALL_OWNERS = -1

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function startOfWeek(d: Date) {
  const day = (d.getDay() + 6) % 7
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - day)
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
function fmtTime(ms: number) {
  return new Date(ms).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}
function toDateInputValue(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Dot + title/time pill, matching the reference design's calendar-cell
// event style (a colored dot keyed to the real type color, not the old
// left-border-bar treatment).
function EventChip({ ev, onOpen }: { ev: CalendarEvent; onOpen: (id: number) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(ev.id)}
      title={`${ev.typeLabel}${ev.location ? ' · ' + ev.location : ''}`}
      className="flex w-full items-start gap-1.5 rounded-md bg-surface px-1.5 py-1 text-left text-[11px] leading-tight hover:bg-surface-hover"
    >
      <span className="mt-1 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: ev.typeColor }} />
      <span className="min-w-0">
        <span className="block truncate font-semibold text-text!">{ev.label}</span>
        <span className="block text-text-faint">{ev.fullDayEvent ? 'All day' : fmtTime(ev.startMs)}</span>
      </span>
    </button>
  )
}

function MiniCalendar({ month, onSelect }: { month: Date; onSelect: (d: Date) => void }) {
  const [cursor, setCursor] = useState(new Date(month.getFullYear(), month.getMonth(), 1))
  useEffect(() => setCursor(new Date(month.getFullYear(), month.getMonth(), 1)), [month])
  const gridStart = startOfWeek(new Date(cursor.getFullYear(), cursor.getMonth(), 1))
  const days = Array.from({ length: 42 }, (_, i) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i))
  const today = new Date()

  return (
    <Card className="!h-auto !p-3">
      <div className="flex items-center justify-between mb-2">
        <button type="button" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="p-1 rounded hover:bg-surface-hover text-text-muted">
          <ChevronLeft size={14} />
        </button>
        <span className="text-sm font-semibold text-text!">
          {MONTH_NAMES[cursor.getMonth()]} {cursor.getFullYear()}
        </span>
        <button type="button" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="p-1 rounded hover:bg-surface-hover text-text-muted">
          <ChevronRight size={14} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] text-text-faint font-medium mb-1">
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((d) => {
          const inMonth = d.getMonth() === cursor.getMonth()
          const isToday = sameDay(d, today)
          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => onSelect(d)}
              className={`h-7 rounded-md text-xs ${isToday ? 'bg-brand text-white font-semibold' : inMonth ? 'text-text hover:bg-surface-hover' : 'text-text-faint hover:bg-surface-hover'}`}
            >
              {d.getDate()}
            </button>
          )
        })}
      </div>
    </Card>
  )
}

// Checkbox dropdown for Type — same click-outside pattern as Navbar.tsx's
// panels (ref + mousedown listener) — replaces the old inline chip list so
// picking among a potentially long, real c_actioncomm type list doesn't
// take over the whole filter row.
function TypeFilterDropdown({
  types,
  activeTypes,
  onToggle,
  onSelectAll,
  onDeselectAll,
}: {
  types: ActionType[]
  activeTypes: Set<string> | null
  onToggle: (code: string) => void
  onSelectAll: () => void
  onDeselectAll: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  const selectedCount = activeTypes?.size ?? 0
  const label = selectedCount === 0 ? 'No types' : selectedCount === types.length ? 'All Types' : `${selectedCount} Type${selectedCount === 1 ? '' : 's'}`

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 h-9 px-2.5 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none hover:bg-surface-hover"
      >
        {label}
        <ChevronDown size={14} className={`text-text-faint transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 w-64 max-h-80 overflow-y-auto rounded-md border border-border bg-surface shadow-lg z-20 py-1">
          <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-border">
            <button type="button" onClick={onSelectAll} className="text-xs font-medium text-brand hover:underline">
              Select all
            </button>
            <button type="button" onClick={onDeselectAll} className="text-xs font-medium text-brand hover:underline">
              Deselect all
            </button>
          </div>
          {types.map((t) => {
            const checked = activeTypes?.has(t.code) ?? false
            return (
              <button
                key={t.code}
                type="button"
                onClick={() => onToggle(t.code)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-surface-hover"
              >
                <span className={`flex items-center justify-center w-4 h-4 rounded border shrink-0 ${checked ? 'bg-brand border-brand' : 'border-input-border'}`}>
                  {checked && <Check size={11} className="text-white" />}
                </span>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.color || '#397db9' }} />
                <span className="truncate text-text!">{t.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

type ViewMode = 'month' | 'week' | 'day' | 'list'
const VIEW_TO_BACKEND_MODE: Record<ViewMode, CalendarViewMode> = { month: 'show_month', week: 'show_week', day: 'show_day', list: 'show_month' }

// Real via comm/action/ajax/calendar_api.php — see calendarApi.queries.ts
// for the full endpoint-by-endpoint evidence. Every filter below (Owner,
// User Group, Status, Type) and every rendered event comes straight from
// llx_actioncomm (plus real birthdays/holidays when those checks are on) —
// there is no local/fake activity-log layer left in this page.
//
// Layout follows the reference design (quick filter bar + calendar/list
// card + legend + a full-width Upcoming Events section), with the mini
// calendar as the only sidebar item. Both filter bars — the quick one
// (Search/Status/Owner/Project/Date range/Clear) and the secondary one
// (User Group, Type, Third-Party, Tag/Category, Resource, Birthdays/
// Holidays) — live together in the sticky header, right next to each
// other, instead of the second one sitting apart down by the calendar.
// Owner/Status/Project/Date range live in exactly one place (the top
// quick filter bar) instead of being wired to two controls sharing state.
export function AgendaOverview() {
  const { user } = useAuth()
  const { data: options } = useAgendaFilterOptions()

  // Seeds real filters from the sidebar's own pre-filtered links (My/All
  // Incomplete/Terminated Events, New Event) — see users.nav.ts for why
  // these query params exist: the real menu's leaf items have no dedicated
  // pages of their own, they're just this same real Agenda view with a
  // different starting filter, matching the real reference app's own
  // "status=todo&filtert=-1" style list.php links.
  const [searchParams] = useSearchParams()
  const initialStatus = searchParams.get('status') === 'done' || searchParams.get('status') === 'todo' ? searchParams.get('status')! : ''
  const initialView: ViewMode = searchParams.get('view') === 'list' ? 'list' : 'month'
  const initialScope = searchParams.get('scope')

  const [view, setView] = useState<ViewMode>(initialView)
  const [anchor, setAnchor] = useState(new Date())
  const [ownerId, setOwnerId] = useState<number | undefined>(initialScope === 'all' ? ALL_OWNERS : undefined)
  const [usergroupId, setUsergroupId] = useState<number | undefined>(undefined)
  const [status, setStatus] = useState(initialStatus)
  const [activeTypes, setActiveTypes] = useState<Set<string> | null>(null)
  const [projectId, setProjectId] = useState<number | undefined>(undefined)
  const [socid, setSocid] = useState<number | undefined>(undefined)
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined)
  const [resourceId, setResourceId] = useState<number | undefined>(undefined)
  const [showBirthday, setShowBirthday] = useState(false)
  const [checkHoliday, setCheckHoliday] = useState(false)
  const [showNewEvent, setShowNewEvent] = useState(searchParams.get('new') === '1')
  const [viewEventId, setViewEventId] = useState<number | null>(null)
  const [searchText, setSearchText] = useState('')

  // Default owner to the current logged-in user once real users load —
  // matches the real backend's own default (filtert = $user->id).
  useEffect(() => {
    if (ownerId === undefined && user?.id) setOwnerId(Number(user.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // Re-apply the sidebar's own pre-filtered query params whenever they
  // change. This route never unmounts between two "My/All Incomplete/
  // Terminated Events" sidebar clicks (same /agenda path, only the query
  // string differs), so without this the filters above — read only once,
  // via useState's initializer — would silently stay frozen at whatever
  // they were the first time this page mounted, making every subsequent
  // click on one of those real sidebar links a no-op.
  const searchParamsKey = searchParams.toString()
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    const nextStatus = searchParams.get('status') === 'done' || searchParams.get('status') === 'todo' ? searchParams.get('status')! : ''
    setStatus(nextStatus)
    setView(searchParams.get('view') === 'list' ? 'list' : 'month')
    setOwnerId(searchParams.get('scope') === 'all' ? ALL_OWNERS : user?.id ? Number(user.id) : undefined)
    if (searchParams.get('new') === '1') setShowNewEvent(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParamsKey])

  // Default every real type to "on" once loaded, instead of guessing a
  // fixed list — this instance's own c_actioncomm rows decide what exists.
  useEffect(() => {
    if (activeTypes === null && options?.types) setActiveTypes(new Set(options.types.map((t) => t.code)))
  }, [options, activeTypes])

  function resetFilters() {
    setOwnerId(user?.id ? Number(user.id) : undefined)
    setUsergroupId(undefined)
    setStatus('')
    setActiveTypes(options?.types ? new Set(options.types.map((t) => t.code)) : null)
    setProjectId(undefined)
    setSocid(undefined)
    setCategoryId(undefined)
    setResourceId(undefined)
    setShowBirthday(false)
    setCheckHoliday(false)
    setSearchText('')
    setAnchor(new Date())
    setView('month')
  }

  const backendMode = VIEW_TO_BACKEND_MODE[view]
  const actionCodes = activeTypes ? Array.from(activeTypes) : undefined
  const { data: events, isFetching, refetch } = useCalendarEvents({
    mode: backendMode,
    year: anchor.getFullYear(),
    month: anchor.getMonth() + 1,
    day: anchor.getDate(),
    ownerId,
    usergroupId,
    status: status || undefined,
    actionCodes,
    projectId,
    socid,
    categoryId,
    resourceId,
    showBirthday,
    checkHoliday,
  })
  const fetchedEvents = useMemo(() => events ?? [], [events])

  // Client-side text filter over the already-fetched real events — the
  // reference design's search box has no dedicated backend param
  // (calendar_api.php's own getEvents takes no search string), so this
  // narrows real data already on hand rather than adding a guessed filter
  // param the endpoint would just ignore.
  const visibleEvents = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    if (!q) return fetchedEvents
    return fetchedEvents.filter((ev) => ev.label.toLowerCase().includes(q) || ev.description.toLowerCase().includes(q))
  }, [fetchedEvents, searchText])

  const upcoming = useMemo(() => {
    const now = Date.now()
    return [...visibleEvents].filter((e) => e.startMs >= now).sort((a, b) => a.startMs - b.startMs).slice(0, 6)
  }, [visibleEvents])

  function toggleType(code: string) {
    setActiveTypes((cur) => {
      const next = new Set(cur ?? [])
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  function selectAllTypes() {
    setActiveTypes(new Set(options?.types.map((t) => t.code)))
  }

  function deselectAllTypes() {
    setActiveTypes(new Set())
  }

  function shift(delta: number) {
    const d = new Date(anchor)
    if (view === 'month' || view === 'list') d.setMonth(d.getMonth() + delta)
    else if (view === 'week') d.setDate(d.getDate() + delta * 7)
    else d.setDate(d.getDate() + delta)
    setAnchor(d)
  }

  const weekDays = useMemo(() => {
    const start = startOfWeek(anchor)
    return Array.from({ length: 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
  }, [anchor])

  const monthGridDays = useMemo(() => {
    if (view !== 'month') return []
    const gridStart = startOfWeek(new Date(anchor.getFullYear(), anchor.getMonth(), 1))
    return Array.from({ length: 35 }, (_, i) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i))
  }, [anchor, view])

  // Range-end shown in the filter bar is a real computed value (last day of
  // the currently visible range for the active view), not an independently
  // queryable filter — the real backend derives its own date window purely
  // from mode+year+month+day, with no separate end-date param to post.
  const rangeEnd = useMemo(() => {
    if (view === 'week') return new Date(weekDays[6])
    if (view === 'day') return anchor
    return new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0)
  }, [view, anchor, weekDays])

  function eventsOn(d: Date) {
    return visibleEvents.filter((ev) => sameDay(new Date(ev.startMs), d))
  }

  // The real backend deliberately over-fetches a padded date range for
  // month/week views (7 days before the 1st, 10 days after the 28th — see
  // calendar_api.php's fetchActionEvents date filter), wider than the
  // rendered grid itself. Counting the raw fetch total in the header badge
  // would include events that never appear as a chip anywhere on screen, so
  // this counts only events landing on a day the current view actually
  // renders (list view has no grid, so it counts everything, matching its
  // own table).
  const countInView = useMemo(() => {
    if (view === 'list') return visibleEvents.length
    const days = view === 'month' ? monthGridDays : view === 'week' ? weekDays : [anchor]
    const daySet = new Set(days.map((d) => d.toDateString()))
    return visibleEvents.filter((ev) => daySet.has(new Date(ev.startMs).toDateString())).length
  }, [view, visibleEvents, monthGridDays, weekDays, anchor])

  const headerTitle = view === 'month' || view === 'list' ? `${MONTH_NAMES[anchor.getMonth()]} ${anchor.getFullYear()}` : anchor.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    // -m-6 + flex-1 flex-col min-h-0: same pattern as ThirdPartyList.tsx — lets the
    // calendar Card stretch to fill leftover height so it scrolls internally instead
    // of growing the whole page.
    // sticky -top-6: negates the scroll container's own p-6 so this bar can stick
    // flush to the real top edge, then re-adds px-6/pt-6 itself to keep the same
    // visual padding.
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 space-y-4 border-b border-border bg-white px-6 pt-6 pb-4 dark:bg-gray-950">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-brand/10 text-brand shrink-0">
              <CalendarDays size={20} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-text!">Agenda</h2>
              <p className="text-sm text-text-faint">Plan, manage and track your events and activities.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowNewEvent(true)}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-hover shrink-0"
          >
            <Plus size={16} /> Create Event
          </button>
        </div>

        <Card className="!h-auto !p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-56">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint" />
              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search events…"
                className="w-full h-9 pl-8 pr-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none"
              />
            </div>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 px-2.5 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none">
              <option value="">All Status</option>
              {options?.statuses.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <select
              value={ownerId ?? ''}
              onChange={(e) => setOwnerId(e.target.value ? Number(e.target.value) : undefined)}
              className="h-9 px-2.5 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none"
            >
              <option value={ALL_OWNERS}>All Owners</option>
              {options?.users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <select
              value={projectId ?? ''}
              onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : undefined)}
              className="h-9 px-2.5 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none"
            >
              <option value="">All Projects</option>
              {options?.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={toDateInputValue(anchor)}
                onChange={(e) => e.target.value && setAnchor(new Date(e.target.value))}
                className="h-9 px-2 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none"
              />
              <span className="text-text-faint text-sm">–</span>
              <input type="date" value={toDateInputValue(rangeEnd)} disabled className="h-9 px-2 rounded-md border border-input-border bg-surface-alt text-text-faint text-sm outline-none cursor-not-allowed" />
            </div>
            <button type="button" onClick={resetFilters} className="flex items-center gap-1.5 h-9 px-3 rounded-md border border-input-border text-text-muted text-sm font-medium hover:bg-surface-hover">
              <RotateCcw size={13} /> Clear
            </button>
          </div>
        </Card>

        <Card className="!h-auto !p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-text!">Filters</h3>
            <button type="button" onClick={resetFilters} className="flex items-center gap-1 text-xs font-medium text-brand hover:underline">
              <RotateCcw size={11} /> Reset All
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={view === 'list' ? 'month' : view}
              onChange={(e) => setView(e.target.value as ViewMode)}
              className="h-9 px-2.5 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none"
            >
              <option value="month">Month view</option>
              <option value="week">Week view</option>
              <option value="day">Day view</option>
            </select>
            <select
              value={usergroupId ?? ''}
              onChange={(e) => setUsergroupId(e.target.value ? Number(e.target.value) : undefined)}
              className="h-9 px-2.5 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none"
            >
              <option value="">All User Groups</option>
              {options?.usergroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <select
              value={socid ?? ''}
              onChange={(e) => setSocid(e.target.value ? Number(e.target.value) : undefined)}
              className="h-9 px-2.5 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none"
            >
              <option value="">All Third-Parties</option>
              {options?.thirdparties.map((tp) => (
                <option key={tp.id} value={tp.id}>
                  {tp.name}
                </option>
              ))}
            </select>
            <select
              value={categoryId ?? ''}
              onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : undefined)}
              className="h-9 px-2.5 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none"
            >
              <option value="">All Tags/Categories</option>
              {options?.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={resourceId ?? ''}
              onChange={(e) => setResourceId(e.target.value ? Number(e.target.value) : undefined)}
              className="h-9 px-2.5 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none"
            >
              <option value="">All Resources</option>
              {options?.resources.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowBirthday((v) => !v)}
              className={`flex items-center gap-1.5 h-9 rounded-full px-3 text-xs font-medium border ${showBirthday ? 'bg-brand text-white border-brand' : 'border-input-border text-text-muted hover:bg-surface-hover'}`}
            >
              <Cake size={13} /> Birthdays
            </button>
            <button
              type="button"
              onClick={() => setCheckHoliday((v) => !v)}
              className={`flex items-center gap-1.5 h-9 rounded-full px-3 text-xs font-medium border ${checkHoliday ? 'bg-brand text-white border-brand' : 'border-input-border text-text-muted hover:bg-surface-hover'}`}
            >
              <Umbrella size={13} /> Holidays
            </button>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-1.5 h-9 px-3 rounded-md border border-input-border text-text-muted text-sm font-medium hover:bg-surface-hover disabled:opacity-50"
            >
              <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} /> Refresh
            </button>
            <span className="h-6 w-px bg-border shrink-0" />
            {options?.types && (
              <TypeFilterDropdown
                types={options.types}
                activeTypes={activeTypes}
                onToggle={toggleType}
                onSelectAll={selectAllTypes}
                onDeselectAll={deselectAllTypes}
              />
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[260px_1fr] gap-4 items-start px-6 py-4 flex-1 min-h-0">
        <div className="space-y-4">
          <MiniCalendar month={anchor} onSelect={(d) => { setAnchor(d); setView('day') }} />

          <Card className="!h-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-text!">
                <Clock size={14} className="text-text-faint" /> Upcoming Events
              </h3>
              <button type="button" onClick={() => setView('list')} className="flex items-center gap-0.5 text-xs font-medium text-brand hover:underline">
                View all <ChevronRight size={13} />
              </button>
            </div>
            {upcoming.length === 0 ? (
              <p className="text-sm text-text-faint italic py-2">No upcoming events.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {upcoming.map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => setViewEventId(ev.id)}
                    className="flex items-start gap-2 rounded-lg border border-border p-3 text-left hover:bg-surface-hover"
                  >
                    <span className="mt-1 w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ev.typeColor }} />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-text! truncate">{ev.label}</span>
                      <span className="block text-xs text-text-faint mt-0.5">{new Date(ev.startMs).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="flex flex-col min-h-0 self-stretch">
          <Card className="!p-0 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                {view !== 'list' && (
                  <>
                    <button type="button" onClick={() => shift(-1)} className="p-1.5 rounded-md border border-input-border text-text-muted hover:bg-surface-hover">
                      <ChevronLeft size={14} />
                    </button>
                    <button type="button" onClick={() => setAnchor(new Date())} className="rounded-md border border-input-border px-3 py-1.5 text-sm font-medium text-text-muted hover:bg-surface-hover">
                      Today
                    </button>
                    <button type="button" onClick={() => shift(1)} className="p-1.5 rounded-md border border-input-border text-text-muted hover:bg-surface-hover">
                      <ChevronRight size={14} />
                    </button>
                  </>
                )}
                <span className="text-sm font-semibold text-text! px-1">{headerTitle}</span>
                <span className="text-xs text-text-faint">Showing {isFetching ? '…' : countInView} events</span>
              </div>
              <div className="flex rounded-lg border border-input-border overflow-hidden">
                {(['month', 'week', 'day', 'list'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setView(v)}
                    className={`px-3 py-1.5 text-sm font-medium capitalize ${view === v ? 'bg-brand text-white' : 'bg-input-bg text-text-muted hover:bg-surface-hover'}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {view === 'month' && (
              <div className="flex-1 min-h-0 overflow-auto">
                <div className="grid grid-cols-7 border-b border-border bg-surface sticky top-0 z-10">
                  {DAY_NAMES.map((d) => (
                    <div key={d} className="px-3 py-2.5 text-xs font-semibold text-text-faint uppercase tracking-wide">
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {monthGridDays.map((d) => {
                    const inMonth = d.getMonth() === anchor.getMonth()
                    const dayEvents = eventsOn(d)
                    return (
                      <div key={d.toISOString()} className={`h-28 flex flex-col border-b border-r border-border p-1.5 ${inMonth ? '' : 'bg-surface/50'}`}>
                        <span className={`text-xs shrink-0 ${inMonth ? 'text-text!' : 'text-text-faint'}`}>{d.getDate()}</span>
                        <div className="flex-1 min-h-0 overflow-y-auto space-y-1 mt-1">
                          {dayEvents.map((ev) => (
                            <EventChip key={ev.id} ev={ev} onOpen={setViewEventId} />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {view === 'week' && (
              <div className="flex-1 min-h-0 overflow-auto">
                <div className="grid grid-cols-7">
                  {weekDays.map((d) => {
                    const dayEvents = eventsOn(d)
                    return (
                      <div key={d.toISOString()} className="min-h-32 border-b border-r border-border p-2 space-y-1.5">
                        <p className="text-xs font-semibold text-text! mb-1">
                          {DAY_NAMES[(d.getDay() + 6) % 7].slice(0, 3)} {d.getDate()}
                        </p>
                        {dayEvents.length === 0 ? <p className="text-[11px] text-text-faint italic">—</p> : dayEvents.map((ev) => <EventChip key={ev.id} ev={ev} onOpen={setViewEventId} />)}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {view === 'day' && (
              <div className="flex-1 min-h-0 overflow-auto p-4">
                <p className="text-sm font-semibold text-text! mb-3">{anchor.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
                {eventsOn(anchor).length === 0 ? (
                  <p className="text-sm text-text-faint italic py-6 text-center">No events on this day.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {eventsOn(anchor).map((ev) => (
                      <EventChip key={ev.id} ev={ev} onOpen={setViewEventId} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {view === 'list' && (
              <div className="flex-1 min-h-0 overflow-auto">
                {visibleEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-16 text-text-faint">
                    <CalendarDays size={32} />
                    <p className="text-sm">No events yet — create one, or check a quotation, contract, order, or invoice for its own logged events.</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10">
                      <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                        <th className="font-medium px-4 py-2.5">Ref.</th>
                        <th className="font-medium px-4 py-2.5">Owner</th>
                        <th className="font-medium px-4 py-2.5">Type</th>
                        <th className="font-medium px-4 py-2.5">Title</th>
                        <th className="font-medium px-4 py-2.5">Start Date</th>
                        <th className="font-medium px-4 py-2.5">End Date</th>
                        <th className="font-medium px-4 py-2.5">Third-Party</th>
                        <th className="font-medium px-4 py-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleEvents.map((ev) => (
                        <tr key={ev.id} className="border-b border-border">
                          <td className="px-4 py-3 max-w-[260px]">
                            <button type="button" onClick={() => setViewEventId(ev.id)} className="flex w-full items-center gap-1.5 text-left text-brand hover:underline">
                              <CalendarDays size={14} className="shrink-0" />
                              <span className="truncate">{ev.label}</span>
                            </button>
                          </td>
                          <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                            {ev.userOwner ? (
                              <span className="flex items-center gap-1.5">
                                <Avatar name={ev.userOwner} size={18} className="text-[9px]" /> {ev.userOwner}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1.5 text-text-muted whitespace-nowrap">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ev.typeColor }} /> {ev.typeLabel}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-text! max-w-[260px]">
                            <span className="truncate block">{ev.label}</span>
                          </td>
                          <td className="px-4 py-3 text-text-muted whitespace-nowrap">{formatDateTimeAmPm(ev.startMs)}</td>
                          <td className="px-4 py-3 text-text-muted whitespace-nowrap">{formatDateTimeAmPm(ev.endMs)}</td>
                          <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                            {ev.thirdpartyName ? (
                              <span className="flex items-center gap-1.5">
                                <Avatar name={ev.thirdpartyName} size={18} className="text-[9px]" color="bg-teal-500" /> {ev.thirdpartyName}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-[11px] font-semibold bg-neutral-bg text-neutral-fg whitespace-nowrap">
                              {ev.statusLabel || 'NA'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

          </Card>
        </div>
      </div>

      {showNewEvent && <AddEventModal onClose={() => setShowNewEvent(false)} onCreated={() => setShowNewEvent(false)} />}
      {viewEventId !== null && <EventDetailModal eventId={viewEventId} onClose={() => setViewEventId(null)} />}
    </div>
  )
}
