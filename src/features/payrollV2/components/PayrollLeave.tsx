import { useState } from 'react'
import { Send } from 'lucide-react'
import { useConfirm } from '../../../shared/components/ConfirmDialog'
import { num } from '../payrollV2.api'
import {
  employeeName,
  useEmployeeLeaveDetails,
  useLeavePendingApprovals,
  useLeaveRequests,
  useLeaveTypes,
  useMyLeaveBalance,
  usePayRunAction,
  usePayrollCommand,
  usePayrollEmployees,
  type LeaveRequestRow,
} from '../payrollV2.queries'
import { EmptyRow, ErrorCard, LoadingRows, PanelCard, StatusBadge, TablePanel, Td, Th } from './PayrollV2Chrome'

const today = () => new Date().toISOString().slice(0, 10)
const FIELD = 'rounded-md border border-input-border bg-input-bg px-3 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-brand/30'
const errorText = (err: unknown) => (err instanceof Error ? err.message : 'Request failed.')

function RequestRows({ rows, empty, showStatus }: { rows: LeaveRequestRow[]; empty: string; showStatus?: boolean }) {
  if (!rows.length) return <p className="text-xs text-text-faint">{empty}</p>
  return (
    <table className="w-full text-xs">
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-t border-border text-text">
            <td className="py-1 pr-2">{r.leave_type_name ?? '—'}</td>
            <td className="whitespace-nowrap pr-2">{`${r.date_start} → ${r.date_end}`}</td>
            <td className="pr-2 text-right tabular-nums">{num(r.days_requested)} d</td>
            <td>{showStatus ? <StatusBadge status={r.status} /> : r.reason || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// What the classic manual form shows once an employee is picked: their balance
// per leave type, pending requests and leave already taken.
function EmployeeLeaveDetails({ employeeId }: { employeeId: string }) {
  const details = useEmployeeLeaveDetails(employeeId)
  if (details.isLoading) return <p className="mt-3 text-sm text-text-faint">Loading leave details…</p>
  if (details.isError) return <p className="mt-3 text-sm text-danger">{errorText(details.error)}</p>
  const data = details.data
  if (!data) return null
  return (
    <div className="mt-4 grid grid-cols-1 gap-4 rounded-md border border-border bg-surface-alt p-3 lg:grid-cols-3">
      <div>
        <p className="mb-1 text-xs font-semibold text-text-muted">Leave balance</p>
        {data.balance.length === 0 ? (
          <p className="text-xs text-text-faint">No leave balance recorded.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {data.balance.map((b) => (
              <span key={b.leave_type_id} className="rounded-full bg-info-bg px-2 py-0.5 text-xs text-info-fg">
                {b.leave_type_name}: {num(b.days_balance)} days
              </span>
            ))}
          </div>
        )}
      </div>
      <div>
        <p className="mb-1 text-xs font-semibold text-text-muted">Pending requests</p>
        <RequestRows rows={data.pending} empty="No pending requests." />
      </div>
      <div>
        <p className="mb-1 text-xs font-semibold text-text-muted">Leave taken</p>
        <RequestRows rows={data.taken} empty="No leave taken." showStatus />
      </div>
    </div>
  )
}

function MyLeave() {
  const year = new Date().getFullYear()
  const balance = useMyLeaveBalance(year)
  const types = useLeaveTypes()
  const command = usePayrollCommand()
  const [form, setForm] = useState({ leave_type_id: '', date_start: '', date_end: '', reason: '' })
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)
  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.leave_type_id || !form.date_start || !form.date_end) return setResult({ ok: false, text: 'Leave type and dates are required.' })
    setResult(null)
    command.mutate(
      { endpoint: 'leave.php', action: 'request', params: form },
      {
        onSuccess: (msg) => {
          setForm({ leave_type_id: '', date_start: '', date_end: '', reason: '' })
          setResult({ ok: true, text: msg || 'Leave request submitted.' })
        },
        onError: (err) => setResult({ ok: false, text: errorText(err) }),
      },
    )
  }
  const rows = balance.data ?? []
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <TablePanel title={`My Leave Balance (${year})`}>
        <table className="w-full">
          <thead className="bg-surface">
            <tr>
              <Th>Leave Type</Th>
              <Th className="text-right">Entitled</Th>
              <Th className="text-right">Applied</Th>
              <Th className="text-right">Approved</Th>
              <Th className="text-right">Pending</Th>
              <Th className="text-right">Balance</Th>
            </tr>
          </thead>
          <tbody>
            {balance.isLoading && <LoadingRows cols={6} rows={2} />}
            {!balance.isLoading && rows.length === 0 && <EmptyRow colSpan={6} label="No leave types assigned to you yet." />}
            {rows.map((b) => (
              <tr key={b.leave_type_id} className="border-t border-border">
                <Td>{b.leave_type_name}</Td>
                <Td className="text-right tabular-nums">{num(b.days_entitled)}</Td>
                <Td className="text-right tabular-nums">{num(b.days_applied)}</Td>
                <Td className="text-right tabular-nums">{num(b.days_approved)}</Td>
                <Td className="text-right tabular-nums">{num(b.days_pending)}</Td>
                <Td className="text-right font-semibold tabular-nums">{num(b.days_balance)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </TablePanel>
      <PanelCard title="Request Leave">
        <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-text-muted">Type</span>
            <select value={form.leave_type_id} onChange={(e) => setForm({ ...form, leave_type_id: e.target.value })} className={`w-44 ${FIELD}`}>
              <option value="">Select Type</option>
              {(types.data ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-text-muted">Start date</span>
            <input type="date" value={form.date_start} onChange={(e) => setForm({ ...form, date_start: e.target.value })} className={FIELD} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-text-muted">End date</span>
            <input type="date" min={form.date_start || undefined} value={form.date_end} onChange={(e) => setForm({ ...form, date_end: e.target.value })} className={FIELD} />
          </label>
          <label className="flex min-w-40 flex-1 flex-col gap-1">
            <span className="text-xs font-semibold text-text-muted">Reason</span>
            <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className={FIELD} />
          </label>
          <button type="submit" disabled={command.isPending} className="inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60">
            <Send size={15} /> Submit
          </button>
        </form>
        {result && <p className={`mt-2 text-sm ${result.ok ? 'text-success' : 'text-danger'}`}>{result.text}</p>}
      </PanelCard>
    </div>
  )
}

// leave.php: the admin's "apply on behalf of" form (with the chosen employee's
// leave details), the user's own balance and request form, the approve/reject
// queue and every request — the panels the classic Manager Self-Service shows.
export function PayrollLeave() {
  const requests = useLeaveRequests()
  const pending = useLeavePendingApprovals()
  const types = useLeaveTypes()
  const employees = usePayrollEmployees()
  const action = usePayRunAction()
  const confirm = useConfirm()

  const [employeeId, setEmployeeId] = useState('')
  const [typeId, setTypeId] = useState('')
  const [from, setFrom] = useState(today())
  const [to, setTo] = useState(today())
  const [reason, setReason] = useState('')

  const apply = (event: React.FormEvent) => {
    event.preventDefault()
    action.mutate(
      { endpoint: 'leave.php', action: 'manual_request', params: { employee_id: employeeId, leave_type_id: typeId, date_start: from, date_end: to, reason } },
      { onSuccess: () => setReason('') },
    )
  }

  const review = async (id: string, decision: 'approve' | 'reject') => {
    const label = decision === 'approve' ? 'Approve' : 'Reject'
    if (!(await confirm(`${label} this leave request?`))) return
    action.mutate({ endpoint: 'leave.php', action: decision, params: { id } })
  }

  return (
    <div className="space-y-4">
      {requests.isError && <ErrorCard error={requests.error} onRetry={() => requests.refetch()} />}

      <PanelCard title="Manual Leave Application (Admin)">
        <form onSubmit={apply} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-text-muted">Employee</span>
            <select required value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="w-56 rounded-md border border-input-border bg-input-bg px-3 text-sm text-text outline-none focus:ring-2 focus:ring-brand/30">
              <option value="">Select Employee</option>
              {(employees.data ?? []).map((row) => (
                <option key={row.employee_id} value={row.employee_id}>
                  {employeeName(row)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-text-muted">Type</span>
            <select required value={typeId} onChange={(e) => setTypeId(e.target.value)} className="w-48 rounded-md border border-input-border bg-input-bg px-3 text-sm text-text outline-none focus:ring-2 focus:ring-brand/30">
              <option value="">Select Type</option>
              {(types.data ?? []).map((type) => (
                <option key={type.id} value={type.id}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-text-muted">From</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-md border border-input-border bg-input-bg px-3 text-sm text-text outline-none focus:ring-2 focus:ring-brand/30" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-text-muted">To</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-md border border-input-border bg-input-bg px-3 text-sm text-text outline-none focus:ring-2 focus:ring-brand/30" />
          </label>
          <label className="flex min-w-48 flex-1 flex-col gap-1">
            <span className="text-xs font-semibold text-text-muted">Reason</span>
            <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" className="rounded-md border border-input-border bg-input-bg px-3 text-sm text-text outline-none focus:ring-2 focus:ring-brand/30" />
          </label>
          <button type="submit" disabled={action.isPending} className="inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60">
            <Send size={15} /> Apply Leave
          </button>
          {action.isError && <p className="w-full text-sm text-danger">{action.error instanceof Error ? action.error.message : 'Request failed.'}</p>}
        </form>
        {employeeId && <EmployeeLeaveDetails employeeId={employeeId} />}
      </PanelCard>

      <MyLeave />

      <TablePanel title="Pending Approvals">
        <table className="w-full">
          <thead className="bg-surface">
            <tr>
              <Th>Employee</Th>
              <Th>Type</Th>
              <Th>Dates</Th>
              <Th className="text-right">Days</Th>
              <Th>Reason</Th>
              <Th className="text-right">&nbsp;</Th>
            </tr>
          </thead>
          <tbody>
            {pending.isLoading && <LoadingRows cols={6} />}
            {!pending.isLoading && (pending.data ?? []).length === 0 && <EmptyRow colSpan={6} label="Nothing waiting for approval." />}
            {(pending.data ?? []).map((row) => (
              <tr key={row.id} className="border-t border-border">
                <Td>{`${row.firstname ?? ''} ${row.lastname ?? ''}`.trim() || `#${row.employee_id}`}</Td>
                <Td>{row.leave_type_name ?? '—'}</Td>
                <Td className="whitespace-nowrap">{`${row.date_start} → ${row.date_end}`}</Td>
                <Td className="text-right tabular-nums">{row.days_requested}</Td>
                <Td>{row.reason || '—'}</Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-2">
                    <button type="button" disabled={action.isPending} onClick={() => review(row.id, 'approve')} className="rounded-md bg-success-bg px-2.5 py-1 text-xs font-semibold text-success-fg hover:opacity-90 disabled:opacity-60">
                      Approve
                    </button>
                    <button type="button" disabled={action.isPending} onClick={() => review(row.id, 'reject')} className="rounded-md bg-danger-bg px-2.5 py-1 text-xs font-semibold text-danger-fg hover:opacity-90 disabled:opacity-60">
                      Reject
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </TablePanel>

      <TablePanel title="All Leave Requests">
        <table className="w-full">
          <thead className="bg-surface">
            <tr>
              <Th>Employee</Th>
              <Th>Type</Th>
              <Th>Dates</Th>
              <Th className="text-right">Days</Th>
              <Th>Reason</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {requests.isLoading && <LoadingRows cols={6} />}
            {!requests.isLoading && (requests.data ?? []).length === 0 && <EmptyRow colSpan={6} label="No leave requests yet." />}
            {(requests.data ?? []).map((row) => (
              <tr key={row.id} className="border-t border-border">
                <Td>{`${row.firstname ?? ''} ${row.lastname ?? ''}`.trim() || `#${row.employee_id}`}</Td>
                <Td>{row.leave_type_name ?? '—'}</Td>
                <Td className="whitespace-nowrap">{`${row.date_start} → ${row.date_end}`}</Td>
                <Td className="text-right tabular-nums">{row.days_requested}</Td>
                <Td>{row.reason || '—'}</Td>
                <Td>
                  <StatusBadge status={row.status} />
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </TablePanel>
    </div>
  )
}
