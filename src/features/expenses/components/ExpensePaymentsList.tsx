import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CreditCard, X, Info } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useAllExpenseReports, useCreateExpensePayment, usePaymentTypes, useBankAccounts, type ExpenseReportRow } from '../expenses.queries'
import { ROUTES } from '../../../routes'

function parseAmount(s: string): number {
  return parseFloat(s.replace(/,/g, '')) || 0
}

function PayModal({ row, onClose }: { row: ExpenseReportRow; onClose: () => void }) {
  const amountDue = parseAmount(row.totalTtc)
  const [amount, setAmount] = useState(String(amountDue))
  const [fkTypePayment, setFkTypePayment] = useState('')
  const [accountId, setAccountId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [numPayment, setNumPayment] = useState('')
  const { data: paymentTypes } = usePaymentTypes()
  const { data: bankAccounts } = useBankAccounts()
  const createPayment = useCreateExpensePayment()

  async function submit() {
    await createPayment.mutateAsync({
      id: row.id,
      amount: Number(amount),
      fkTypePayment,
      accountId: accountId ? Number(accountId) : undefined,
      date,
      numPayment,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface rounded-xl border border-border w-full max-w-md p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-text!">Pay {row.ref}</h3>
          <button type="button" onClick={onClose} className="text-text-faint hover:text-text">
            <X size={18} />
          </button>
        </div>
        <label className="block">
          <span className="block text-xs font-medium text-text-muted mb-1">Amount</span>
          <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-input-border bg-input-bg text-text text-sm outline-none" />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-text-muted mb-1">Payment date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-input-border bg-input-bg text-text text-sm outline-none" />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-text-muted mb-1">Payment mode</span>
          <select value={fkTypePayment} onChange={(e) => setFkTypePayment(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-input-border bg-input-bg text-text text-sm outline-none">
            <option value="">Select…</option>
            {paymentTypes?.map((pt) => (
              <option key={pt.id} value={pt.id}>
                {pt.text}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-text-muted mb-1">Bank account</span>
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-input-border bg-input-bg text-text text-sm outline-none">
            <option value="">Select…</option>
            {bankAccounts?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.text}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-text-muted mb-1">Payment reference (optional)</span>
          <input value={numPayment} onChange={(e) => setNumPayment(e.target.value)} className="w-full h-9 px-3 rounded-lg border border-input-border bg-input-bg text-text text-sm outline-none" />
        </label>
        {createPayment.isError && <p className="text-sm text-danger-fg">{createPayment.error instanceof Error ? createPayment.error.message : 'Could not record the payment.'}</p>}
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-input-border px-4 py-2 text-sm font-medium text-text-muted hover:bg-surface-hover">
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={createPayment.isPending || !amount || !fkTypePayment}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
          >
            Pay {formatAmount(amount)}
          </button>
        </div>
      </div>
    </div>
  )
}

function formatAmount(v: string) {
  const n = Number(v)
  return Number.isFinite(n) ? n.toFixed(2) : v
}

// Real via expense/ajax/expense_list.php filtered to fk_statut=5 ("Approved"),
// narrowed client-side to unpaid rows — the real payments.php page's own
// list has no JSON of its own. The real reference query also treats
// fk_statut=3 as payable, a status code never actually populated in
// practice (see expenses.queries.ts's header comment), so it's not fetched
// here. Net Payable in the real page nets out already-recorded advances/
// reimbursements (llx_expense_advance / llx_expense_reimbursement), which
// have no JSON read endpoint at all — so this shows the full unpaid Total
// TTC instead of a netted figure, flagged below rather than silently
// approximated. Pay is genuinely real (action=create_payment).
export function ExpensePaymentsList() {
  const { data, isLoading, isError, error, refetch } = useAllExpenseReports('5')
  const rows = useMemo(() => (data?.rows ?? []).filter((r) => !r.paid), [data])
  const [paying, setPaying] = useState<ExpenseReportRow | null>(null)

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <CreditCard size={20} className="text-brand" /> Expense Payments
      </h2>

      <div className="flex items-start gap-2 rounded-lg border border-info-bg bg-info-bg/40 px-3 py-2 text-xs text-info-fg">
        <Info size={14} className="shrink-0 mt-0.5" />
        <p>Net Payable shows the full unpaid Total TTC. This backend has no JSON API for advances/reimbursements already applied to a report, so those can&apos;t be netted out here.</p>
      </div>

      {isLoading && <LegacyLoadingCard label="Loading payments…" />}
      {isError && <LegacyErrorCard title="Couldn't load payments" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {data && (
        <Card className="!h-auto !p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                <th className="font-medium px-4 py-2.5">Ref</th>
                <th className="font-medium px-4 py-2.5">Employee</th>
                <th className="font-medium px-4 py-2.5">Period</th>
                <th className="font-medium px-4 py-2.5 text-right">Total TTC</th>
                <th className="font-medium px-4 py-2.5 text-right">Net Payable</th>
                <th className="font-medium px-4 py-2.5">Status</th>
                <th className="font-medium px-4 py-2.5">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-text-faint italic text-center">
                    No approved expense reports awaiting payment.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5">
                      <Link to={ROUTES.expenseReportDetail.replace(':id', String(r.id))} className="text-brand hover:underline">
                        {r.ref}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-text-muted">{r.user}</td>
                    <td className="px-4 py-2.5 text-text-muted whitespace-nowrap">
                      {r.dateStart} – {r.dateEnd}
                    </td>
                    <td className="px-4 py-2.5 text-right text-text-muted">{r.totalTtc}</td>
                    <td className="px-4 py-2.5 text-right text-text!">{r.totalTtc}</td>
                    <td className="px-4 py-2.5">
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-success-bg text-success-fg">{r.status}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <button type="button" onClick={() => setPaying(r)} className="rounded-md bg-brand px-3 py-1 text-xs font-medium text-white hover:bg-brand-hover">
                        Pay {r.totalTtc}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      )}

      {paying && <PayModal row={paying} onClose={() => setPaying(null)} />}
    </div>
  )
}
