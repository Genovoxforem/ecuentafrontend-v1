import { useState } from 'react'
import { BadgeCheck, Banknote, ChevronLeft, Clock, Download, History, Loader2, Lock, Mail, Receipt, Share2, Trash2, Unlock, Wallet } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ROUTES } from '../../../routes'
import { formatMoney } from '../../../utils/format'
import { useConfirm } from '../../../shared/components/ConfirmDialog'
import { DetailMetricRow, DetailMetricTile } from '../../../shared/components/dashboard/DashboardKit'
import { num, openPayslipPdf, periodLabel } from '../payrollV2.api'
import { useLinePayments, usePayRunLines, usePayRunPaymentStatus, usePayRuns, usePayrollCommand, usePayrollEmployees, usePostingLog, type PayslipLine } from '../payrollV2.queries'
import { EmptyRow, ErrorCard, LoadingRows, PanelCard, PayrollModal, StatusBadge, TablePanel, Td, Th } from './PayrollV2Chrome'

const money = (value: unknown) => formatMoney(num(value))
const errorText = (err: unknown) => (err instanceof Error ? err.message : 'Request failed.')
const FIELD = 'w-full rounded-md border border-input-border bg-input-bg px-3 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-brand/30'
const BTN = {
  primary: 'inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60',
  success: 'inline-flex items-center gap-1.5 rounded-md bg-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60',
  danger: 'inline-flex items-center gap-1.5 rounded-md border border-danger/40 px-4 py-2 text-sm font-medium text-danger hover:bg-danger/10 disabled:opacity-60',
  plain: 'inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover disabled:opacity-60',
}
const ROW_BTN = 'inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-text hover:bg-surface-hover disabled:opacity-60'

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'mobile_money', label: 'Mobile Money' },
]

const who = (line: { firstname: string | null; lastname: string | null; employee_id: string }) => `${line.firstname ?? ''} ${line.lastname ?? ''}`.trim() || `#${line.employee_id}`
const remainingOf = (line: PayslipLine) => num(line.net_salary) - num(line.amount_paid)

type Result = { ok: boolean; text: string } | null

function Footer({ onCancel, label, busy, result, tone = 'primary' }: { onCancel: () => void; label: string; busy: boolean; result: Result; tone?: keyof typeof BTN }) {
  return (
    <>
      {result && <p className={`mt-3 text-sm ${result.ok ? 'text-success' : 'text-danger'}`}>{result.text}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={BTN.plain}>
          Cancel
        </button>
        <button type="submit" disabled={busy} className={BTN[tone]}>
          {busy && <Loader2 size={14} className="animate-spin" />} {label}
        </button>
      </div>
    </>
  )
}

// One text field + confirm: the classic page's reject (optional reason) and unlock (required reason) prompts.
function ReasonDialog({ title, message, label, required, action, payrunId, tone, onClose }: { title: string; message: string; label: string; required: boolean; action: string; payrunId: string; tone: keyof typeof BTN; onClose: () => void }) {
  const command = usePayrollCommand()
  const [reason, setReason] = useState('')
  const [result, setResult] = useState<Result>(null)
  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (required && !reason.trim()) return setResult({ ok: false, text: 'A reason is required.' })
    command.mutate({ action, params: { payrun_id: payrunId, reason: reason.trim() } }, { onSuccess: onClose, onError: (err) => setResult({ ok: false, text: errorText(err) }) })
  }
  return (
    <PayrollModal title={title} onClose={onClose}>
      <form onSubmit={submit}>
        <p className="mb-3 text-sm text-text-muted">{message}</p>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-text-muted">{label}</span>
          <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className={FIELD} />
        </label>
        <Footer onCancel={onClose} label={title.split(' ')[0]} busy={command.isPending} result={result} tone={tone} />
      </form>
    </PayrollModal>
  )
}

function PayLineDialog({ payrunId, line, onClose }: { payrunId: string; line: PayslipLine; onClose: () => void }) {
  const command = usePayrollCommand()
  const history = useLinePayments(line.id)
  const remaining = remainingOf(line)
  const [amount, setAmount] = useState(remaining.toFixed(2))
  const [method, setMethod] = useState('bank_transfer')
  const [reference, setReference] = useState('')
  const [result, setResult] = useState<Result>(null)

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!(Number(amount) > 0)) return setResult({ ok: false, text: 'Amount and payment method are required.' })
    command.mutate(
      { action: 'process_payment', params: { payrun_id: payrunId, line_id: line.id, payment_method: method, reference, amount } },
      { onSuccess: onClose, onError: (err) => setResult({ ok: false, text: errorText(err) }) },
    )
  }

  return (
    <PayrollModal title={`Process Payment — ${who(line)}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <p className="text-sm text-text-muted">
          Net {money(line.net_salary)} · paid {money(line.amount_paid)} · <span className="font-semibold text-text">remaining {formatMoney(remaining)}</span>
        </p>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-text-muted">Amount</span>
          <input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={FIELD} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-text-muted">Payment Method</span>
          <select value={method} onChange={(e) => setMethod(e.target.value)} className={FIELD}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-text-muted">Reference (optional)</span>
          <input value={reference} onChange={(e) => setReference(e.target.value)} className={FIELD} />
        </label>
        {(history.data ?? []).length > 0 && (
          <div>
            <p className="mb-1 text-xs font-semibold text-text-muted">Earlier payments</p>
            <table className="w-full text-xs">
              <tbody>
                {(history.data ?? []).map((p) => (
                  <tr key={p.id} className="border-t border-border text-text">
                    <td className="py-1">{p.payment_date}</td>
                    <td className="capitalize">{(p.payment_method ?? '').replace(/_/g, ' ')}</td>
                    <td>{p.reference || '—'}</td>
                    <td className="text-right tabular-nums">{money(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Footer onCancel={onClose} label="Pay" busy={command.isPending} result={result} tone="success" />
      </form>
    </PayrollModal>
  )
}

function BulkPayDialog({ payrunId, lines, onClose }: { payrunId: string; lines: PayslipLine[]; onClose: () => void }) {
  const command = usePayrollCommand()
  const unpaid = lines.filter((l) => remainingOf(l) > 0.01)
  const [selected, setSelected] = useState<string[]>([])
  const [method, setMethod] = useState('bank_transfer')
  const [reference, setReference] = useState('')
  const [result, setResult] = useState<Result>(null)
  const total = unpaid.filter((l) => selected.includes(l.id)).reduce((sum, l) => sum + remainingOf(l), 0)

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!selected.length) return setResult({ ok: false, text: 'Please select at least one employee.' })
    command.mutate(
      { action: 'bulk_process_payment', params: { payrun_id: payrunId, line_ids: selected, payment_method: method, reference } },
      { onSuccess: onClose, onError: (err) => setResult({ ok: false, text: errorText(err) }) },
    )
  }

  return (
    <PayrollModal title="Bulk Salary Payment" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-text-muted">Payment Method</span>
          <select value={method} onChange={(e) => setMethod(e.target.value)} className={FIELD}>
            {PAYMENT_METHODS.slice(0, 3).map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-text-muted">Reference (optional)</span>
          <input placeholder="Batch reference" value={reference} onChange={(e) => setReference(e.target.value)} className={FIELD} />
        </label>
        <div>
          <span className="text-xs font-semibold text-text-muted">Select Employees</span>
          <div className="mt-1 max-h-56 overflow-y-auto rounded-md border border-border p-2">
            {unpaid.length === 0 ? (
              <p className="text-sm text-text-faint">Everyone in this pay run is fully paid.</p>
            ) : (
              <>
                <label className="mb-1 flex items-center gap-2 border-b border-border pb-1 text-sm font-medium text-text">
                  <input type="checkbox" checked={selected.length === unpaid.length} onChange={(e) => setSelected(e.target.checked ? unpaid.map((l) => l.id) : [])} /> Select All Unpaid/Partial
                </label>
                {unpaid.map((l) => (
                  <label key={l.id} className="flex items-center justify-between gap-2 py-0.5 text-sm text-text">
                    <span className="flex items-center gap-2">
                      <input type="checkbox" checked={selected.includes(l.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, l.id] : selected.filter((id) => id !== l.id))} />
                      {who(l)}
                    </span>
                    <span className="tabular-nums text-text-muted">{formatMoney(remainingOf(l))}</span>
                  </label>
                ))}
              </>
            )}
          </div>
          {selected.length > 0 && <p className="mt-1 text-right text-xs text-text-muted">Total: {formatMoney(total)}</p>}
        </div>
        <Footer onCancel={onClose} label="Process Payments" busy={command.isPending} result={result} />
      </form>
    </PayrollModal>
  )
}

function PostingLogDialog({ payrunId, onClose }: { payrunId: string; onClose: () => void }) {
  const log = usePostingLog(payrunId, true)
  const command = usePayrollCommand()
  const [result, setResult] = useState<Result>(null)
  const repost = () => {
    setResult(null)
    command.mutate(
      { action: 'repost_accounting', params: { payrun_id: payrunId } },
      { onSuccess: (msg) => setResult({ ok: true, text: msg || 'Reposted.' }), onError: (err) => setResult({ ok: false, text: errorText(err) }) },
    )
  }
  return (
    <PayrollModal title="Posting to Accounting — History" onClose={onClose} width="max-w-2xl">
      {log.isLoading && <p className="text-sm text-text-faint">Loading…</p>}
      {!log.isLoading && (log.data ?? []).length === 0 && <p className="text-sm text-text-faint">No posting attempts recorded yet.</p>}
      {(log.data ?? []).length > 0 && (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-text-muted">
              <th className="py-1">Date</th>
              <th>Status</th>
              <th>Expense Report</th>
              <th className="text-right">Amount</th>
              <th>By</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {(log.data ?? []).map((r) => (
              <tr key={r.id} className="border-t border-border align-top text-text">
                <td className="whitespace-nowrap py-1 pr-2">{r.posted_at}</td>
                <td className="pr-2">
                  <StatusBadge status={r.status} />
                </td>
                <td className="pr-2">{r.fk_expensereport || '—'}</td>
                <td className="pr-2 text-right tabular-nums">{money(r.total_amount)}</td>
                <td className="pr-2">{`${r.firstname ?? ''} ${r.lastname ?? ''}`.trim()}</td>
                <td>{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {result && <p className={`mt-3 text-sm ${result.ok ? 'text-success' : 'text-danger'}`}>{result.text}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" disabled={command.isPending} onClick={repost} className={BTN.plain}>
          {command.isPending && <Loader2 size={14} className="animate-spin" />} Repost to Accounting
        </button>
        <button type="button" onClick={onClose} className={BTN.primary}>
          Close
        </button>
      </div>
    </PayrollModal>
  )
}

const SHARE_TABS = [
  { key: 'email', label: 'Email' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'sms', label: 'SMS' },
] as const

function ShareDialog({ payrunId, line, period, onClose }: { payrunId: string; line: PayslipLine; period: string; onClose: () => void }) {
  const command = usePayrollCommand()
  const [tab, setTab] = useState<(typeof SHARE_TABS)[number]['key']>('email')
  const [email, setEmail] = useState({ to_email: '', subject: 'Your Payslip', body: 'Please find your payslip attached.' })
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('Your payslip is ready.')
  const [result, setResult] = useState<Result>(null)

  const send = (event: React.FormEvent) => {
    event.preventDefault()
    setResult(null)
    const base = { payrun_id: payrunId, employee_id: line.employee_id }
    const params = tab === 'email' ? { ...base, ...email } : { ...base, to_phone: phone, message }
    command.mutate(
      { endpoint: 'payslip_share.php', action: `share_${tab}`, params },
      { onSuccess: (msg) => setResult({ ok: true, text: msg || 'Sent.' }), onError: (err) => setResult({ ok: false, text: errorText(err) }) },
    )
  }

  return (
    <PayrollModal title={`Share Payslip — ${who(line)} · ${period}`} onClose={onClose}>
      <div className="mb-4 flex gap-1">
        {SHARE_TABS.map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)} className={`rounded-md px-3 py-1.5 text-sm font-medium ${tab === t.key ? 'bg-brand text-white' : 'border border-border text-text-muted hover:bg-surface-hover'}`}>
            {t.label}
          </button>
        ))}
      </div>
      <form onSubmit={send} className="space-y-3">
        {tab === 'email' ? (
          <>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-text-muted">To Email</span>
              <input required type="email" value={email.to_email} onChange={(e) => setEmail({ ...email, to_email: e.target.value })} className={FIELD} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-text-muted">Subject</span>
              <input value={email.subject} onChange={(e) => setEmail({ ...email, subject: e.target.value })} className={FIELD} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-text-muted">Message</span>
              <textarea rows={3} value={email.body} onChange={(e) => setEmail({ ...email, body: e.target.value })} className={FIELD} />
            </label>
          </>
        ) : (
          <>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-text-muted">{tab === 'whatsapp' ? 'WhatsApp Number' : 'Mobile Number'} (E.164, e.g. +260971234567)</span>
              <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={FIELD} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-text-muted">Message</span>
              <textarea rows={2} value={message} onChange={(e) => setMessage(e.target.value)} className={FIELD} />
            </label>
            <p className="text-xs text-text-faint">
              {tab === 'whatsapp' ? 'The PDF is sent as a WhatsApp document via Twilio.' : 'A secure download link (expires after the configured hours) is appended.'}
            </p>
          </>
        )}
        {result && <p className={`text-sm ${result.ok ? 'text-success' : 'text-danger'}`}>{result.text}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={BTN.plain}>
            Close
          </button>
          <button type="submit" disabled={command.isPending} className={BTN.primary}>
            {command.isPending && <Loader2 size={14} className="animate-spin" />} Send {SHARE_TABS.find((t) => t.key === tab)?.label}
          </button>
        </div>
      </form>
    </PayrollModal>
  )
}

type Dialog = { kind: 'reject' } | { kind: 'unlock' } | { kind: 'bulk' } | { kind: 'log' } | { kind: 'pay'; line: PayslipLine } | { kind: 'share'; line: PayslipLine } | null

export function PayRunDetail() {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const runs = usePayRuns()
  const lines = usePayRunLines(id)
  const payment = usePayRunPaymentStatus(id)
  const employees = usePayrollEmployees()
  const command = usePayrollCommand()
  const confirm = useConfirm()
  const [dialog, setDialog] = useState<Dialog>(null)
  const [result, setResult] = useState<Result>(null)
  const [progress, setProgress] = useState<string | null>(null)
  const [pdfBusy, setPdfBusy] = useState<string | null>(null)

  const run = (runs.data ?? []).find((r) => r.id === id)
  const status = run?.status ?? 'draft'
  const period = run ? periodLabel(run.period_month, run.period_year) : ''
  const rows = lines.data ?? []
  const stats = payment.data
  const busy = command.isPending || progress !== null

  const lifecycle = async (action: string, question: string | null, done: string) => {
    if (question && !(await confirm(question))) return
    setResult(null)
    command.mutate({ action, params: { payrun_id: id } }, { onSuccess: (msg) => setResult({ ok: true, text: msg || done }), onError: (err) => setResult({ ok: false, text: errorText(err) }) })
  }

  // payrun_calc.php computes one employee per call, so the classic page walks
  // the employee list; a failure for one employee doesn't stop the others.
  const calculateAll = async () => {
    const list = employees.data ?? []
    if (!list.length) return setResult({ ok: false, text: 'No employees to calculate.' })
    setResult(null)
    const failures: string[] = []
    for (const [i, emp] of list.entries()) {
      setProgress(`Calculating ${i + 1} of ${list.length}…`)
      try {
        await command.mutateAsync({ endpoint: 'payrun_calc.php', action: 'compute', params: { payrun_id: id, employee_id: emp.employee_id } })
      } catch (err) {
        failures.push(`${`${emp.firstname ?? ''} ${emp.lastname ?? ''}`.trim() || `#${emp.employee_id}`}: ${errorText(err)}`)
      }
    }
    setProgress(null)
    setResult(failures.length ? { ok: false, text: `Calculated ${list.length - failures.length} of ${list.length}. ${failures.slice(0, 3).join(' · ')}` } : { ok: true, text: 'Calculation complete.' })
  }

  const remove = async () => {
    if (!(await confirm({ title: 'Delete Pay Run?', message: `Delete ${run?.ref ?? 'this pay run'} and all its lines? This cannot be undone.` }))) return
    command.mutate({ action: 'delete', params: { payrun_id: id } }, { onSuccess: () => navigate(ROUTES.payrollV2PayRuns), onError: (err) => setResult({ ok: false, text: errorText(err) }) })
  }

  const emailAll = async () => {
    if (!(await confirm(`Email every payslip in ${run?.ref ?? 'this pay run'} to its employee?`))) return
    setResult(null)
    command.mutate(
      { endpoint: 'payslip_email.php', action: 'send_to_all', params: { payrun_id: id } },
      { onSuccess: (msg) => setResult({ ok: true, text: msg || 'Payslips sent.' }), onError: (err) => setResult({ ok: false, text: errorText(err) }) },
    )
  }

  const pdf = async (line: PayslipLine) => {
    setPdfBusy(line.id)
    try {
      await openPayslipPdf(id, line.employee_id)
    } catch (err) {
      setResult({ ok: false, text: errorText(err) })
    } finally {
      setPdfBusy(null)
    }
  }

  if (runs.isError) return <ErrorCard error={runs.error} onRetry={() => runs.refetch()} />
  if (!runs.isLoading && !run) {
    return (
      <PanelCard title="Pay run not found">
        <p className="text-sm text-text-muted">This pay run no longer exists.</p>
        <Link to={ROUTES.payrollV2PayRuns} className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-text hover:bg-surface-hover">
          <ChevronLeft size={15} /> Back to list
        </Link>
      </PanelCard>
    )
  }

  const canPay = status === 'approved' || status === 'posted'
  const hasPosting = status === 'approved' || status === 'posted' || status === 'locked'

  return (
    <div className="space-y-4">
      <PanelCard
        title={run ? `${run.ref} · ${period}` : 'Loading…'}
        action={
          <div className="flex items-center gap-2">
            <StatusBadge status={status} />
            <Link to={ROUTES.payrollV2PayRuns} className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-text hover:bg-surface-hover">
              Back to list
            </Link>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          {status === 'draft' && (
            <>
              <button type="button" disabled={busy} onClick={calculateAll} className={BTN.plain}>
                {progress ? <Loader2 size={14} className="animate-spin" /> : null} {progress ?? 'Calculate All Employees'}
              </button>
              <button type="button" disabled={busy} onClick={() => lifecycle('submit', 'Submit this pay run for approval?', 'Submitted.')} className={BTN.primary}>
                Submit for Approval
              </button>
            </>
          )}
          {status === 'submitted' && (
            <>
              <button type="button" disabled={busy} onClick={() => lifecycle('approve', 'Approve this pay run?', 'Approved.')} className={BTN.success}>
                Approve
              </button>
              <button type="button" disabled={busy} onClick={() => setDialog({ kind: 'reject' })} className={BTN.danger}>
                Reject to Draft
              </button>
            </>
          )}
          {status === 'approved' && (
            <button type="button" disabled={busy} onClick={() => lifecycle('post', 'Post this pay run to accounting? This cannot be undone easily.', 'Posted.')} className={BTN.primary}>
              Post to Accounting
            </button>
          )}
          {status === 'posted' && (
            <button type="button" disabled={busy} onClick={() => lifecycle('lock', 'Lock this pay period? No further changes will be possible.', 'Locked.')} className={BTN.plain}>
              <Lock size={14} /> Lock Period
            </button>
          )}
          {canPay && (
            <button type="button" disabled={busy} onClick={() => setDialog({ kind: 'bulk' })} className={BTN.success}>
              <Banknote size={14} /> Bulk Payment
            </button>
          )}
          {hasPosting && (
            <button type="button" onClick={() => setDialog({ kind: 'log' })} className={BTN.plain}>
              <History size={14} /> Posting History
            </button>
          )}
          {(status === 'posted' || status === 'locked') && (
            <button type="button" disabled={busy} onClick={emailAll} className={BTN.plain}>
              <Mail size={14} /> Email All Payslips
            </button>
          )}
          {status === 'locked' && (
            <>
              <span className="flex items-center gap-1.5 text-sm text-text-muted">
                <Lock size={15} /> This period is locked.
              </span>
              <button type="button" disabled={busy} onClick={() => setDialog({ kind: 'unlock' })} className={BTN.danger}>
                <Unlock size={14} /> Unlock
              </button>
            </>
          )}
          {(status === 'draft' || status === 'rejected') && (
            <button type="button" disabled={busy} onClick={remove} className={`${BTN.danger} ml-auto`}>
              <Trash2 size={14} /> Delete
            </button>
          )}
        </div>
        {result && <p className={`mt-2 text-sm ${result.ok ? 'text-success' : 'text-danger'}`}>{result.text}</p>}
        {stats && (
          <DetailMetricRow className="mt-4 border-t border-border pt-3">
            <DetailMetricTile label="Payslips" value={stats.total} icon={Receipt} color="violet" />
            <DetailMetricTile label="Paid" value={stats.paid} icon={BadgeCheck} color="green" />
            <DetailMetricTile label="Partial" value={stats.partial || '0'} icon={Clock} color="amber" />
            <DetailMetricTile label="Pending" value={stats.pending} icon={Clock} color="rose" />
            <DetailMetricTile label="Total" value={money(stats.total_amount)} icon={Banknote} color="blue" />
            <DetailMetricTile label="Paid Amount" value={money(stats.paid_amount)} icon={Wallet} color="cyan" />
          </DetailMetricRow>
        )}
      </PanelCard>

      <TablePanel title="Payslip Lines">
        <table className="w-full">
          <thead className="bg-surface">
            <tr>
              <Th>Employee</Th>
              <Th className="text-right">Basic</Th>
              <Th className="text-right">Gross</Th>
              <Th className="text-right">NAPSA</Th>
              <Th className="text-right">NHIMA</Th>
              <Th className="text-right">PAYE</Th>
              <Th className="text-right">Net</Th>
              <Th>Payment</Th>
              <Th>&nbsp;</Th>
            </tr>
          </thead>
          <tbody>
            {lines.isLoading && <LoadingRows cols={9} />}
            {!lines.isLoading && rows.length === 0 && <EmptyRow colSpan={9} label='No lines calculated yet. Use "Calculate All Employees" above.' />}
            {rows.map((line) => {
              const paid = line.payment_status ?? 'pending'
              return (
                <tr key={line.id} className="border-t border-border">
                  <Td>{who(line)}</Td>
                  <Td className="text-right tabular-nums">{money(line.basic_salary)}</Td>
                  <Td className="text-right tabular-nums">{money(line.gross_salary)}</Td>
                  <Td className="text-right tabular-nums">{money(line.napsa_employee)}</Td>
                  <Td className="text-right tabular-nums">{money(line.nhima_employee)}</Td>
                  <Td className="text-right tabular-nums">{money(line.paye_tax)}</Td>
                  <Td className="text-right font-semibold tabular-nums">{money(line.net_salary)}</Td>
                  <Td className="whitespace-nowrap">
                    <StatusBadge status={paid} />
                    {paid === 'partial' && <span className="ml-1 text-xs text-text-muted">({money(line.amount_paid)})</span>}
                  </Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <button type="button" disabled={pdfBusy === line.id} onClick={() => pdf(line)} className={ROW_BTN}>
                        {pdfBusy === line.id ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />} PDF
                      </button>
                      <button type="button" onClick={() => setDialog({ kind: 'share', line })} className={ROW_BTN}>
                        <Share2 size={12} /> Share
                      </button>
                      {paid !== 'paid' && canPay && remainingOf(line) > 0.01 && (
                        <button type="button" onClick={() => setDialog({ kind: 'pay', line })} className="inline-flex items-center gap-1 rounded-md bg-success px-2 py-1 text-xs font-medium text-white hover:opacity-90">
                          <Banknote size={12} /> Pay
                        </button>
                      )}
                    </div>
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </TablePanel>

      {dialog?.kind === 'reject' && (
        <ReasonDialog title="Reject Pay Run" message="This sends the pay run back to draft status." label="Reason (optional)" required={false} action="reject" payrunId={id} tone="danger" onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'unlock' && (
        <ReasonDialog title="Unlock Pay Run" message="Only administrators can unlock a pay run. The reason is recorded." label="Reason" required action="unlock" payrunId={id} tone="danger" onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'bulk' && <BulkPayDialog payrunId={id} lines={rows} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'log' && <PostingLogDialog payrunId={id} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'pay' && <PayLineDialog payrunId={id} line={dialog.line} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'share' && <ShareDialog payrunId={id} line={dialog.line} period={period} onClose={() => setDialog(null)} />}
    </div>
  )
}
