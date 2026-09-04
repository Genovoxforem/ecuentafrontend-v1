import { useMemo, useState } from 'react'
import { Undo2 } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useAllExpenseReports, useCreateExpenseRepayment } from '../expenses.queries'

const inputCls = 'h-9 px-3 rounded-lg border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'

const METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'salary', label: 'Salary deduction' },
] as const

// Real via expense/api/expense.php action=create_repayment — writes
// advance_amount/repay_method/repay_settled directly onto llx_expensereport
// (confirmed: no separate repayment table is used in practice, despite an
// installer method for one existing as dead code). The report picker is
// sourced from the real List endpoint (any status, matching the real
// repayments.php form's own unrestricted template dropdown). "Approve"
// needs to read repay_status off existing rows, which this backend's real
// List endpoint doesn't expose — so the history table/approve action is an
// honest empty/disabled state rather than scraped or invented.
export function ExpenseRepaymentsPage() {
  const { data } = useAllExpenseReports()
  const rows = useMemo(() => data?.rows ?? [], [data])
  const [reportId, setReportId] = useState('')
  const [advanceAmount, setAdvanceAmount] = useState('')
  const [method, setMethod] = useState<(typeof METHODS)[number]['value']>('cash')
  const createRepayment = useCreateExpenseRepayment()
  const [result, setResult] = useState<'success' | 'error' | null>(null)

  const selected = rows.find((r) => String(r.id) === reportId)

  async function submit() {
    if (!selected || !advanceAmount) return
    try {
      await createRepayment.mutateAsync({ expenseReportId: selected.id, advanceAmount: Number(advanceAmount), method })
      setResult('success')
      setReportId('')
      setAdvanceAmount('')
    } catch {
      setResult('error')
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Undo2 size={20} className="text-brand" /> Expense Repayments
      </h2>

      <Card className="!h-auto">
        <h3 className="font-semibold text-text! mb-3">Create Repayment</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Expense Report</label>
            <select value={reportId} onChange={(e) => setReportId(e.target.value)} className={`${inputCls} w-full`}>
              <option value="">Select expense report…</option>
              {rows.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.ref} — {r.user}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Expense Amount</label>
            <input value={selected?.totalTtc ?? ''} disabled className="h-9 w-full px-3 rounded-lg border border-input-border bg-surface-alt text-text-faint text-sm outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Advance Amount</label>
            <input type="number" step="0.01" value={advanceAmount} onChange={(e) => setAdvanceAmount(e.target.value)} className={`${inputCls} w-full`} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Method</label>
            <select value={method} onChange={(e) => setMethod(e.target.value as typeof method)} className={`${inputCls} w-full`}>
              {METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {result === 'error' && <p className="text-sm text-danger-fg mt-2">{createRepayment.error instanceof Error ? createRepayment.error.message : 'Could not save the repayment.'}</p>}
        {result === 'success' && <p className="text-sm text-success-fg mt-2">Repayment saved — it must be approved before it appears on the Payments tab for collection.</p>}
        <button
          type="button"
          onClick={submit}
          disabled={!selected || !advanceAmount || createRepayment.isPending}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
        >
          Create Repayment
        </button>
      </Card>

      <Card className="!h-auto !p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
              <th className="font-medium px-4 py-2.5">Expense Ref</th>
              <th className="font-medium px-4 py-2.5">Advance</th>
              <th className="font-medium px-4 py-2.5">Expense</th>
              <th className="font-medium px-4 py-2.5">Method</th>
              <th className="font-medium px-4 py-2.5">Status</th>
              <th className="font-medium px-4 py-2.5">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={6} className="px-4 py-6 text-text-faint italic text-center">
                No live listing API on this backend for existing repayments — repayments.php renders its history table as server-side HTML with no JSON source, so Approve can&apos;t be offered here either.
              </td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  )
}
