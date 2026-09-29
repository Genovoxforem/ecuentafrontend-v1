import { useState } from 'react'
import { Banknote, X } from 'lucide-react'
import { useBankAccounts, useCreateExpensePayment, usePaymentTypes } from '../expenses.queries'
import { controlCls } from '../expenseTable'

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const field = 'block'
const labelCls = 'mb-1 block text-xs font-medium text-text-muted'

// The backend's "Record Payment" dialog (expense/payments.php): what to pay, when, how, and from which
// bank account. Posts expense/api/expense.php action=create_payment.
export function ExpensePayDialog({ id, refLabel, payable, onClose }: { id: string; refLabel: string; payable: number; onClose: () => void }) {
  const [amountText, setAmountText] = useState(String(payable))
  const [date, setDate] = useState(() => iso(new Date()))
  const [fkTypePayment, setFkTypePayment] = useState('')
  const [accountId, setAccountId] = useState('')
  const [numPayment, setNumPayment] = useState('')
  const [note, setNote] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const { data: paymentTypes } = usePaymentTypes()
  const { data: bankAccounts } = useBankAccounts()
  const createPayment = useCreateExpensePayment()

  async function submit() {
    const value = Number(amountText)
    if (!(value > 0)) return setProblem('Enter the amount to pay.')
    if (value > payable + 0.01) return setProblem(`The amount cannot be more than what is still payable (${payable.toFixed(2)}).`)
    if (!fkTypePayment) return setProblem('Select the payment type.')
    if (!accountId) return setProblem('Select the bank account to debit.')
    setProblem(null)
    try {
      await createPayment.mutateAsync({ id: Number(id), amount: value, fkTypePayment, accountId: Number(accountId), date, numPayment, notePublic: note })
      onClose()
    } catch {
      // The refusal is shown in the dialog (createPayment.error).
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg space-y-4 rounded-xl border border-border bg-surface p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-semibold text-text!">
            <Banknote size={18} /> Record Payment
          </h3>
          <button type="button" onClick={onClose} className="text-text-faint hover:text-text" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <label className={field}>
          <span className={labelCls}>Expense Report</span>
          <input value={refLabel} readOnly className={`${controlCls} w-full opacity-70`} />
        </label>
        <label className={field}>
          <span className={labelCls}>Amount to Pay</span>
          <input type="number" step="0.01" min="0" value={amountText} onChange={(e) => setAmountText(e.target.value)} className={`${controlCls} w-full`} />
        </label>
        <label className={field}>
          <span className={labelCls}>Payment Date</span>
          <div className="flex gap-2">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${controlCls} flex-1`} />
            <button type="button" onClick={() => setDate(iso(new Date()))} className="h-9 rounded-md border border-input-border px-3 text-sm text-text hover:bg-surface-hover">
              Now
            </button>
          </div>
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className={field}>
            <span className={labelCls}>
              Payment Type <span className="text-danger-fg">*</span>
            </span>
            <select value={fkTypePayment} onChange={(e) => setFkTypePayment(e.target.value)} className={`${controlCls} w-full`}>
              <option value="">Select Payment Mode</option>
              {paymentTypes?.map((pt) => (
                <option key={pt.id} value={pt.id}>
                  {pt.text}
                </option>
              ))}
            </select>
          </label>
          <label className={field}>
            <span className={labelCls}>
              AccountToDebit <span className="text-danger-fg">*</span>
            </span>
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={`${controlCls} w-full`}>
              <option value="">Select Bank Account</option>
              {bankAccounts?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.text}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className={field}>
          <span className={labelCls}>Payment Number (optional)</span>
          <input value={numPayment} onChange={(e) => setNumPayment(e.target.value)} className={`${controlCls} w-full`} />
        </label>
        <label className={field}>
          <span className={labelCls}>Note (optional)</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-input-border bg-input-bg px-3 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-brand/30"
          />
        </label>
        {(problem || createPayment.isError) && (
          <p role="alert" className="text-sm text-danger-fg">
            {problem ?? (createPayment.error instanceof Error ? createPayment.error.message : 'Could not record the payment.')}
          </p>
        )}
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-input-border px-4 py-2 text-sm font-medium text-text-muted hover:bg-surface-hover">
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={createPayment.isPending}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {createPayment.isPending ? 'Recording…' : 'Record Payment'}
          </button>
        </div>
      </div>
    </div>
  )
}
