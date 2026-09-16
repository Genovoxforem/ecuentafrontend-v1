import { useState, type ComponentType } from 'react'
import { Link } from 'react-router-dom'
import {
  ListChecks,
  ChevronRight,
  BarChart3,
  ClipboardCheck,
  LoaderCircle,
  RotateCcw,
  Plus,
  ExternalLink,
  Users,
  UserCheck,
  Handshake,
  ListTodo,
  CalendarClock,
  Phone,
  FileText,
} from 'lucide-react'
import { Card, ICON_STYLES, type IconColor } from '../../../shared/components/dashboard/DashboardKit'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { ROUTES } from '../../../routes'
import { formatDate } from '../../../utils/format'
import { stripBackendPrefix } from '../../customers/customerDetailTabs.queries'
import { useTaskActivityKanbanForm, useRunTaskActivityKanbanReport, useRunCombinedActivitiesReport, type TaskActivityType, type CombinedActivityRow } from '../taskActivity.queries'
import { TASK_ACTIVITY_CUSTOMER_TYPES, type TaskActivityStats } from '../taskActivityParser'

const inputCls = 'w-full h-10 px-3 rounded-lg border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm mb-1 text-text-muted">{label}</label>
      {children}
    </div>
  )
}

const ACTIVITY_TYPE_LABELS: Record<TaskActivityType, string> = { task: 'Task', meeting: 'Meeting', calls: 'Call' }

// Real: task_activity-kanban.php's own <a href="/comm/action/card.php?action=create">
// equivalent doesn't exist inline on either scraped report page, but the
// standard Dolibarr agenda "add event" page does (confirmed live, 200 OK) —
// used the same "open the real legacy create page" convention as this app's
// other create flows that have no confirmed JSON API (see agenda.queries.ts's
// own note that llx_actioncomm has none here).
const LEGACY_ADD_ACTIVITY_URL = '/comm/action/card.php?action=create'

function useDefaultMonthRange() {
  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, '0')}`
  return [monthStart, monthEnd] as const
}

const STAT_ROWS: { key: keyof TaskActivityStats; label: string }[] = [
  { key: 'totalProspects', label: 'Total Prospects' },
  { key: 'totalCustomers', label: 'Total Customers' },
  { key: 'prospectToCustomer', label: 'Prospect → Customer' },
  { key: 'totalDemosGiven', label: 'Total Demos Given' },
  { key: 'totalTasks', label: 'Total Tasks' },
  { key: 'totalMeetings', label: 'Total Meetings' },
  { key: 'totalCalls', label: 'Total Calls' },
  { key: 'totalProposals', label: 'Total Proposals' },
]
const LEADS_ROWS: { key: keyof TaskActivityStats; label: string }[] = [
  { key: 'leadsWon', label: 'Leads Won' },
  { key: 'totalDropped', label: 'Total Dropped' },
  { key: 'totalLoss', label: 'Total Loss' },
]
const PAID_ROWS: { key: keyof TaskActivityStats; label: string }[] = [
  { key: 'totalPaidLeads', label: 'Total Paid Leads' },
  { key: 'totalOrganicLeads', label: 'Total Organic Leads' },
]

// The horizontal summary row above the table — 7 of the same real stats the
// Statistics sidebar lists (all from task_activity-kanban.php, see that
// hook's own comment on why these are live-computed, not fabricated),
// picked and colored to read at a glance; the sidebar underneath still
// lists all 13 in full.
const TOP_STAT_CARDS: { key: keyof TaskActivityStats; label: string; icon: ComponentType<{ size?: number }>; color: IconColor }[] = [
  { key: 'totalProspects', label: 'Total Prospects', icon: Users, color: 'blue' },
  { key: 'totalCustomers', label: 'Total Customers', icon: UserCheck, color: 'green' },
  { key: 'prospectToCustomer', label: 'Prospect → Customer', icon: Handshake, color: 'violet' },
  { key: 'totalTasks', label: 'Total Tasks', icon: ListTodo, color: 'amber' },
  { key: 'totalMeetings', label: 'Total Meetings', icon: CalendarClock, color: 'rose' },
  { key: 'totalCalls', label: 'Total Calls', icon: Phone, color: 'cyan' },
  { key: 'totalProposals', label: 'Total Proposals', icon: FileText, color: 'indigo' },
]

function TopStatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: ComponentType<{ size?: number }>; color: IconColor }) {
  return (
    <Card className="!h-auto !flex-row items-center gap-3 !p-4">
      <span className={`shrink-0 w-10 h-10 rounded-xl grid place-items-center ${ICON_STYLES[color]}`}>
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <p className="text-xl font-bold text-text! leading-none">{value}</p>
        <p className="text-xs text-text-faint truncate mt-1">{label}</p>
      </div>
    </Card>
  )
}

type SortKey = 'date'

// Real: this app's own unified screen — task_activity.php's own `type`
// radio only ever returns one activity type at a time (Tasks OR Meetings OR
// Calls, never combined, and it has no Customer Type/Created By filters),
// while task_activity-kanban.php has those two filters but shows per-
// customer cards, not per-activity rows. Neither real page looks like this
// on its own; this merges both real endpoints — task_activity.php searched
// 3 times in parallel (see useRunCombinedActivitiesReport) for the Type
// column, and task_activity-kanban.php once for the Statistics sidebar —
// into the single screen the team asked for. Customer Type only narrows the
// Statistics/summary numbers (it's not a parameter task_activity.php's own
// list accepts); Created By narrows the Activities table client-side by
// matching the scraped "Created By" name against the selected user, since
// that endpoint has no fk_user param of its own either.
export function ActivitiesDetailPage() {
  const { data: form, isLoading: formLoading, isError: formIsError, error: formError } = useTaskActivityKanbanForm()
  const runStats = useRunTaskActivityKanbanReport()
  const runActivities = useRunCombinedActivitiesReport()
  const [monthStart, monthEnd] = useDefaultMonthRange()

  const [from, setFrom] = useState(monthStart)
  const [to, setTo] = useState(monthEnd)
  const [customerType, setCustomerType] = useState(TASK_ACTIVITY_CUSTOMER_TYPES[0].value)
  const [thirdPartyId, setThirdPartyId] = useState('')
  const [createdByUserId, setCreatedByUserId] = useState('')
  const [submitError, setSubmitError] = useState('')

  const thirdPartyOptions = (form?.thirdPartyOptions ?? []).map((o) => ({ value: o.value, label: o.label, description: o.description }))
  const userOptions = form?.userOptions ?? []

  function handleReset() {
    setFrom(monthStart)
    setTo(monthEnd)
    setCustomerType(TASK_ACTIVITY_CUSTOMER_TYPES[0].value)
    setThirdPartyId('')
    setCreatedByUserId('')
    setSubmitError('')
    runStats.reset()
    runActivities.reset()
  }

  function handleViewReport() {
    setSubmitError('')
    const token = form?.token
    if (!token) {
      setSubmitError("Couldn't load this report's form — try reloading the page.")
      return
    }
    const onError = (err: unknown) => setSubmitError(err instanceof Error ? err.message : 'Could not run this report — please try again.')
    runStats.mutate({ token, from, to, customerType, thirdPartyId: thirdPartyId || '-1', createdByUserId: createdByUserId || '-1' }, { onError })
    runActivities.mutate({ token, from, to, thirdPartyId: thirdPartyId || '-1' }, { onError })
  }

  const stats = runStats.data?.stats ?? form?.initialStats

  const selectedUserLabel = userOptions.find((u) => u.value === createdByUserId)?.label
  const allRows = runActivities.data ?? []
  const rows: CombinedActivityRow[] = selectedUserLabel ? allRows.filter((r) => r.createdBy === selectedUserLabel) : allRows
  const { sorted, sort, toggleSort } = useSortableRows<CombinedActivityRow, SortKey>(rows, (row) => row.date)

  function getExportData() {
    return {
      headers: ['#', 'Subject', 'Customer', 'Type', 'Created By', 'Created On', 'Status'],
      rows: sorted.map((row, i) => [
        String(i + 1),
        row.subject,
        row.thirdPartyRelatedTo,
        ACTIVITY_TYPE_LABELS[row.activityType],
        row.createdBy,
        row.date ? formatDate(row.date) : '',
        row.status,
      ]),
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <ListChecks size={20} className="text-brand" /> Task / Activities Details
        </h2>
        <div className="flex items-center gap-1.5 text-xs text-text-faint mt-1">
          <Link to={ROUTES.usersDashboard} className="hover:text-brand hover:underline">
            Users
          </Link>
          <ChevronRight size={12} />
          <Link to={ROUTES.activitiesDetail} className="hover:text-brand hover:underline">
            Activities List
          </Link>
          <ChevronRight size={12} />
          <span className="text-text-muted">Task / Activities Details</span>
        </div>
      </div>

      {formIsError && (
        <Card className="!h-auto !bg-danger-bg border-danger/40 text-danger-fg text-sm font-medium">
          {formError instanceof Error ? formError.message : "Couldn't load this report's form."}
        </Card>
      )}

      <Card className="!h-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Field label="Customer Created On">
            <div className="flex items-center gap-1.5">
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
              <span className="text-text-faint">–</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
            </div>
          </Field>
          <Field label="Customer Type">
            <select value={customerType} onChange={(e) => setCustomerType(e.target.value)} className={inputCls}>
              {TASK_ACTIVITY_CUSTOMER_TYPES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Customer Details">
            <SearchableSelect
              value={thirdPartyId}
              onChange={setThirdPartyId}
              options={thirdPartyOptions}
              placeholder={formLoading ? 'Loading…' : 'Select a third party'}
            />
          </Field>
          <Field label="Created By">
            <SearchableSelect
              value={createdByUserId}
              onChange={setCreatedByUserId}
              options={userOptions}
              placeholder={formLoading ? 'Loading…' : 'Select a user'}
            />
          </Field>
        </div>
        <div className="flex items-center justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover"
          >
            <RotateCcw size={14} /> Reset
          </button>
          <button
            type="button"
            onClick={handleViewReport}
            disabled={runStats.isPending || runActivities.isPending}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {runStats.isPending || runActivities.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <BarChart3 size={14} />} View Report
          </button>
        </div>
        {submitError && <p className="mt-3 text-sm text-danger">{submitError}</p>}
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {TOP_STAT_CARDS.map((s) => (
          <TopStatCard key={s.key} label={s.label} value={stats ? stats[s.key] : 0} icon={s.icon} color={s.color} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4 items-start">
        <Card className="!p-0 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 p-4 border-b border-border">
            <h3 className="flex items-center gap-2 font-semibold text-text!">
              <ClipboardCheck size={16} className="text-brand" /> Activities List
            </h3>
            <div className="flex items-center gap-2">
              <TableExportButtons title="Activities List" getExportData={getExportData} />
              <a
                href={stripBackendPrefix(LEGACY_ADD_ACTIVITY_URL)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover"
              >
                <Plus size={14} /> Add Activity
              </a>
            </div>
          </div>

          {sorted.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-14 px-4 text-center">
              <span className="w-16 h-16 rounded-2xl grid place-items-center bg-brand/10 text-brand">
                <ClipboardCheck size={30} />
              </span>
              <p className="font-semibold text-text!">No Activities Found</p>
              <p className="text-sm text-text-faint max-w-xs">There is no task / activities details for the selected filters. Try changing the filters or date range.</p>
              <a
                href={stripBackendPrefix(LEGACY_ADD_ACTIVITY_URL)}
                target="_blank"
                rel="noreferrer"
                className="mt-1 flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
              >
                <Plus size={14} /> Add New Activity
              </a>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <TheadRow>
                    <Th>#</Th>
                    <Th>Subject</Th>
                    <Th>Customer</Th>
                    <Th>Type</Th>
                    <Th>Created By</Th>
                    <Th<SortKey> sortKey="date" sort={sort} onSort={toggleSort}>
                      Created On
                    </Th>
                    <Th>Status</Th>
                    <Th align="center">Actions</Th>
                  </TheadRow>
                </thead>
                <tbody>
                  {sorted.map((row, i) => (
                    <tr key={`${row.activityType}-${row.id ?? i}`} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5 text-text-faint">{i + 1}</td>
                      <td className="px-4 py-2.5 text-text! font-medium whitespace-nowrap">{row.subject || '—'}</td>
                      <td className="px-4 py-2.5 text-text-muted whitespace-nowrap">{row.thirdPartyRelatedTo || '—'}</td>
                      <td className="px-4 py-2.5 text-text-muted whitespace-nowrap">{ACTIVITY_TYPE_LABELS[row.activityType]}</td>
                      <td className="px-4 py-2.5 text-text-muted whitespace-nowrap">{row.createdBy || '—'}</td>
                      <td className="px-4 py-2.5 text-text-muted whitespace-nowrap">{row.date ? formatDate(row.date) : '—'}</td>
                      <td className="px-4 py-2.5 text-text-muted whitespace-nowrap">{row.status || '—'}</td>
                      <td className="px-4 py-2.5 text-center">
                        {row.thirdPartySocId ? (
                          <a
                            href={stripBackendPrefix(`/comm/card.php?socid=${row.thirdPartySocId}`)}
                            target="_blank"
                            rel="noreferrer"
                            title="View customer"
                            className="inline-flex text-text-faint hover:text-brand"
                          >
                            <ExternalLink size={14} />
                          </a>
                        ) : (
                          <span className="text-text-faint">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="!h-auto space-y-4">
          <div>
            <h3 className="font-semibold text-text! mb-2">Statistics</h3>
            <div className="divide-y divide-border/60">
              {STAT_ROWS.map((s) => (
                <div key={s.key} className="flex items-center justify-between py-1.5 text-sm">
                  <span className="text-text-muted">{s.label}</span>
                  <span className="font-semibold text-text! tabular-nums">{stats ? stats[s.key] : 0}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-border divide-y divide-border">
            {LEADS_ROWS.map((s) => (
              <div key={s.key} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="text-text-muted">{s.label}</span>
                <span className="font-semibold text-text! tabular-nums">{stats ? stats[s.key] : 0}</span>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-border divide-y divide-border">
            {PAID_ROWS.map((s) => (
              <div key={s.key} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="text-text-muted">{s.label}</span>
                <span className="font-semibold text-text! tabular-nums">{stats ? stats[s.key] : 0}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
