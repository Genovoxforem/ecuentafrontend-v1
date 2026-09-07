import { useMemo, useState } from 'react'
import { Repeat } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useAllExpenseReports, useCreateRecurringExpense } from '../expenses.queries'

const inputCls = 'h-9 px-3 rounded-lg border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'

const FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
] as const

// Real via expense/api/expense.php action=create_recurring — genuine INSERT
// into llx_expense_recurring. Confirmed by reading the whole module: no
// cron/executor anywhere ever reads next_run/auto_create to actually create
// a new expense report from a template — this saves a real row, but the
// feature is inert on this backend, same as the real recurring.php page.
// The template picker is sourced from the real List endpoint (any status,
// matching the real form's own unrestricted dropdown). The history/
// pause-resume table has no JSON list endpoint at all, so it's an honest
// empty state.
export function ExpenseRecurringPage() {
  const { data } = useAllExpenseReports()
  const rows = useMemo(() => data?.rows ?? [], [data])
  const [templateId, setTemplateId] = useState('')
  const [frequency, setFrequency] = useState<(typeof FREQUENCIES)[number]['value']>('monthly')
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')
  const [autoCreate, setAutoCreate] = useState(false)
  const createRecurring = useCreateRecurringExpense()
  const [result, setResult] = useState<'success' | 'error' | null>(null)

  async function submit() {
    if (!templateId || !dateStart) return
    try {
      await createRecurring.mutateAsync({ templateId: Number(templateId), frequency, dateStart, dateEnd: dateEnd || undefined, autoCreate })
      setResult('success')
      setTemplateId('')
      setDateStart('')
      setDateEnd('')
    } catch {
      setResult('error')
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Repeat size={20} className="text-brand" /> Recurring Expenses
      </h2>

      <Card className="!h-auto">
        <h3 className="font-semibold text-text! mb-3">Create Recurring Expense</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Template Expense Report</label>
            <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className={`${inputCls} w-full`}>
              <option value="">Select template…</option>
              {rows.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.ref} — {r.user}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Frequency</label>
            <select value={frequency} onChange={(e) => setFrequency(e.target.value as typeof frequency)} className={`${inputCls} w-full`}>
              {FREQUENCIES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Start Date</label>
            <input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} className={`${inputCls} w-full`} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">End Date</label>
            <input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} className={`${inputCls} w-full`} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Auto Create</label>
            <select value={autoCreate ? '1' : '0'} onChange={(e) => setAutoCreate(e.target.value === '1')} className={`${inputCls} w-full`}>
              <option value="0">No</option>
              <option value="1">Yes</option>
            </select>
          </div>
        </div>
        {result === 'error' && <p className="text-sm text-danger-fg mt-2">{createRecurring.error instanceof Error ? createRecurring.error.message : 'Could not create the recurring template.'}</p>}
        {result === 'success' && <p className="text-sm text-success-fg mt-2">Recurring template created. Note: this backend has no scheduler that actually acts on it.</p>}
        <button
          type="button"
          onClick={submit}
          disabled={!templateId || !dateStart || createRecurring.isPending}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
        >
          Create Recurring Expense
        </button>
      </Card>

      <Card className="!h-auto !p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
              <th className="font-medium px-4 py-2.5">Template Ref</th>
              <th className="font-medium px-4 py-2.5">Frequency</th>
              <th className="font-medium px-4 py-2.5">Start</th>
              <th className="font-medium px-4 py-2.5">End</th>
              <th className="font-medium px-4 py-2.5">Next Run</th>
              <th className="font-medium px-4 py-2.5">Active</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={6} className="px-4 py-6 text-text-faint italic text-center">
                No live listing API on this backend for existing recurring templates — recurring.php renders its table as server-side HTML with no JSON source.
              </td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  )
}
