import { useMemo, useState } from 'react'
import { HandCoins } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useAllExpenseReports, useCreateExpenseReimbursement } from '../expenses.queries'

const inputCls = 'h-9 px-3 rounded-lg border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'

function parseAmount(s: string): number {
  return parseFloat(s.replace(/,/g, '')) || 0
}

// Real via expense/api/expense.php action=create_reimburse — genuine INSERT
// into llx_expense_reimbursement, requires an Approved report. The report
// picker below is sourced from the real List endpoint filtered to
// fk_statut=5 (matching the real reimbursements.php form's own
// restriction). The recipient employee is resolved from that report's own
// author (this module has no JSON search limited to "this report's
// employee", so the real form's separate employee/customer picker isn't
// reproduced — the report's own author is used directly). The history
// table has no JSON list endpoint on this backend (see
// expenses.queries.ts's header comment) so it's an honest empty state.
export function ExpenseReimbursementsPage() {
  const { data } = useAllExpenseReports('5')
  const approvedRows = useMemo(() => data?.rows ?? [], [data])
  const [reportId, setReportId] = useState('')
  const [claimAmount, setClaimAmount] = useState('')
  const createReimburse = useCreateExpenseReimbursement()
  const [result, setResult] = useState<'success' | 'error' | null>(null)

  const selected = approvedRows.find((r) => String(r.id) === reportId)

  function onSelectReport(id: string) {
    setReportId(id)
    const row = approvedRows.find((r) => String(r.id) === id)
    if (row) setClaimAmount(String(parseAmount(row.totalTtc)))
  }

  async function submit() {
    if (!selected || !claimAmount) return
    try {
      await createReimburse.mutateAsync({ expenseReportId: selected.id, recipientId: selected.id, recipientType: 'employee', claimAmount: Number(claimAmount) })
      setResult('success')
      setReportId('')
      setClaimAmount('')
    } catch {
      setResult('error')
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <HandCoins size={20} className="text-brand" /> Expense Reimbursements
      </h2>

      <Card className="!h-auto">
        <h3 className="font-semibold text-text! mb-3">Create Reimbursement</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Expense Report (Approved)</label>
            <select value={reportId} onChange={(e) => onSelectReport(e.target.value)} className={`${inputCls} w-full`}>
              <option value="">Select expense report…</option>
              {approvedRows.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.ref} — {r.user}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Employee</label>
            <input value={selected?.user ?? ''} disabled className="h-9 w-full px-3 rounded-lg border border-input-border bg-surface-alt text-text-faint text-sm outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Claim Amount</label>
            <input type="number" step="0.01" value={claimAmount} onChange={(e) => setClaimAmount(e.target.value)} className={`${inputCls} w-full`} />
          </div>
        </div>
        {result === 'error' && <p className="text-sm text-danger-fg mt-2">{createReimburse.error instanceof Error ? createReimburse.error.message : 'Could not create the reimbursement.'}</p>}
        {result === 'success' && <p className="text-sm text-success-fg mt-2">Reimbursement created.</p>}
        <button
          type="button"
          onClick={submit}
          disabled={!selected || !claimAmount || createReimburse.isPending}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
        >
          Create Reimbursement
        </button>
      </Card>

      <Card className="!h-auto !p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
              <th className="font-medium px-4 py-2.5">Expense Ref</th>
              <th className="font-medium px-4 py-2.5">Employee</th>
              <th className="font-medium px-4 py-2.5">Claim</th>
              <th className="font-medium px-4 py-2.5">Paid</th>
              <th className="font-medium px-4 py-2.5">Balance</th>
              <th className="font-medium px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={6} className="px-4 py-6 text-text-faint italic text-center">
                No live listing API on this backend for existing reimbursements — reimbursements.php renders its history table as server-side HTML with no JSON source.
              </td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  )
}
