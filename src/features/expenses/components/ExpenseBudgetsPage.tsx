import { useState } from 'react'
import { PiggyBank, Info } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'

const inputCls = 'h-9 px-3 rounded-lg border border-input-border bg-surface-alt text-text-faint text-sm outline-none cursor-not-allowed'

// Design only: expense/budgets.php is a genuine page (real SELECT/INSERT/
// DELETE against llx_expense_budget), but unlike every other Expenses tab
// it has NO JSON action at all — its create/delete forms are plain PHP POST
// + redirect, gated by a real Dolibarr CSRF token minted server-side into
// the page's own HTML on load. There's no fetchable API to wire against
// without scraping that token out of a legacy page render, which this
// app's standing rule rules out. It's also not in the SPA's own real nav
// array (reachable only by direct URL even in the legacy app). Fields
// below mirror the real form exactly; every control is inert.
export function ExpenseBudgetsPage() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(String(currentYear))

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <PiggyBank size={20} className="text-brand" /> Expense Budgets
      </h2>

      <div className="flex items-start gap-2 rounded-lg border border-info-bg bg-info-bg/40 px-3 py-2 text-xs text-info-fg">
        <Info size={14} className="shrink-0 mt-0.5" />
        <p>Design only — expense/budgets.php has no JSON API (its form posts directly with a server-minted CSRF token). Every control below is inert.</p>
      </div>

      <Card className="!h-auto">
        <h3 className="font-semibold text-text! mb-3">New Budget Entry</h3>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-text-muted mb-1">Label</label>
            <input disabled placeholder="Budget label" className={`${inputCls} w-full`} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Year</label>
            <input disabled value={year} onChange={(e) => setYear(e.target.value)} className={`${inputCls} w-full`} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Month</label>
            <input disabled placeholder="1-12" className={`${inputCls} w-full`} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Budget Amount</label>
            <input disabled placeholder="0.00" className={`${inputCls} w-full`} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Department</label>
            <input disabled className={`${inputCls} w-full`} />
          </div>
        </div>
        <button type="button" disabled className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand/40 px-4 py-2 text-sm font-medium text-white cursor-not-allowed">
          Create Budget
        </button>
      </Card>

      <Card className="!h-auto !p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
              <th className="font-medium px-4 py-2.5">Label</th>
              <th className="font-medium px-4 py-2.5">Period</th>
              <th className="font-medium px-4 py-2.5">Budget Amount</th>
              <th className="font-medium px-4 py-2.5">Used Amount</th>
              <th className="font-medium px-4 py-2.5">Department</th>
              <th className="font-medium px-4 py-2.5">Branch</th>
              <th className="font-medium px-4 py-2.5">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={7} className="px-4 py-6 text-text-faint italic text-center">
                No live listing API on this backend for existing budgets — budgets.php renders its table as server-side HTML with no JSON source.
              </td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  )
}
