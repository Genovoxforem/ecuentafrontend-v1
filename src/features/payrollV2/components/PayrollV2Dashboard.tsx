import { BarChart3, CalendarDays, CheckCircle2, Clock, FileText, PencilLine, Plus, User, Users, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ROUTES } from '../../../routes'
import { TodayStatCard } from '../../../shared/components/dashboard/DashboardKit'
import { periodLabel } from '../payrollV2.api'
import { usePayRuns, usePayrollAuditLog, usePayrollEmployees } from '../payrollV2.queries'
import { EmptyRow, ErrorCard, LoadingRows, PanelCard, StatusBadge, TablePanel, Td, Th } from './PayrollV2Chrome'

// The classic dashboard's buttons, same order and icons. One without a path
// (no screen in this app yet) shows disabled.
const QUICK_ACTIONS: Array<{ label: string; icon: LucideIcon; path?: string; primary?: boolean }> = [
  { label: 'New Pay Run', icon: Plus, path: ROUTES.payrollV2PayRuns, primary: true },
  { label: 'Manage Employees', icon: User, path: ROUTES.payrollV2Employees },
  { label: 'Templates', icon: FileText, path: ROUTES.payrollV2Templates },
  { label: 'Shifts', icon: Clock, path: ROUTES.payrollV2Shifts },
  { label: 'Reports', icon: BarChart3, path: ROUTES.payrollV2Reports },
]

// The dashboard the classic page builds from three list calls (payrun list,
// employee list, audit log) — the counts are derived here the same way.
export function PayrollV2Dashboard() {
  const runs = usePayRuns()
  const employees = usePayrollEmployees()
  const audit = usePayrollAuditLog()

  const rows = runs.data ?? []
  const current = rows[0]
  const lastPosted = rows.find((r) => r.status === 'posted' || r.status === 'locked')
  const draftCount = rows.filter((r) => r.status === 'draft').length
  const pendingCount = rows.filter((r) => r.status === 'submitted').length
  const activeEmployees = (employees.data ?? []).filter((e) => e.assignment_active === '1').length
  const dash = (value: string) => (runs.isLoading ? '…' : value)

  return (
    <div className="space-y-4">
      {runs.isError && <ErrorCard error={runs.error} onRetry={() => runs.refetch()} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <TodayStatCard label="Current Period" value={dash(current ? periodLabel(current.period_month, current.period_year) : '—')} caption={current ? <StatusBadge status={current.status} /> : 'No pay run yet'} icon={CalendarDays} color="blue" />
        <TodayStatCard label="Active Employees" value={employees.isLoading ? '…' : String(activeEmployees)} caption="With an active assignment" icon={Users} color="violet" />
        <TodayStatCard label="Draft Pay Runs" value={dash(String(draftCount))} caption="Not yet submitted" icon={PencilLine} color="amber" />
        <TodayStatCard label="Pending Approval" value={dash(String(pendingCount))} caption="Submitted, awaiting review" icon={Clock} color="cyan" />
        <TodayStatCard label="Last Posted" value={dash(lastPosted ? periodLabel(lastPosted.period_month, lastPosted.period_year) : '—')} caption="Most recent posted run" icon={CheckCircle2} color="green" />
      </div>

      <PanelCard title="Quick Actions">
        <div className="flex flex-wrap items-center gap-2">
          {QUICK_ACTIONS.map((action) =>
            action.path ? (
              <Link
                key={action.label}
                to={action.path}
                className={
                  action.primary
                    ? 'inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover'
                    : 'inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover'
                }
              >
                <action.icon size={14} /> {action.label}
              </Link>
            ) : (
              <span
                key={action.label}
                title="Not available in this app yet"
                className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm font-medium text-text-faint/60"
              >
                <action.icon size={14} /> {action.label}
              </span>
            ),
          )}
        </div>
      </PanelCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TablePanel title="Recent Pay Runs" action={<Link to={ROUTES.payrollV2PayRuns} className="text-xs font-medium text-brand hover:underline">View all</Link>}>
          <table className="w-full">
            <thead className="bg-surface">
              <tr>
                <Th>Ref</Th>
                <Th>Period</Th>
                <Th>Status</Th>
                <Th className="text-right">&nbsp;</Th>
              </tr>
            </thead>
            <tbody>
              {runs.isLoading && <LoadingRows cols={4} />}
              {!runs.isLoading && rows.length === 0 && <EmptyRow colSpan={4} label="No pay runs yet. Create your first pay run to get started." />}
              {rows.slice(0, 5).map((run) => (
                <tr key={run.id} className="border-t border-border">
                  <Td className="font-medium">{run.ref}</Td>
                  <Td>{periodLabel(run.period_month, run.period_year)}</Td>
                  <Td>
                    <StatusBadge status={run.status} />
                  </Td>
                  <Td className="text-right">
                    <Link to={`${ROUTES.payrollV2PayRuns}/${run.id}`} className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-text hover:bg-surface-hover">
                      Open
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TablePanel>

        <TablePanel title="Recent Activity">
          <table className="w-full">
            <thead className="bg-surface">
              <tr>
                <Th>When</Th>
                <Th>Action</Th>
                <Th>By</Th>
              </tr>
            </thead>
            <tbody>
              {audit.isLoading && <LoadingRows cols={3} />}
              {!audit.isLoading && (audit.data ?? []).length === 0 && <EmptyRow colSpan={3} label="No recent activity." />}
              {(audit.data ?? []).slice(0, 5).map((log) => (
                <tr key={log.id} className="border-t border-border">
                  <Td className="whitespace-nowrap">{log.performed_at ?? '—'}</Td>
                  <Td className="first-letter:uppercase">{`${log.action} ${log.entity_type}`}</Td>
                  <Td>{`${log.firstname ?? ''} ${log.lastname ?? ''}`.trim() || '—'}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TablePanel>
      </div>
    </div>
  )
}
