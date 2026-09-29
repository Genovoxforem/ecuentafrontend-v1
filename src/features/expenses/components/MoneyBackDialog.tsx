import { useState } from 'react'
import { Undo2, X } from 'lucide-react'
import type { UseMutationResult } from '@tanstack/react-query'
import { usePaymentTypes } from '../expenses.queries'
import type { MoneyBackInput } from '../expenseTabs.queries'
import type { FormOption } from '../expensePagesParser'
import { controlCls } from '../expenseTable'

const labelCls = 'mb-1 block text-xs font-medium text-text-muted'

// "Record money returned by the employee" — the backend's Repay Advance and Collect Repayment Return dialogs
// (same fields, different record): what came back, how, into which bank account.
export function MoneyBackDialog({
  title,
  id,
  facts,
  balance,
  method: defaultMethod = '',
  banks,
  mutation,
  onClose,
}: {
  title: string
  id: string
  // Read-only lines at the top (reference, employee, outstanding balance).
  facts: { label: string; value: string }[]
  balance: number
  method?: string
  banks: FormOption[]
  mutation: UseMutationResult<void, Error, MoneyBackInput>
  onClose: () => void
}) {
  const { data: paymentTypes } = usePaymentTypes()
  const [amount, setAmount] = useState(String(balance))
  const [method, setMethod] = useState(defaultMethod === 'cash' ? '' : defaultMethod)
  const [accountId, setAccountId] = useState('')
  const [numPayment, setNumPayment] = useState('')
  const [note, setNote] = useState('')
  const [problem, setProblem] = useState<string | null>(null)

  async function submit() {
    const value = Number(amount)
    if (!(value > 0)) return setProblem('Enter the amount being returned.')
    if (value > balance + 0.01) return setProblem(`The amount cannot be more than the outstanding balance (${balance.toFixed(2)}).`)
    if (!accountId) return setProblem('Select the bank account.')
    setProblem(null)
    try {
      await mutation.mutateAsync({ id, amount, method, accountId, numPayment, note })
      onClose()
    } catch {
      // The refusal is shown below.
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-md space-y-3 overflow-y-auto rounded-xl border border-border bg-surface p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-semibold text-text!">
            <Undo2 size={16} /> {title}
          </h3>
          <button type="button" onClick={onClose} className="text-text-faint hover:text-text" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {facts.map((f) => (
          <label key={f.label} className="block">
            <span className={labelCls}>{f.label}</span>
            <input value={f.value} readOnly className={`${controlCls} w-full opacity-70`} />
          </label>
        ))}
        <label className="block">
          <span className={labelCls}>
            Amount Being Returned <span className="text-danger-fg">*</span>
          </span>
          <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} className={`${controlCls} w-full`} />
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>Method</span>
            <select value={method} onChange={(e) => setMethod(e.target.value)} className={`${controlCls} w-full`}>
              <option value="">Select Payment Mode</option>
              {paymentTypes?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.text}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>
              Bank Account <span className="text-danger-fg">*</span>
            </span>
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={`${controlCls} w-full`}>
              {banks.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block">
          <span className={labelCls}>Payment Number (optional)</span>
          <input value={numPayment} onChange={(e) => setNumPayment(e.target.value)} className={`${controlCls} w-full`} />
        </label>
        <label className="block">
          <span className={labelCls}>Note (optional)</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-input-border bg-input-bg px-3 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-brand/30"
          />
        </label>
        {(problem || mutation.isError) && (
          <p role="alert" className="text-sm text-danger-fg">
            {problem ?? (mutation.error instanceof Error ? mutation.error.message : 'Could not record the return.')}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-input-border px-4 py-1.5 text-sm font-medium text-text-muted hover:bg-surface-hover">
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={mutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-4 py-1.5 text-sm font-medium text-black hover:bg-amber-400 disabled:opacity-60"
          >
            <Undo2 size={14} /> {mutation.isPending ? 'Recording…' : 'Record Return'}
          </button>
        </div>
      </div>
    </div>
  )
}
