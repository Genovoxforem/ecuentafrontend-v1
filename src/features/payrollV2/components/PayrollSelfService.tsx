import { useState } from 'react'
import { Download, LogIn, LogOut, Loader2, Send } from 'lucide-react'
import { formatMoney } from '../../../utils/format'
import { num, openPayslipPdf, periodLabel } from '../payrollV2.api'
import { useMyAttendanceToday, useMyLeaveBalance, useMyPayslips, usePayRunAction } from '../payrollV2.queries'
import { EmptyRow, ErrorCard, LoadingRows, PanelCard, StatusBadge, TablePanel, Td, Th } from './PayrollV2Chrome'

const FIELD = 'rounded-md border border-input-border bg-input-bg px-3 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-brand/30'
const PRIMARY = 'inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60'

const hhmm = (value: string | null | undefined) => (value ? value.slice(11, 16) : '')

function Feedback({ result }: { result: { ok: boolean; text: string } | null }) {
  if (!result) return null
  return <p className={`mt-2 text-sm ${result.ok ? 'text-success' : 'text-danger'}`}>{result.text}</p>
}

const errorText = (err: unknown) => (err instanceof Error ? err.message : 'Request failed.')

// payroll_v2/ess.php: the signed-in employee's own attendance, leave balance,
// leave / advance requests and payslips. The classic page builds these in PHP;
// here each comes from the matching JSON action (attendance today, leave
// balance, payslip list) and the writes go to the same verbs its buttons call.
export function PayrollSelfService() {
  const fiscalYear = new Date().getFullYear()
  const today = useMyAttendanceToday()
  const balance = useMyLeaveBalance(fiscalYear)
  const payslips = useMyPayslips()
  const clock = usePayRunAction()
  const leave = usePayRunAction()
  const advance = usePayRunAction()

  const [clockResult, setClockResult] = useState<{ ok: boolean; text: string } | null>(null)
  const [leaveResult, setLeaveResult] = useState<{ ok: boolean; text: string } | null>(null)
  const [advanceResult, setAdvanceResult] = useState<{ ok: boolean; text: string } | null>(null)
  const [leaveType, setLeaveType] = useState('')
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')
  const [leaveReason, setLeaveReason] = useState('')
  const [amount, setAmount] = useState('')
  const [advanceReason, setAdvanceReason] = useState('')
  const [pdfBusy, setPdfBusy] = useState<string | null>(null)
  const [pdfError, setPdfError] = useState<string | null>(null)

  const balances = balance.data ?? []
  const record = today.data

  const clockAction = (verb: 'clock_in' | 'clock_out') => {
    setClockResult(null)
    clock.mutate(
      { endpoint: 'attendance.php', action: verb },
      {
        onSuccess: () => setClockResult({ ok: true, text: verb === 'clock_in' ? 'Clocked in.' : 'Clocked out.' }),
        onError: (err) => setClockResult({ ok: false, text: errorText(err) }),
      },
    )
  }

  const submitLeave = (event: React.FormEvent) => {
    event.preventDefault()
    setLeaveResult(null)
    const typeId = leaveType || balances[0]?.leave_type_id
    if (!typeId) return setLeaveResult({ ok: false, text: 'No leave type is assigned to you yet.' })
    if (!dateStart || !dateEnd) return setLeaveResult({ ok: false, text: 'Start and end dates are required.' })
    leave.mutate(
      { endpoint: 'leave.php', action: 'request', params: { leave_type_id: typeId, date_start: dateStart, date_end: dateEnd, reason: leaveReason } },
      {
        onSuccess: () => {
          setLeaveResult({ ok: true, text: 'Leave request submitted.' })
          setDateStart('')
          setDateEnd('')
          setLeaveReason('')
        },
        onError: (err) => setLeaveResult({ ok: false, text: errorText(err) }),
      },
    )
  }

  const submitAdvance = (event: React.FormEvent) => {
    event.preventDefault()
    setAdvanceResult(null)
    if (!(Number(amount) > 0)) return setAdvanceResult({ ok: false, text: 'Enter a valid amount.' })
    advance.mutate(
      { endpoint: 'advance.php', action: 'request_advance', params: { amount, reason: advanceReason } },
      {
        onSuccess: () => {
          setAdvanceResult({ ok: true, text: 'Advance request submitted.' })
          setAmount('')
          setAdvanceReason('')
        },
        onError: (err) => setAdvanceResult({ ok: false, text: errorText(err) }),
      },
    )
  }

  const downloadPdf = async (payrunId: string) => {
    setPdfError(null)
    setPdfBusy(payrunId)
    try {
      await openPayslipPdf(payrunId)
    } catch (err) {
      setPdfError(errorText(err))
    } finally {
      setPdfBusy(null)
    }
  }

  return (
    <div className="space-y-4">
      {today.isError && <ErrorCard error={today.error} onRetry={() => today.refetch()} />}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PanelCard title="Attendance">
          {today.isLoading ? (
            <p className="text-sm text-text-faint">Loading…</p>
          ) : record?.clock_in && record.clock_out ? (
            <p className="text-sm text-text-muted">
              Today: clocked in at {hhmm(record.clock_in)}, clocked out at {hhmm(record.clock_out)}.
            </p>
          ) : record?.clock_in ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-text-muted">Clocked in at {hhmm(record.clock_in)}.</p>
              <button type="button" disabled={clock.isPending} onClick={() => clockAction('clock_out')} className="inline-flex items-center gap-1.5 rounded-md bg-danger px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">
                {clock.isPending ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />} Clock Out
              </button>
            </div>
          ) : (
            <button type="button" disabled={clock.isPending} onClick={() => clockAction('clock_in')} className="inline-flex items-center gap-1.5 rounded-md bg-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">
              {clock.isPending ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />} Clock In
            </button>
          )}
          <Feedback result={clockResult} />
        </PanelCard>

        <TablePanel title={`Leave Balance (${fiscalYear})`}>
          <table className="w-full">
            <thead className="bg-surface">
              <tr>
                <Th>Leave Type</Th>
                <Th className="text-right">Entitled</Th>
                <Th className="text-right">Taken</Th>
                <Th className="text-right">Pending</Th>
                <Th className="text-right">Balance</Th>
              </tr>
            </thead>
            <tbody>
              {balance.isLoading && <LoadingRows cols={5} rows={2} />}
              {balance.isError && <EmptyRow colSpan={5} label={errorText(balance.error)} />}
              {!balance.isLoading && !balance.isError && balances.length === 0 && <EmptyRow colSpan={5} label="No leave types assigned yet." />}
              {balances.map((row) => (
                <tr key={row.leave_type_id} className="border-t border-border">
                  <Td>{row.leave_type_name ?? `#${row.leave_type_id}`}</Td>
                  <Td className="text-right tabular-nums">{num(row.days_entitled)}</Td>
                  <Td className="text-right tabular-nums">{num(row.days_approved)}</Td>
                  <Td className="text-right tabular-nums">{num(row.days_pending)}</Td>
                  <Td className="text-right font-semibold tabular-nums">{num(row.days_balance)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </TablePanel>
      </div>

      <PanelCard title="Request Leave">
        <form onSubmit={submitLeave} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-text-muted">Leave type</span>
            <select value={leaveType || balances[0]?.leave_type_id || ''} onChange={(e) => setLeaveType(e.target.value)} className={`min-w-44 ${FIELD}`}>
              {balances.length === 0 && <option value="">No leave types assigned</option>}
              {balances.map((row) => (
                <option key={row.leave_type_id} value={row.leave_type_id}>
                  {row.leave_type_name ?? `#${row.leave_type_id}`}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-text-muted">Start date</span>
            <input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} className={FIELD} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-text-muted">End date</span>
            <input type="date" min={dateStart || undefined} value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} className={FIELD} />
          </label>
          <label className="flex min-w-48 flex-1 flex-col gap-1">
            <span className="text-xs font-semibold text-text-muted">Reason</span>
            <input type="text" value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} className={FIELD} />
          </label>
          <button type="submit" disabled={leave.isPending} className={PRIMARY}>
            {leave.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Submit
          </button>
        </form>
        <Feedback result={leaveResult} />
      </PanelCard>

      <PanelCard title="Request Salary Advance">
        <form onSubmit={submitAdvance} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-text-muted">Amount</span>
            <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={`w-40 ${FIELD}`} />
          </label>
          <label className="flex min-w-48 flex-1 flex-col gap-1">
            <span className="text-xs font-semibold text-text-muted">Reason</span>
            <input type="text" value={advanceReason} onChange={(e) => setAdvanceReason(e.target.value)} className={FIELD} />
          </label>
          <button type="submit" disabled={advance.isPending} className={PRIMARY}>
            {advance.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Submit
          </button>
        </form>
        <Feedback result={advanceResult} />
      </PanelCard>

      <TablePanel title="My Payslips">
        {pdfError && <p className="px-4 pt-3 text-sm text-danger">{pdfError}</p>}
        <table className="w-full">
          <thead className="bg-surface">
            <tr>
              <Th>Period</Th>
              <Th className="text-right">Gross</Th>
              <Th className="text-right">Net</Th>
              <Th>Status</Th>
              <Th className="text-right">Action</Th>
            </tr>
          </thead>
          <tbody>
            {payslips.isLoading && <LoadingRows cols={5} />}
            {payslips.isError && <EmptyRow colSpan={5} label={errorText(payslips.error)} />}
            {!payslips.isLoading && !payslips.isError && (payslips.data ?? []).length === 0 && <EmptyRow colSpan={5} label="No payslips available yet." />}
            {(payslips.data ?? []).map((row) => (
              <tr key={row.id} className="border-t border-border">
                <Td>{periodLabel(row.period_month, row.period_year)}</Td>
                <Td className="text-right tabular-nums">{formatMoney(num(row.gross_salary))}</Td>
                <Td className="text-right font-semibold tabular-nums">{formatMoney(num(row.net_salary))}</Td>
                <Td>
                  <StatusBadge status={row.status} />
                </Td>
                <Td className="text-right">
                  <button
                    type="button"
                    disabled={pdfBusy === row.payrun_id}
                    onClick={() => downloadPdf(row.payrun_id)}
                    className="inline-flex items-center gap-1 rounded-md bg-brand px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-hover disabled:opacity-60"
                  >
                    {pdfBusy === row.payrun_id ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />} PDF
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </TablePanel>
    </div>
  )
}
