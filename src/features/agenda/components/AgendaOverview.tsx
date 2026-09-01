import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalendarDays, ChevronLeft, ChevronRight, Plus, RotateCcw, RefreshCw, Cake, Umbrella } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Avatar } from '../../../shared/components/Avatar'
import { useAuth } from '../../auth/AuthContext'
import { AddEventModal } from './AddEventModal'
import { useAgendaFilterOptions, useCalendarEvents, type CalendarEvent, type CalendarViewMode } from '../calendarApi.queries'

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

function EventChip({ ev }: { ev: CalendarEvent }) {
  return (
    <a
      href={ev.url}
      target="_blank"
      rel="noreferrer"
      title={`${ev.typeLabel}${ev.location ? ' · ' + ev.location : ''}`}
      style={{ borderColor: ev.typeColor }}
      className="block rounded-md border-l-2 bg-surface px-1.5 py-1 text-[11px] leading-tight hover:bg-surface-hover"
    >
      <p className="font-semibold text-text!">
        {ev.fullDayEvent ? 'All day' : fmtTime(ev.startMs)} · {ev.label}
      </p>
      {(ev.thirdpartyName || ev.userOwner) && <p className="text-text-muted line-clamp-1">{ev.thirdpartyName || ev.userOwner}</p>}
    </a>
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

type ViewMode = 'month' | 'week' | 'day' | 'list'
const VIEW_TO_BACKEND_MODE: Record<ViewMode, CalendarViewMode> = { month: 'show_month', week: 'show_week', day: 'show_day', list: 'show_month' }

// Real via comm/action/ajax/calendar_api.php — see calendarApi.queries.ts
// for the full endpoint-by-endpoint evidence. Every filter below (Owner,
// User Group, Status, Type) and every rendered event comes straight from
// llx_actioncomm (plus real birthdays/holidays when those checks are on) —
// there is no local/fake activity-log layer left in this page.
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
  const visibleEvents = useMemo(() => events ?? [], [events])

  const upcoming = useMemo(() => {
    const now = Date.now()
    return [...visibleEvents].filter((e) => e.startMs >= now).sort((a, b) => a.startMs - b.startMs).slice(0, 5)
  }, [visibleEvents])

  function toggleType(code: string) {
    setActiveTypes((cur) => {
      const next = new Set(cur ?? [])
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
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
    return Array.from({ length: 42 }, (_, i) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i))
  }, [anchor, view])

  // Range-end shown in the filter panel is a real computed value (last day
  // of the currently visible range for the active view), not an
  // independently-queryable filter — the real backend derives its own date
  // window purely from mode+year+month+day, with no separate end-date param
  // to post.
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <CalendarDays size={20} className="text-brand" /> Agenda{' '}
          <span className="text-text-faint font-normal text-base">{isFetching ? '…' : countInView}</span>
        </h2>
        <div className="flex items-center gap-2">
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
          {view !== 'list' && (
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => shift(-1)} className="p-1.5 rounded-md border border-input-border text-text-muted hover:bg-surface-hover">
                <ChevronLeft size={14} />
              </button>
              <span className="text-sm font-medium text-text! px-1 min-w-28 text-center">{headerTitle}</span>
              <button type="button" onClick={() => shift(1)} className="p-1.5 rounded-md border border-input-border text-text-muted hover:bg-surface-hover">
                <ChevronRight size={14} />
              </button>
            </div>
          )}
          <button type="button" onClick={() => setAnchor(new Date())} className="rounded-md border border-input-border px-3 py-1.5 text-sm font-medium text-text-muted hover:bg-surface-hover">
            Today
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[260px_1fr] gap-4 items-start">
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setShowNewEvent(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-hover"
          >
            <Plus size={16} /> Create Event
          </button>

          <MiniCalendar month={anchor} onSelect={(d) => { setAnchor(d); setView('day') }} />

          <Card className="!h-auto !p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-text!">Filters</h3>
              <button type="button" onClick={resetFilters} className="flex items-center gap-1 text-xs font-medium text-brand hover:underline">
                <RotateCcw size={11} /> Reset
              </button>
            </div>
            <div className="space-y-2.5">
              <label className="block">
                <span className="block text-[10px] font-semibold text-text-faint uppercase tracking-wide mb-0.5">View</span>
                <select value={view === 'list' ? 'month' : view} onChange={(e) => setView(e.target.value as ViewMode)} className="w-full h-8 px-2 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none">
                  <option value="month">Month</option>
                  <option value="week">Week</option>
                  <option value="day">Day</option>
                </select>
              </label>
              <label className="block">
                <span className="block text-[10px] font-semibold text-text-faint uppercase tracking-wide mb-0.5">Start date</span>
                <input
                  type="date"
                  value={toDateInputValue(anchor)}
                  onChange={(e) => e.target.value && setAnchor(new Date(e.target.value))}
                  className="w-full h-8 px-2 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none"
                />
              </label>
              <label className="block">
                <span className="block text-[10px] font-semibold text-text-faint uppercase tracking-wide mb-0.5">End date</span>
                <input type="date" value={toDateInputValue(rangeEnd)} disabled className="w-full h-8 px-2 rounded-md border border-input-border bg-surface-alt text-text-faint text-sm outline-none cursor-not-allowed" />
              </label>
              <label className="block">
                <span className="block text-[10px] font-semibold text-text-faint uppercase tracking-wide mb-0.5">Owner</span>
                <select
                  value={ownerId ?? ''}
                  onChange={(e) => setOwnerId(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full h-8 px-2 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none"
                >
                  <option value={ALL_OWNERS}>All</option>
                  {options?.users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="block text-[10px] font-semibold text-text-faint uppercase tracking-wide mb-0.5">User group</span>
                <select
                  value={usergroupId ?? ''}
                  onChange={(e) => setUsergroupId(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full h-8 px-2 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none"
                >
                  <option value="">All</option>
                  {options?.usergroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="block text-[10px] font-semibold text-text-faint uppercase tracking-wide mb-0.5">Status</span>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full h-8 px-2 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none">
                  {options?.statuses.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <span className="block text-[10px] font-semibold text-text-faint uppercase tracking-wide mb-1">Type</span>
                <div className="space-y-1 max-h-40 overflow-y-auto soft-scrollbar">
                  {options?.types.map((t) => (
                    <label key={t.code} className="flex items-center gap-2 text-sm text-text-muted cursor-pointer">
                      <input type="checkbox" checked={activeTypes?.has(t.code) ?? true} onChange={() => toggleType(t.code)} />
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.color || '#397db9' }} />
                      {t.label}
                    </label>
                  ))}
                </div>
              </div>
              <label className="block">
                <span className="block text-[10px] font-semibold text-text-faint uppercase tracking-wide mb-0.5">Project</span>
                <select
                  value={projectId ?? ''}
                  onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full h-8 px-2 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none"
                >
                  <option value="">All</option>
                  {options?.projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="block text-[10px] font-semibold text-text-faint uppercase tracking-wide mb-0.5">Third-Party</span>
                <select
                  value={socid ?? ''}
                  onChange={(e) => setSocid(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full h-8 px-2 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none"
                >
                  <option value="">All</option>
                  {options?.thirdparties.map((tp) => (
                    <option key={tp.id} value={tp.id}>
                      {tp.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="block text-[10px] font-semibold text-text-faint uppercase tracking-wide mb-0.5">Tag/Category</span>
                <select
                  value={categoryId ?? ''}
                  onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full h-8 px-2 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none"
                >
                  <option value="">All</option>
                  {options?.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="block text-[10px] font-semibold text-text-faint uppercase tracking-wide mb-0.5">Resource</span>
                <select
                  value={resourceId ?? ''}
                  onChange={(e) => setResourceId(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full h-8 px-2 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none"
                >
                  <option value="">All</option>
                  {options?.resources.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowBirthday((v) => !v)}
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border ${showBirthday ? 'bg-brand text-white border-brand' : 'border-input-border text-text-muted hover:bg-surface-hover'}`}
                >
                  <Cake size={12} /> Birthdays
                </button>
                <button
                  type="button"
                  onClick={() => setCheckHoliday((v) => !v)}
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border ${checkHoliday ? 'bg-brand text-white border-brand' : 'border-input-border text-text-muted hover:bg-surface-hover'}`}
                >
                  <Umbrella size={12} /> Holidays
                </button>
              </div>
              <button
                type="button"
                onClick={() => refetch()}
                disabled={isFetching}
                className="flex w-full items-center justify-center gap-1.5 rounded-md border border-input-border py-1.5 text-xs font-medium text-text-muted hover:bg-surface-hover disabled:opacity-50"
              >
                <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>
          </Card>

          <Card className="!h-auto !p-3">
            <h3 className="text-sm font-semibold text-text! mb-2">Upcoming Events</h3>
            <span className="inline-block text-xs font-medium text-brand bg-brand/10 rounded-full px-2 py-0.5 mb-2">{upcoming.length} events</span>
            {upcoming.length === 0 ? (
              <p className="text-xs text-text-faint italic">No upcoming events.</p>
            ) : (
              <div className="space-y-3">
                {upcoming.map((ev) => (
                  <div key={ev.id} className="border-b border-border last:border-0 pb-2 last:pb-0">
                    <p className="text-sm font-semibold text-text!">{ev.label}</p>
                    <p className="text-xs text-text-faint mt-0.5">{new Date(ev.startMs).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card className="!p-0 overflow-hidden">
          {view === 'month' && (
            <div>
              <div className="grid grid-cols-7 border-b border-border bg-surface">
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
                    <div key={d.toISOString()} className={`min-h-28 border-b border-r border-border p-1.5 space-y-1 ${inMonth ? '' : 'bg-surface/50'}`}>
                      <span className={`text-xs ${inMonth ? 'text-text!' : 'text-text-faint'}`}>{d.getDate()}</span>
                      {dayEvents.slice(0, 3).map((ev) => (
                        <EventChip key={ev.id} ev={ev} />
                      ))}
                      {dayEvents.length > 3 && <p className="text-[10px] text-text-faint px-1">+{dayEvents.length - 3} more</p>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {view === 'week' && (
            <div className="grid grid-cols-7">
              {weekDays.map((d) => {
                const dayEvents = eventsOn(d)
                return (
                  <div key={d.toISOString()} className="min-h-64 border-b border-r border-border p-2 space-y-1.5">
                    <p className="text-xs font-semibold text-text! mb-1">
                      {DAY_NAMES[(d.getDay() + 6) % 7].slice(0, 3)} {d.getDate()}
                    </p>
                    {dayEvents.length === 0 ? <p className="text-[11px] text-text-faint italic">—</p> : dayEvents.map((ev) => <EventChip key={ev.id} ev={ev} />)}
                  </div>
                )
              })}
            </div>
          )}

          {view === 'day' && (
            <div className="p-4 space-y-2 max-w-md">
              <p className="text-sm font-semibold text-text!">{anchor.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
              {eventsOn(anchor).length === 0 ? (
                <p className="text-sm text-text-faint italic py-6 text-center">No events on this day.</p>
              ) : (
                eventsOn(anchor).map((ev) => <EventChip key={ev.id} ev={ev} />)
              )}
            </div>
          )}

          {view === 'list' && (
            <div className="overflow-auto max-h-[70vh]">
              {visibleEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-text-faint">
                  <CalendarDays size={32} />
                  <p className="text-sm">No events yet — create one, or check a quotation, contract, order, or invoice for its own logged events.</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                      <th className="font-medium px-4 py-2.5">Date</th>
                      <th className="font-medium px-4 py-2.5">Type</th>
                      <th className="font-medium px-4 py-2.5">Label</th>
                      <th className="font-medium px-4 py-2.5">Owner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleEvents.map((ev) => (
                      <tr key={ev.id} className="border-b border-border">
                        <td className="px-4 py-3 text-text-muted whitespace-nowrap">{new Date(ev.startMs).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 text-text-muted">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ev.typeColor }} /> {ev.typeLabel}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <a href={ev.url} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                            {ev.label}
                          </a>
                        </td>
                        <td className="px-4 py-3 text-text-muted">
                          {ev.userOwner ? (
                            <span className="flex items-center gap-1.5">
                              <Avatar name={ev.userOwner} size={18} className="text-[9px]" /> {ev.userOwner}
                            </span>
                          ) : (
                            '—'
                          )}
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

      {showNewEvent && <AddEventModal onClose={() => setShowNewEvent(false)} onCreated={() => setShowNewEvent(false)} />}
    </div>
  )
}
