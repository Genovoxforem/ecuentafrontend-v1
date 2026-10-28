import { useState, type FormEvent } from 'react'
import { PiggyBank, Plus } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyErrorCard, LegacyLoadingCard } from '../../products/components/LegacyReportStates'
import { useCreateBudget, useExpenseBudgets } from '../expenseTabs.queries'
import { controlCls } from '../expenseTable'
import type { Tone } from '../expenseTabs.types'
import { Field, FormProblem } from './expenseParts'

const BAR_CLS: Record<Tone, string> = {
  danger: 'bg-danger-fg',
  warning: 'bg-warning-fg',
  success: 'bg-success-fg',
  info: 'bg-info-fg',
  primary: 'bg-brand',
  none: 'bg-brand',
}

// expense/budgets.php: the budgets of a year and how much of each is used, and a form to add one. Reads and the create go through
// expense/fapi/budgets.php (the create is a dry run until the call carries confirm: true, which this form sends). The classic page's
// delete link has no documented body on the fapi, so none is offered here.
export function ExpenseBudgetsPage() {
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [label, setLabel] = useState('')
  const [month, setMonth] = useState('')
  const [amount, setAmount] = useState('')
  const [department, setDepartment] = useState('')
  const [branch, setBranch] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const { data, isLoading, isError, error, refetch } = useExpenseBudgets(year)
  const create = useCreateBudget()

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!label.trim()) return setProblem('Enter the budget label.')
    if (!(Number(amount.replace(/,/g, '')) > 0)) return setProblem('Enter a budget amount greater than zero.')
    setProblem(null)
    try {
      await create.mutateAsync({ label, amount, year, month, department, branch })
      setLabel('')
      setAmount('')
      setMonth('')
      setDepartment('')
      setBranch('')
    } catch (err) {
      setProblem(err instanceof Error ? err.message : 'Could not add the budget.')
    }
  }

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0 overflow-x-hidden">
      <div className="sticky -top-6 z-10 -mx-6 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <PiggyBank size={20} className="text-brand" /> Expense Budgets
        </h2>
      </div>

      <div className="flex-1 flex flex-col min-h-0 -mx-6 px-6 py-4 space-y-4">
        <Card className="!h-auto">
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
              <Field label="Label *" className="md:col-span-2">
                <input value={label} onChange={(e) => setLabel(e.target.value)} className={`${controlCls} w-full`} />
              </Field>
              <Field label="Year *">
                <input value={year} onChange={(e) => setYear(e.target.value)} inputMode="numeric" className={`${controlCls} w-full`} />
              </Field>
              <Field label="Month">
                <select value={month} onChange={(e) => setMonth(e.target.value)} className={`${controlCls} w-full`}>
                  <option value="">All year</option>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={String(i + 1)}>
                      {new Date(2000, i, 1).toLocaleString('en', { month: 'short' })}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Budget Amount *">
                <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" className={`${controlCls} w-full`} />
              </Field>
              <Field label="Department">
                <input value={department} onChange={(e) => setDepartment(e.target.value)} className={`${controlCls} w-full`} />
              </Field>
              <Field label="Branch">
                <input value={branch} onChange={(e) => setBranch(e.target.value)} className={`${controlCls} w-full`} />
              </Field>
            </div>
            <FormProblem message={problem} />
            <button type="submit" disabled={create.isPending} className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50">
              <Plus size={14} /> {create.isPending ? 'Adding…' : 'Add'}
            </button>
          </form>
        </Card>

        {isLoading && <LegacyLoadingCard label="Loading budgets…" />}
        {isError && <LegacyErrorCard title="Couldn't load the budgets" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

        {data && (
          <Card className="!p-0 overflow-hidden flex-1 min-h-0">
            <div className="flex-1 min-h-0 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                    <th className="font-medium px-4 py-2.5">Label</th>
                    <th className="font-medium px-4 py-2.5">Period</th>
                    <th className="font-medium px-4 py-2.5">Department</th>
                    <th className="font-medium px-4 py-2.5">Branch</th>
                    <th className="font-medium px-4 py-2.5 text-right">Budget</th>
                    <th className="font-medium px-4 py-2.5 text-right">Used</th>
                    <th className="font-medium px-4 py-2.5">Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-text-faint italic text-center">
                        No budgets for {data.year}.
                      </td>
                    </tr>
                  ) : (
                    data.rows.map((b) => (
                      <tr key={b.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-2 text-text!">{b.label}</td>
                        <td className="px-4 py-2 text-text-muted">{b.period}</td>
                        <td className="px-4 py-2 text-text-muted">{b.department || '-'}</td>
                        <td className="px-4 py-2 text-text-muted">{b.branch || '-'}</td>
                        <td className="px-4 py-2 text-right text-text-muted">{b.budget}</td>
                        <td className="px-4 py-2 text-right text-text-muted">{b.used}</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-28 overflow-hidden rounded-full bg-neutral-bg">
                              <div className={`h-full ${BAR_CLS[b.tone]}`} style={{ width: `${Math.min(100, Math.max(0, b.pct))}%` }} />
                            </div>
                            <span className="text-xs text-text-muted">{b.pct}%</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
