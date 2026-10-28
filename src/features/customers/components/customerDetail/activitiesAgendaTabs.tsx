import { useState } from 'react'
import { ActivityFormModal } from '../ActivityFormModal'
import { ActivityDetailModal } from '../ActivityDetailModal'
import { ScheduleActivityModal } from '../ScheduleActivityModal'
import { QuickEventModal } from '../QuickEventModal'
import { AddEventModal } from '../../../agenda/components/AddEventModal'
import { X, Users2, CalendarClock, Pencil, Plus, Bot, Phone, Eye, ListChecks, History, LoaderCircle, Download, Zap } from 'lucide-react'
import { Card } from '../../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../../products/components/LegacyReportStates'
import { useCustomerActivities, useActivityDetail, useCustomerAgenda, type ActivityType, type ActivityItem, type AgendaDay } from '../../customerDetailTabs.queries'
import { TabTitle } from './CustomerDetailShared'

const ACTIVITY_STATUS_BADGE: Record<string, string> = {
  done: 'bg-success-bg text-success-fg',
  open: 'bg-warning-bg text-warning-fg',
  todo: 'bg-warning-bg text-warning-fg',
  inprogress: 'bg-info-bg text-info-fg',
  closed: 'bg-neutral-bg text-neutral-fg',
}

export function StatusBadge({ status }: { status: string }) {
  if (!status) return <span className="text-text-faint">—</span>
  const cls = ACTIVITY_STATUS_BADGE[status.toLowerCase()] ?? 'bg-neutral-bg text-neutral-fg'
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
}

type ActivityPanel = 'view' | 'edit' | 'schedule'

// Loads the full ActivityDetail record on demand (the list rows are a
// leaner subset — see ActivityItem vs ActivityDetail in
// customerDetailTabs.queries.ts) and hands it to the right modal for
// whichever Actions-column icon was clicked. Matches the real page's own
// activities.php?action=detail round-trip on every icon click (see
// activities.js's openActivity), rather than assuming the list row already
// has enough data.
function ActivityActionModal({ socid, activityId, panel, onClose }: { socid: string; activityId: number; panel: ActivityPanel; onClose: () => void }) {
  const { data, isLoading, isError, error, refetch } = useActivityDetail(socid, activityId)
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
        <div className="rounded-lg bg-surface border border-border p-6 shadow-xl flex items-center gap-2 text-sm text-text-muted" onClick={(e) => e.stopPropagation()}>
          <LoaderCircle size={16} className="animate-spin" /> Loading…
        </div>
      </div>
    )
  }
  if (isError || !data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
        <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
          <LegacyErrorCard title="Couldn't load activity" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
        </div>
      </div>
    )
  }
  if (panel === 'schedule') return <ScheduleActivityModal socid={socid} item={data} onClose={onClose} />
  if (panel === 'edit') {
    const type: ActivityType = data.processtype === 'meeting' ? 'meetings' : data.processtype === 'calls' ? 'calls' : 'tasks'
    return <ActivityFormModal socid={socid} type={type} mode="edit" initial={data} onClose={onClose} />
  }
  return <ActivityDetailModal socid={socid} item={data} onClose={onClose} />
}

// Actions column matches the real page's own 3 icons exactly (View always;
// Edit/Schedule only on open items — see
// activities.js's actionButtons()/isOpen check).
export function ActivityTable({ items, emptyLabel, onAction }: { items: ActivityItem[]; emptyLabel: string; onAction: (id: number, panel: ActivityPanel) => void }) {
  if (items.length === 0) return <p className="text-sm text-text-faint italic py-4 text-center">{emptyLabel}</p>
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
          <th className="font-medium py-2 pr-3">Subject</th>
          <th className="font-medium py-2 pr-3">Date</th>
          <th className="font-medium py-2 pr-3">Priority</th>
          <th className="font-medium py-2 pr-3">Accounting Needs</th>
          <th className="font-medium py-2 pr-3">Status</th>
          <th className="font-medium py-2 text-right">Actions</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => {
          const isOpen = item.status === 'open'
          return (
            <tr key={item.id} className="border-b border-border last:border-0">
              <td className="py-2 pr-3">
                <p className="font-medium text-text!">{item.subject}</p>
                {item.description && <p className="text-xs text-text-faint">{item.description}</p>}
              </td>
              <td className="py-2 pr-3 text-text-muted whitespace-nowrap">{item.duedate || item.createddate}</td>
              <td className="py-2 pr-3 text-text-muted capitalize">{item.priority}</td>
              <td className="py-2 pr-3 text-text-muted capitalize">{item.relatedto}</td>
              <td className="py-2 pr-3">
                <StatusBadge status={item.status} />
              </td>
              <td className="py-2 text-right">
                <div className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onAction(item.id, 'view')}
                    title="View"
                    className="inline-flex items-center justify-center w-7 h-7 rounded-md text-text-faint hover:bg-surface-hover hover:text-brand"
                  >
                    <Eye size={14} />
                  </button>
                  {isOpen && (
                    <>
                      <button
                        type="button"
                        onClick={() => onAction(item.id, 'edit')}
                        title="Edit"
                        className="inline-flex items-center justify-center w-7 h-7 rounded-md text-text-faint hover:bg-surface-hover hover:text-brand"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onAction(item.id, 'schedule')}
                        title="Schedule"
                        className="inline-flex items-center justify-center w-7 h-7 rounded-md text-info hover:bg-info-bg"
                      >
                        <CalendarClock size={14} />
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

const ACTIVITY_TYPE_LABEL: Record<ActivityType, string> = { tasks: 'Task', meetings: 'Meeting', calls: 'Call' }

export function ActivitySubtab({ socid, type }: { socid: string | undefined; type: ActivityType }) {
  const { data, isLoading, isError, error, refetch } = useCustomerActivities(socid, type)
  const [action, setAction] = useState<{ id: number; panel: ActivityPanel } | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  if (isLoading) return <LegacyLoadingCard label={`Loading ${type}…`} />
  if (isError || !data) {
    return <LegacyErrorCard title={`Couldn't load ${type}`} message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  }
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover"
        >
          <Plus size={14} /> Add
        </button>
      </div>
      {showAdd && socid && <ActivityFormModal socid={socid} type={type} mode="create" onClose={() => setShowAdd(false)} />}
      {action && socid && <ActivityActionModal socid={socid} activityId={action.id} panel={action.panel} onClose={() => setAction(null)} />}
      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-text!">Open Activity</h3>
          <span className="text-xs text-text-faint">{data.open.length}</span>
        </div>
        <div className="px-4 py-2 overflow-x-auto">
          <ActivityTable items={data.open} emptyLabel={`No open ${ACTIVITY_TYPE_LABEL[type].toLowerCase()}s.`} onAction={(id, panel) => setAction({ id, panel })} />
        </div>
      </Card>
      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-text!">Close Activity</h3>
          <span className="text-xs text-text-faint">{data.closed.length}</span>
        </div>
        <div className="px-4 py-2 overflow-x-auto">
          <ActivityTable items={data.closed} emptyLabel={`No closed ${ACTIVITY_TYPE_LABEL[type].toLowerCase()}s.`} onAction={(id, panel) => setAction({ id, panel })} />
        </div>
      </Card>
    </div>
  )
}

export const ACTIVITY_SUBTABS: Array<{ key: ActivityType | 'timeline'; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = [
  { key: 'tasks', label: 'Tasks', icon: ListChecks },
  { key: 'meetings', label: 'Meetings', icon: Users2 },
  { key: 'calls', label: 'Calls', icon: Phone },
  { key: 'timeline', label: 'Timeline', icon: History },
]

export function ActivitiesTab({ socid }: { socid: string | undefined }) {
  const [subtab, setSubtab] = useState<ActivityType | 'timeline'>('tasks')
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5">
        {ACTIVITY_SUBTABS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setSubtab(s.key)}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              subtab === s.key ? 'bg-brand text-white shadow-sm shadow-brand/25' : 'text-text-muted hover:bg-surface-hover'
            }`}
          >
            <s.icon size={14} /> {s.label}
          </button>
        ))}
      </div>
      {subtab === 'timeline' ? <AgendaTab socid={socid} /> : <ActivitySubtab socid={socid} type={subtab} />}
    </div>
  )
}

const AGENDA_STATUS_BADGE: Record<string, string> = {
  done: 'bg-success-bg text-success-fg',
  todo: 'bg-warning-bg text-warning-fg',
  inprogress: 'bg-info-bg text-info-fg',
}

function AgendaTimelineList({ days }: { days: AgendaDay[] }) {
  if (days.length === 0) return <p className="text-sm text-text-faint italic py-8 text-center">No events found.</p>
  return (
    <div className="space-y-6">
      {days.map((day) => (
        <div key={day.date}>
          <div className="inline-block px-2.5 py-1 rounded-md bg-brand/10 text-brand text-xs font-semibold mb-3">{day.date_label}</div>
          <div className="space-y-3">
            {day.events.map((ev) => (
              <div key={ev.id} className="flex items-start gap-3 pb-3 border-b border-border last:border-0">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-surface-hover text-text-muted shrink-0 mt-0.5">
                  {ev.type.includes('AUTO') ? <Bot size={14} /> : <CalendarClock size={14} />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-text-faint mb-0.5">{ev.time}</p>
                  <p className="font-medium text-text!">{ev.label}</p>
                  <p className="text-xs text-text-faint mt-0.5 italic">
                    {ev.type_label} · {ev.user}
                  </p>
                  {ev.note && <p className="text-sm text-text-muted mt-1">{ev.note}</p>}
                </div>
                <span
                  className={`inline-block px-2 py-0.5 rounded text-xs font-medium shrink-0 ${AGENDA_STATUS_BADGE[ev.status] ?? 'bg-neutral-bg text-neutral-fg'}`}
                >
                  {ev.status_label}
                  {ev.late ? ' · Late' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ISO day of a timeline group: the API's own date when it is YYYY-MM-DD, else parsed from the printed label.
function agendaDayIso(day: AgendaDay): string {
  if (/^\d{4}-\d{2}-\d{2}/.test(day.date)) return day.date.slice(0, 10)
  const parsed = new Date(day.date_label || day.date)
  return Number.isNaN(parsed.getTime()) ? '' : `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`
}

// The visible events as a CSV the user can open in Excel (the legacy tab's "Export").
function downloadAgendaCsv(days: AgendaDay[], name: string) {
  const cell = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const rows = [['Date', 'Time', 'Type', 'Label', 'Status', 'User', 'Note']]
  for (const day of days) for (const ev of day.events) rows.push([agendaDayIso(day) || day.date_label, ev.time, ev.type_label, ev.label, ev.status_label + (ev.late ? ' (late)' : ''), ev.user, ev.note])
  const blob = new Blob(['\uFEFF' + rows.map((r) => r.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `agenda_${name.replace(/[^a-z0-9]+/gi, '_')}_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function AgendaTab({ socid, name = 'events' }: { socid: string | undefined; name?: string }) {
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [user, setUser] = useState('')
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [modal, setModal] = useState<'create' | 'quick' | null>(null)
  const { data, isLoading, isError, error, refetch } = useCustomerAgenda(socid, { type, status, user, search, from, to })

  if (isLoading) return <LegacyLoadingCard label="Loading agenda…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load agenda" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  // Every filter, the date range included, is answered by the API (datefilter), so the timeline is shown as returned.
  const days = data.timeline
  const total = days.reduce((n, d) => n + d.events.length, 0)
  const filtered = !!(type || status || user || search || from || to)
  const clear = () => {
    setType('')
    setStatus('')
    setUser('')
    setSearch('')
    setFrom('')
    setTo('')
  }
  const field = 'text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5'

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TabTitle>Agenda</TabTitle>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => downloadAgendaCsv(days, name)}
            disabled={total === 0}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-text-muted hover:bg-surface-hover hover:text-text disabled:opacity-50"
          >
            <Download size={14} /> Export
          </button>
          <button type="button" onClick={() => setModal('create')} className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover">
            <Plus size={14} /> Create event
          </button>
          <button type="button" onClick={() => setModal('quick')} className="inline-flex items-center gap-1.5 rounded-md border border-brand px-3 py-1.5 text-sm font-medium text-brand hover:bg-brand/10">
            <Zap size={14} /> Quick event
          </button>
        </div>
      </div>
      <Card className="!h-auto">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-faint">From</span>
            <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className={field} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-faint">To</span>
            <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className={field} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-faint">Type</span>
            <select value={type} onChange={(e) => setType(e.target.value)} className={field}>
              {data.filters.types.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-faint">Status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={field}>
              {data.filters.statuses.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-faint">User</span>
            <select value={user} onChange={(e) => setUser(e.target.value)} className={field}>
              {data.filters.users.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[160px] flex-1 flex-col gap-1">
            <span className="text-xs font-medium text-text-faint">Search</span>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Label" className={field} />
          </label>
          <button
            type="button"
            onClick={clear}
            disabled={!filtered}
            title="Clear filters"
            aria-label="Clear filters"
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-text-muted hover:bg-surface-hover hover:text-text disabled:opacity-50"
          >
            <X size={14} /> Clear
          </button>
        </div>
        <p className="mt-2 text-xs text-text-faint">
          {total} event{total === 1 ? '' : 's'}
          {filtered ? ' match these filters' : ''}
        </p>
      </Card>
      <Card className="!h-auto">
        <AgendaTimelineList days={days} />
      </Card>
      {modal === 'create' && (
        <AddEventModal
          socid={Number(socid)}
          onClose={() => setModal(null)}
          onCreated={() => {
            void refetch()
          }}
        />
      )}
      {modal === 'quick' && (
        <QuickEventModal
          socid={Number(socid)}
          onClose={() => setModal(null)}
          onCreated={() => {
            setModal(null)
            void refetch()
          }}
        />
      )}
    </div>
  )
}
