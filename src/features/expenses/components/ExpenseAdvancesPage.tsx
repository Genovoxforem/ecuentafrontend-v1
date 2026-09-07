import { useState } from 'react'
import { Wallet, Search } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useEntitySearch, useCreateExpenseAdvance, type EntityOption } from '../expenses.queries'

const METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'salary', label: 'Salary deduction' },
] as const

const inputCls = 'h-9 px-3 rounded-lg border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'

// Real via expense/api/expense.php action=create_advance — a genuine INSERT
// into llx_expense_advance. This module has no JSON list endpoint for
// existing advances at all (advances.php renders its own history table as
// server-side HTML) — see expenses.queries.ts's header comment — so the
// history table below is an honest empty state instead of scraped/invented
// data, and the "Reconcile" workflow (which needs to pick from that same
// unreachable list) isn't offered here.
export function ExpenseAdvancesPage() {
  const [query, setQuery] = useState('')
  const [employee, setEmployee] = useState<EntityOption | null>(null)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<(typeof METHODS)[number]['value']>('cash')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('')
  const { data: options } = useEntitySearch('user', query, query.length > 0)
  const createAdvance = useCreateExpenseAdvance()
  const [result, setResult] = useState<'success' | 'error' | null>(null)

  async function submit() {
    if (!employee || !amount) return
    try {
      await createAdvance.mutateAsync({ userId: employee.id, amount: Number(amount), method, date, note })
      setResult('success')
      setEmployee(null)
      setQuery('')
      setAmount('')
      setNote('')
    } catch {
      setResult('error')
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Wallet size={20} className="text-brand" /> Expense Advances
      </h2>

      <Card className="!h-auto">
        <h3 className="font-semibold text-text! mb-3">Create Advance Payment</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div className="md:col-span-2 relative">
            <label className="block text-xs font-medium text-text-muted mb-1">Employee</label>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint" />
              <input
                value={employee ? employee.text : query}
                onChange={(e) => {
                  setEmployee(null)
                  setQuery(e.target.value)
                }}
                placeholder="Search employee…"
                className={`${inputCls} w-full pl-7`}
              />
            </div>
            {!employee && query && options && options.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-surface shadow-lg max-h-48 overflow-y-auto">
                {options.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => {
                      setEmployee(o)
                      setQuery('')
                    }}
                    className="block w-full text-left px-3 py-1.5 text-sm text-text hover:bg-surface-hover"
                  >
                    {o.text}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Amount</label>
            <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={`${inputCls} w-full`} />
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
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${inputCls} w-full`} />
          </div>
        </div>
        <div className="mt-3">
          <label className="block text-xs font-medium text-text-muted mb-1">Note (optional)</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} className={`${inputCls} w-full`} />
        </div>
        {result === 'error' && <p className="text-sm text-danger-fg mt-2">{createAdvance.error instanceof Error ? createAdvance.error.message : 'Could not create the advance payment.'}</p>}
        {result === 'success' && <p className="text-sm text-success-fg mt-2">Advance payment created.</p>}
        <button
          type="button"
          onClick={submit}
          disabled={!employee || !amount || createAdvance.isPending}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
        >
          Create Advance
        </button>
      </Card>

      <Card className="!h-auto !p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
              <th className="font-medium px-4 py-2.5">Employee</th>
              <th className="font-medium px-4 py-2.5">Amount</th>
              <th className="font-medium px-4 py-2.5">Method</th>
              <th className="font-medium px-4 py-2.5">Date</th>
              <th className="font-medium px-4 py-2.5">Status</th>
              <th className="font-medium px-4 py-2.5">Reconciled To</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={6} className="px-4 py-6 text-text-faint italic text-center">
                No live listing API on this backend for existing advances — advances.php renders its history table as server-side HTML with no JSON source.
              </td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  )
}
