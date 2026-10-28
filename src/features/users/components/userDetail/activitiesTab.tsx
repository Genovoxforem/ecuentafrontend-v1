import { useState } from 'react'
import { X, Pencil, CheckCircle2, UsersRound, Plus, FolderOpen, PhoneCall, Clock, History, Eye, CalendarPlus } from 'lucide-react'
import { useActivitiesMeta, useActivities, useActivityTimeline, type ActivityItem, type ActivityMeta, type ActivityProcessType, type ActivitySubtabKey } from '../../userDetailTabs.queries'
import { LegacyLoadingCard, LegacyErrorCard } from '../../../products/components/LegacyReportStates'
import { primaryBtn } from './UserDetailShared'
import { PROCESS_LABEL, accountingNeedsLabel } from './activitiesTab/activitiesTabShared'
import { ActivityForm } from './activitiesTab/activityForms'
import { ActivityPanelModal } from './activitiesTab/activityPanel'
export { PROCESS_LABEL, accountingNeedsLabel } from './activitiesTab/activitiesTabShared'
export { PROCESS_ICON, resolveUserNames, ActivityDetailView, ActivityScheduleForm, ActivityPanelModal } from './activitiesTab/activityPanel'
export { toDatetimeLocalInput, fromDatetimeLocalInput, activityToFormFields, FormRow, type FormFieldsProps, TaskFormFields, MeetingFormFields, CallFormFields, ActivityFormRenderer, ActivityForm } from './activitiesTab/activityForms'

export const ACTIVITY_SUBTABS = [
  { key: 'tasks', label: 'Tasks', icon: CheckCircle2 },
  { key: 'meetings', label: 'Meetings', icon: UsersRound },
  { key: 'calls', label: 'Calls', icon: PhoneCall },
  { key: 'timeline', label: 'Timeline', icon: History },
] as const

export type ActivitySubtab = (typeof ACTIVITY_SUBTABS)[number]['key']

const SUBTAB_PROCESS: Record<Exclude<ActivitySubtab, 'timeline'>, ActivityProcessType> = { tasks: 'task', meetings: 'meeting', calls: 'calls' }

// Via userprofile/api/activities.php (the endpoint the reference page's own
// front-end JS, activities.js, calls instead of agenda.php) — see
// userDetailTabs.queries.ts's header comment on this section for its CRUD
// surface (create/detail/update/delete/schedule/close).
export function ActivitiesTab({ userId }: { userId: string | undefined }) {
  const [subtab, setSubtab] = useState<ActivitySubtab>('tasks')
  const { data: meta } = useActivitiesMeta(userId)
  const listType: ActivitySubtabKey = subtab === 'timeline' ? 'tasks' : subtab
  const list = useActivities(userId, listType, subtab !== 'timeline')
  const timeline = useActivityTimeline(userId, subtab === 'timeline')
  const [request, setRequest] = useState<
    { kind: 'create'; processtype: ActivityProcessType } | { kind: 'panel'; activity: ActivityItem; initialPanel: 'view' | 'edit' | 'schedule' } | null
  >(null)

  const isLoading = subtab === 'timeline' ? timeline.isLoading : list.isLoading
  const isError = subtab === 'timeline' ? timeline.isError : list.isError
  const error = subtab === 'timeline' ? timeline.error : list.error
  const refetch = subtab === 'timeline' ? timeline.refetch : list.refetch

  if (isLoading) return <LegacyLoadingCard label="Loading activities…" />
  if (isError) return <LegacyErrorCard title="Couldn't load activities" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
          {ACTIVITY_SUBTABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setSubtab(t.key)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${
                subtab === t.key ? 'bg-brand text-white' : 'text-text-muted hover:bg-surface-hover'
              }`}
            >
              <t.icon size={13} /> {t.label}
            </button>
          ))}
        </div>
        {subtab !== 'timeline' && (
          <button type="button" onClick={() => setRequest({ kind: 'create', processtype: SUBTAB_PROCESS[subtab] })} className={primaryBtn}>
            <Plus size={13} /> Add
          </button>
        )}
      </div>

      {subtab === 'timeline' ? (
        <ActivityTimelineView events={timeline.data ?? []} onSelect={(a) => setRequest({ kind: 'panel', activity: a, initialPanel: 'view' })} />
      ) : (
        <ActivityTable
          open={list.data?.open ?? []}
          closed={list.data?.closed ?? []}
          meta={meta}
          onView={(a) => setRequest({ kind: 'panel', activity: a, initialPanel: 'view' })}
          onEdit={(a) => setRequest({ kind: 'panel', activity: a, initialPanel: 'edit' })}
          onSchedule={(a) => setRequest({ kind: 'panel', activity: a, initialPanel: 'schedule' })}
        />
      )}

      {request?.kind === 'create' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setRequest(null)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-surface border border-border shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-sm font-semibold text-text!">Create {PROCESS_LABEL[request.processtype]}</h3>
              <button type="button" onClick={() => setRequest(null)} className="p-1 rounded-md text-text-faint hover:bg-surface-hover hover:text-text">
                <X size={16} />
              </button>
            </div>
            <div className="px-5 py-4">
              <ActivityForm userId={userId} processtype={request.processtype} activity={null} onDone={() => setRequest(null)} />
            </div>
          </div>
        </div>
      )}

      {request?.kind === 'panel' && (
        <ActivityPanelModal userId={userId} activity={request.activity} initialPanel={request.initialPanel} onClose={() => setRequest(null)} />
      )}
    </div>
  )
}

export function ActivityTable({
  open,
  closed,
  meta,
  onView,
  onEdit,
  onSchedule,
}: {
  open: ActivityItem[]
  closed: ActivityItem[]
  meta: ActivityMeta | undefined
  onView: (a: ActivityItem) => void
  onEdit: (a: ActivityItem) => void
  onSchedule: (a: ActivityItem) => void
}) {
  return (
    <>
      {([
        { label: 'Open', rows: open },
        { label: 'Close', rows: closed },
      ] as const).map(({ label, rows }) => (
        <div key={label}>
          <p className="flex items-center gap-2 text-sm font-semibold text-text! mb-2">
            <FolderOpen size={14} className="text-text-faint" /> {label} Activity <span className="text-text-faint">{rows.length}</span>
          </p>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide bg-surface border-b border-border">
                  <th className="font-medium px-3 py-2">Subject</th>
                  <th className="font-medium px-3 py-2">Date</th>
                  <th className="font-medium px-3 py-2">Priority</th>
                  <th className="font-medium px-3 py-2">Accounting Needs</th>
                  <th className="font-medium px-3 py-2">Status</th>
                  <th className="font-medium px-3 py-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td className="px-3 py-3 text-text-faint italic" colSpan={6}>
                      None
                    </td>
                  </tr>
                ) : (
                  rows.map((a) => (
                    <tr key={a.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2">
                        <p className="text-text! font-medium">{a.subject}</p>
                        <p className="text-xs text-text-faint">{PROCESS_LABEL[a.processtype]}</p>
                      </td>
                      <td className="px-3 py-2 text-text-muted whitespace-nowrap">{a.dueDate || a.startDate || '—'}</td>
                      <td className="px-3 py-2 text-text-muted capitalize">{a.priority || '—'}</td>
                      <td className="px-3 py-2 text-text-muted">{accountingNeedsLabel(a.relatedTo, meta)}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            a.status === 'open' ? 'bg-success-bg text-success-fg' : 'bg-neutral-bg text-neutral-fg'
                          }`}
                        >
                          {a.status === 'open' ? 'Open' : 'Closed'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-center gap-1">
                          <button type="button" onClick={() => onView(a)} title="View" className="p-1 rounded text-text-muted hover:bg-surface-hover hover:text-text">
                            <Eye size={13} />
                          </button>
                          {a.status === 'open' && (
                            <>
                              <button type="button" onClick={() => onEdit(a)} title="Edit" className="p-1 rounded text-text-muted hover:bg-surface-hover hover:text-text">
                                <Pencil size={13} />
                              </button>
                              <button type="button" onClick={() => onSchedule(a)} title="Schedule" className="p-1 rounded text-text-muted hover:bg-surface-hover hover:text-text">
                                <CalendarPlus size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </>
  )
}

// Chronological view, grouped by month — matches the reference's own
// Timeline sub-tab layout. The subject genuinely opens the same real
// ActivityPanelModal as the table's Eye icon, since the timeline call
// already returns every field for every row.
function ActivityTimelineView({ events, onSelect }: { events: ActivityItem[]; onSelect: (event: ActivityItem) => void }) {
  const monthGroups = new Map<string, Map<string, ActivityItem[]>>()
  for (const e of [...events].sort((a, b) => (b.dueDateRaw || b.createdDate).localeCompare(a.dueDateRaw || a.createdDate))) {
    const raw = e.dueDateRaw || e.createdDate
    const d = raw ? new Date(raw.replace(' ', 'T')) : null
    const valid = d && !isNaN(d.getTime())
    const monthKey = valid ? d!.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : 'Unknown'
    const dateKey = valid ? d!.toLocaleDateString(undefined, { month: '2-digit', day: '2-digit', year: 'numeric' }) : e.dueDate || e.createdDate || 'Unknown'
    if (!monthGroups.has(monthKey)) monthGroups.set(monthKey, new Map())
    const dateGroup = monthGroups.get(monthKey)!
    if (!dateGroup.has(dateKey)) dateGroup.set(dateKey, [])
    dateGroup.get(dateKey)!.push(e)
  }

  if (events.length === 0) return <p className="text-sm text-text-faint italic py-6 text-center">No activity recorded.</p>

  return (
    <div className="space-y-6">
      {Array.from(monthGroups.entries()).map(([month, dateGroups]) => {
        const total = Array.from(dateGroups.values()).reduce((sum, rows) => sum + rows.length, 0)
        return (
          <div key={month} className="relative pl-5 border-l-2 border-border space-y-4">
            <div className="flex items-center gap-2 -ml-[27px]">
              <span className="w-3.5 h-3.5 rounded-full bg-brand shrink-0" />
              <span className="text-sm font-semibold text-text!">{month}</span>
              <span className="rounded-full bg-neutral-bg text-neutral-fg text-xs px-2 py-0.5">{total} Entries</span>
            </div>
            {Array.from(dateGroups.entries()).map(([date, rows]) => (
              <div key={date} className="space-y-2">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-brand text-white text-xs font-medium px-2.5 py-1">
                  <Clock size={11} /> {date}
                </span>
                <div className="flex flex-wrap gap-3">
                  {rows.map((e) => (
                    <div key={e.id} className="rounded-lg border border-border bg-surface p-3 w-full sm:w-64">
                      <p className="flex items-center gap-1.5 text-xs text-text-faint">
                        <Clock size={11} /> {PROCESS_LABEL[e.processtype].toLowerCase()}
                      </p>
                      <button type="button" onClick={() => onSelect(e)} className="block text-sm text-brand font-medium mt-1 text-left hover:underline">
                        {e.subject}
                      </button>
                      {e.description && <p className="text-xs text-text-faint mt-1 line-clamp-2">{e.description}</p>}
                      {e.creatorName && <p className="text-xs text-text-faint mt-1">- {e.creatorName}</p>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
