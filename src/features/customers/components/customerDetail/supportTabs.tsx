import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { Card } from '../../../../shared/components/dashboard/DashboardKit'
import { ROUTES } from '../../../../routes'
import { formatMoney } from '../../../../utils/format'
import { LegacyLoadingCard, LegacyErrorCard } from '../../../products/components/LegacyReportStates'
import { useCustomerTickets, useCustomerProjects, useCustomerExpenses, type TicketsFilters } from '../../customerDetailTabs.queries'
import { TabTitle } from './CustomerDetailShared'

// societe/api/tickets.php — real llx_ticket rows scoped to this third
// party, confirmed by reading that file directly (real filters/status
// options straight off c_ticket_type/c_ticket_severity).
export function TicketsTab({ socid }: { socid: string | undefined }) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('openall')
  const [type, setType] = useState('')
  const [severity, setSeverity] = useState('')
  const [filters, setFilters] = useState<TicketsFilters>({ status: 'openall' })

  const { data, isLoading, isError, error, refetch } = useCustomerTickets(socid, filters)
  if (isLoading) return <LegacyLoadingCard label="Loading tickets…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load tickets" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  function applyFilters() {
    setFilters({ search, status, type, severity })
  }
  function resetFilters() {
    setSearch('')
    setStatus('openall')
    setType('')
    setSeverity('')
    setFilters({ status: 'openall' })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <TabTitle>Tickets</TabTitle>
        {data.can_create && (
          <Link to={ROUTES.ticketNew} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover">
            <Plus size={14} /> New ticket
          </Link>
        )}
      </div>
      <Card className="!h-auto">
        <p className="text-sm font-medium text-text! mb-3">{data.count} ticket(s)</p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
            <label className="text-xs text-text-faint">Search</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ref, subject, track ID"
              className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2.5 py-1.5"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-faint">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2.5 py-1.5">
              {data.filter_options.status.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-faint">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2.5 py-1.5">
              <option value="">All</option>
              {data.filter_options.types.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-faint">Severity</label>
            <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2.5 py-1.5">
              <option value="">All</option>
              {data.filter_options.severities.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <button type="button" onClick={applyFilters} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand text-white text-sm font-medium hover:bg-brand-hover">
            <Search size={14} /> Apply
          </button>
          <button type="button" onClick={resetFilters} className="px-3 py-1.5 rounded-md border border-border text-text-muted text-sm font-medium hover:bg-surface-hover hover:text-text">
            Reset
          </button>
        </div>
        {data.rows.length === 0 ? (
          <p className="text-sm text-text-faint italic text-center py-6">No tickets for this third party.</p>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                  <th className="font-medium py-2 pr-3">Ref</th>
                  <th className="font-medium py-2 pr-3">Subject</th>
                  <th className="font-medium py-2 pr-3">Type</th>
                  <th className="font-medium py-2 pr-3">Severity</th>
                  <th className="font-medium py-2 pr-3">Status</th>
                  <th className="font-medium py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((t) => (
                  <tr key={t.id} className="border-b border-border last:border-0">
                    <td className="py-2 pr-3">
                      <Link to={ROUTES.ticketDetail.replace(':id', String(t.id))} className="font-medium text-brand hover:underline">
                        {t.ref}
                      </Link>
                    </td>
                    <td className="py-2 pr-3 text-text!">{t.subject}</td>
                    <td className="py-2 pr-3 text-text-muted">{t.type_label}</td>
                    <td className="py-2 pr-3 text-text-muted">{t.severity_label}</td>
                    <td className="py-2 pr-3 text-text-muted">{t.status_label}</td>
                    <td className="py-2 text-text-muted">{t.date_created}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

// societe/api/projects.php — real llx_projet rows scoped to fk_soc,
// confirmed by reading that file directly.
export function ProjectsTab({ socid }: { socid: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useCustomerProjects(socid)
  if (isLoading) return <LegacyLoadingCard label="Loading projects…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load projects" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <TabTitle>Projects</TabTitle>
        <Link
          to={`${ROUTES.projectCreate}?customerId=${socid ?? ''}`}
          title="No real backend exists on this instance to save a project yet — this opens the same reference-layout page the standalone Projects module uses."
          className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover"
        >
          <Plus size={14} /> New project
        </Link>
      </div>
      <Card className="!h-auto">
        {data.projects.length === 0 ? (
          <p className="text-sm text-text-faint italic text-center py-6">No projects linked to this third party.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                  <th className="font-medium py-2 pr-3">Ref</th>
                  <th className="font-medium py-2 pr-3">Title</th>
                  <th className="font-medium py-2 pr-3">Start</th>
                  <th className="font-medium py-2 pr-3">End</th>
                  <th className="font-medium py-2 pr-3">Tasks</th>
                  <th className="font-medium py-2">Budget</th>
                </tr>
              </thead>
              <tbody>
                {data.projects.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="py-2 pr-3">
                      <Link to={ROUTES.projectDetail.replace(':id', String(p.id))} className="font-medium text-brand hover:underline">
                        {p.ref}
                      </Link>
                    </td>
                    <td className="py-2 pr-3 text-text!">{p.title}</td>
                    <td className="py-2 pr-3 text-text-muted">{p.date_start}</td>
                    <td className="py-2 pr-3 text-text-muted">{p.date_end}</td>
                    <td className="py-2 pr-3 text-text-muted">{p.task_count}</td>
                    <td className="py-2 text-text-muted">{p.budget > 0 ? formatMoney(p.budget) : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

// societe/api/expenses.php — real llx_expensereport rows when a fk_soc link
// exists; on this deployment it always reports a real, honest `message`
// instead ("No third-party link on expense reports"), confirmed by
// reading that file directly.
export function ExpensesTab({ socid }: { socid: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useCustomerExpenses(socid)
  if (isLoading) return <LegacyLoadingCard label="Loading expenses…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load expenses" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  return (
    <div className="space-y-3">
      <TabTitle>Expenses</TabTitle>
      <Card className="!h-auto">
        {data.expenses.length === 0 ? (
          <p className="text-sm text-text-faint italic text-center py-6">{data.message || 'No expense reports linked to this third party.'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                  <th className="font-medium py-2 pr-3">Ref</th>
                  <th className="font-medium py-2 pr-3">Start</th>
                  <th className="font-medium py-2 pr-3">End</th>
                  <th className="font-medium py-2 pr-3">Total (Excl.)</th>
                  <th className="font-medium py-2">Total (Incl.)</th>
                </tr>
              </thead>
              <tbody>
                {data.expenses.map((e) => (
                  <tr key={e.id} className="border-b border-border last:border-0">
                    <td className="py-2 pr-3">
                      <Link to={ROUTES.expenseReportDetail.replace(':id', String(e.id))} className="font-medium text-brand hover:underline">
                        {e.ref}
                      </Link>
                    </td>
                    <td className="py-2 pr-3 text-text-muted">{e.date_start}</td>
                    <td className="py-2 pr-3 text-text-muted">{e.date_end}</td>
                    <td className="py-2 pr-3 text-text-muted">{formatMoney(e.total_ht)}</td>
                    <td className="py-2 text-text!">{formatMoney(e.total_ttc)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
