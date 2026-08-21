import { useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Avatar } from '../../../shared/components/Avatar'
import { useAuth } from '../../auth/AuthContext'
import { useLogActivity, useRecentActivity, type ActivityEvent } from '../agenda.queries'

// Category taxonomy mirrors the reference app's own Event Filters sidebar
// (Leave/Invoices/Orders/Products/Contracts/Tickets/Thirdparty/Purchase/
// Payroll/Expense/Direct Events/Personal/Birthdays) — "tasks" and "other"
// are this app's own catch-all buckets on top of that (kitchen tickets,
// quotations/user/group creation, etc.), appended rather than shoehorned
// into a legacy category they don't really match. Several of these only
// ever populate once a matching feature (e.g. invoices, tickets) actually
// logs to them — same "real, sometimes empty" convention as the rest of
// this local activity log.
// `dot`/`border` are separate literal Tailwind classes (not derived from one
// another via string replace) — Tailwind's JIT scanner only generates CSS
// for class names it can find as literal text in source, so a runtime
// `.replace('bg-', 'border-')` would silently produce an unstyled class.
const CATEGORY_META: Record<string, { label: string; dot: string; border: string; defaultOn: boolean }> = {
  leave: { label: 'Leave', dot: 'bg-sky-400', border: 'border-sky-400', defaultOn: false },
  invoices: { label: 'Invoices', dot: 'bg-blue-500', border: 'border-blue-500', defaultOn: true },
  orders: { label: 'Orders', dot: 'bg-emerald-500', border: 'border-emerald-500', defaultOn: true },
  products: { label: 'Products', dot: 'bg-rose-500', border: 'border-rose-500', defaultOn: true },
  contracts: { label: 'Contracts', dot: 'bg-violet-500', border: 'border-violet-500', defaultOn: true },
  tickets: { label: 'Tickets', dot: 'bg-amber-500', border: 'border-amber-500', defaultOn: true },
  thirdparty: { label: 'Thirdparty', dot: 'bg-cyan-500', border: 'border-cyan-500', defaultOn: true },
  purchase: { label: 'Purchase', dot: 'bg-orange-500', border: 'border-orange-500', defaultOn: true },
  payroll: { label: 'Payroll', dot: 'bg-lime-500', border: 'border-lime-500', defaultOn: true },
  expense: { label: 'Expense', dot: 'bg-teal-500', border: 'border-teal-500', defaultOn: true },
  direct: { label: 'Direct Events', dot: 'bg-slate-500', border: 'border-slate-500', defaultOn: true },
  personal: { label: 'Personal', dot: 'bg-green-400', border: 'border-green-400', defaultOn: false },
  birthdays: { label: 'Birthdays', dot: 'bg-pink-400', border: 'border-pink-400', defaultOn: false },
  tasks: { label: 'Tasks', dot: 'bg-indigo-500', border: 'border-indigo-500', defaultOn: true },
  other: { label: 'Other', dot: 'bg-neutral-400', border: 'border-neutral-400', defaultOn: true },
}
const CATEGORY_ORDER = Object.keys(CATEGORY_META)

function dotFor(category: string) {
  return CATEGORY_META[category]?.dot ?? 'bg-neutral-400'
}
function borderFor(category: string) {
  return CATEGORY_META[category]?.border ?? 'border-neutral-400'
}
function labelFor(category: string) {
  return CATEGORY_META[category]?.label ?? category
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function startOfWeek(d: Date) {
  const day = (d.getDay() + 6) % 7
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day)
  return start
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}
function toDateInputValue(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function EventChip({ ev }: { ev: ActivityEvent }) {
  return (
    <div className={`rounded-md border-l-2 ${borderFor(ev.category)} bg-surface px-1.5 py-1 text-[11px] leading-tight`}>
      <p className="font-semibold text-text!">{fmtTime(ev.date)}</p>
      <p className="text-text-muted line-clamp-2">{ev.label}</p>
      <div className="flex items-center gap-1 mt-1">
        <Avatar name={ev.authorName} size={16} className="text-[8px]" />
      </div>
    </div>
  )
}

function MiniCalendar({ month, onSelect }: { month: Date; onSelect: (d: Date) => void }) {
  const [cursor, setCursor] = useState(new Date(month.getFullYear(), month.getMonth(), 1))
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

function NewEventModal({ onClose, defaultDate }: { onClose: () => void; defaultDate: Date }) {
  const logActivity = useLogActivity()
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('direct')
  const [date, setDate] = useState(toDateInputValue(defaultDate))
  const [time, setTime] = useState('09:00')
  const [error, setError] = useState('')

  function handleCreate() {
    if (!title.trim()) return setError('Title is required!')
    const authorName = user ? `${user.firstname} ${user.lastname}`.trim() || user.login : 'Unknown'
    logActivity({ label: title.trim(), category, authorName, date: new Date(`${date}T${time}`).toISOString() })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-surface border border-border rounded-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h3 className="text-base font-semibold text-text!">New Event</h3>
          <button type="button" onClick={onClose} className="p-1 rounded-md text-text-muted hover:bg-surface-alt">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-sm mb-1 text-text-muted">Title*</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30" />
          </div>
          <div>
            <label className="block text-sm mb-1 text-text-muted">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none">
              {['direct', 'personal', 'birthdays', 'leave'].map((c) => (
                <option key={c} value={c}>
                  {labelFor(c)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1 text-text-muted">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none" />
            </div>
            <div>
              <label className="block text-sm mb-1 text-text-muted">Time</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none" />
            </div>
          </div>
          {error && <p className="text-sm font-medium text-danger">{error}</p>}
        </div>
        <div className="px-5 py-3 border-t border-border flex justify-end">
          <button type="button" onClick={handleCreate} className="px-4 py-2 rounded-md text-sm font-medium bg-brand text-white hover:opacity-90">
            Create event
          </button>
        </div>
      </div>
    </div>
  )
}

type ViewMode = 'month' | 'week' | 'day' | 'list'

export function AgendaOverview() {
  const { data: events } = useRecentActivity({ category: 'all', limit: 500 })
  const [view, setView] = useState<ViewMode>('month')
  const [anchor, setAnchor] = useState(new Date())
  const [viewAll, setViewAll] = useState(true)
  const [activeCategories, setActiveCategories] = useState<Record<string, boolean>>(
    () => Object.fromEntries(CATEGORY_ORDER.map((c) => [c, CATEGORY_META[c].defaultOn])),
  )
  const [showNewEvent, setShowNewEvent] = useState(false)

  function toggleCategory(c: string) {
    setActiveCategories((cur) => ({ ...cur, [c]: !cur[c] }))
  }

  const visibleEvents = useMemo(
    () => events.filter((ev) => viewAll || activeCategories[ev.category] || !(ev.category in CATEGORY_META)),
    [events, viewAll, activeCategories],
  )

  const upcoming = useMemo(
    () => [...visibleEvents].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3),
    [visibleEvents],
  )

  function shift(delta: number) {
    const d = new Date(anchor)
    if (view === 'month') d.setMonth(d.getMonth() + delta)
    else if (view === 'week') d.setDate(d.getDate() + delta * 7)
    else d.setDate(d.getDate() + delta)
    setAnchor(d)
  }

  const weekDays = useMemo(() => {
    const start = startOfWeek(view === 'day' ? anchor : anchor)
    return Array.from({ length: 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
  }, [anchor, view])

  const monthGridDays = useMemo(() => {
    if (view !== 'month') return []
    const gridStart = startOfWeek(new Date(anchor.getFullYear(), anchor.getMonth(), 1))
    return Array.from({ length: 42 }, (_, i) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i))
  }, [anchor, view])

  function eventsOn(d: Date) {
    return visibleEvents.filter((ev) => sameDay(new Date(ev.date), d))
  }

  const headerTitle = view === 'month' ? `${MONTH_NAMES[anchor.getMonth()]} ${anchor.getFullYear()}` : anchor.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <CalendarDays size={20} className="text-brand" /> Agenda <span className="text-text-faint font-normal text-base">{visibleEvents.length}</span>
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
            <Plus size={16} /> New Event
          </button>

          <MiniCalendar month={anchor} onSelect={(d) => { setAnchor(d); setView('day') }} />

          <Card className="!h-auto !p-3">
            <h3 className="text-sm font-semibold text-text! mb-2">Event Filters</h3>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setViewAll((v) => !v)}
                className="flex w-full items-center justify-between px-1.5 py-1.5 rounded-md hover:bg-surface-hover"
              >
                <span className="flex items-center gap-2 text-sm text-text!">
                  <span className="w-2.5 h-2.5 rounded-full bg-danger shrink-0" /> View All
                </span>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${viewAll ? 'bg-success-bg text-success-fg' : 'bg-neutral-bg text-neutral-fg'}`}>{viewAll ? 'ON' : 'OFF'}</span>
              </button>
              {CATEGORY_ORDER.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCategory(c)}
                  className="flex w-full items-center justify-between px-1.5 py-1.5 rounded-md hover:bg-surface-hover"
                >
                  <span className="flex items-center gap-2 text-sm text-text-muted">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotFor(c)}`} /> {labelFor(c)}
                  </span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${activeCategories[c] ? 'bg-success-bg text-success-fg' : 'bg-neutral-bg text-neutral-fg'}`}>
                    {activeCategories[c] ? 'ON' : 'OFF'}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-xs text-brand mt-2 px-1.5">{visibleEvents.length} visible items</p>
          </Card>

          <Card className="!h-auto !p-3">
            <h3 className="text-sm font-semibold text-text! mb-2">Upcoming Events</h3>
            <span className="inline-block text-xs font-medium text-brand bg-brand/10 rounded-full px-2 py-0.5 mb-2">{upcoming.length} events</span>
            {upcoming.length === 0 ? (
              <p className="text-xs text-text-faint italic">No events yet.</p>
            ) : (
              <div className="space-y-3">
                {upcoming.map((ev) => (
                  <div key={ev.id} className="border-b border-border last:border-0 pb-2 last:pb-0">
                    <p className="text-sm font-semibold text-text!">{ev.label}</p>
                    <p className="text-xs text-text-faint mt-0.5">{new Date(ev.date).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}</p>
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
                  <p className="text-sm">No events yet — creating a quotation, contract, order, leave request, or invoice payment will show up here.</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                      <th className="font-medium px-4 py-2.5">Date</th>
                      <th className="font-medium px-4 py-2.5">Category</th>
                      <th className="font-medium px-4 py-2.5">Description</th>
                      <th className="font-medium px-4 py-2.5">Author</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleEvents.map((ev) => (
                      <tr key={ev.id} className="border-b border-border">
                        <td className="px-4 py-3 text-text-muted whitespace-nowrap">{new Date(ev.date).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 text-text-muted">
                            <span className={`w-2 h-2 rounded-full ${dotFor(ev.category)}`} /> {labelFor(ev.category)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-text!">{ev.label}</td>
                        <td className="px-4 py-3 text-text-muted">{ev.authorName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </Card>
      </div>

      {showNewEvent && <NewEventModal onClose={() => setShowNewEvent(false)} defaultDate={anchor} />}
    </div>
  )
}
