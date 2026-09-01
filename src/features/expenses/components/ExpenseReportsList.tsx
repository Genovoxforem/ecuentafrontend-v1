import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Receipt, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useExpenseReportsList, type ExpenseListFilters } from '../expenses.queries'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { ROUTES } from '../../../routes'

const PAGE_SIZE = 20
const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const selectCls = inputCls + ' appearance-none'

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: '0', label: 'Draft' },
  { value: '2', label: 'Submitted' },
  { value: '5', label: 'Approved' },
  { value: '6', label: 'Paid' },
  { value: '4', label: 'Cancelled' },
  { value: '99', label: 'Refused' },
]

const STATUS_BADGE_CLS: Record<string, string> = {
  Draft: 'bg-neutral-bg text-neutral-fg',
  Submitted: 'bg-info-bg text-info-fg',
  Approved: 'bg-success-bg text-success-fg',
  Paid: 'bg-brand/10 text-brand',
  Cancelled: 'bg-warning-bg text-warning-fg',
  Refused: 'bg-danger-bg text-danger-fg',
}

// Real via expense/ajax/expense_list.php — confirmed the best-built file in
// this whole module (real permission check, real child-user rights
// scoping, real filters/sort/pagination against llx_expensereport).
export function ExpenseReportsList() {
  const [filters, setFilters] = useState<ExpenseListFilters>({ status: '', dateFrom: '', dateTo: '' })
  const [page, setPage] = useState(0)
  const { data, isLoading, isError, error, refetch } = useExpenseReportsList(filters, page, PAGE_SIZE)

  function setFilter<K extends keyof ExpenseListFilters>(key: K, value: ExpenseListFilters[K]) {
    setPage(0)
    setFilters((f) => ({ ...f, [key]: value }))
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Receipt size={20} className="text-brand" /> Expense Reports
      </h2>

      <div className="flex flex-wrap items-center gap-2">
        <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)} className={selectCls}>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <input type="date" value={filters.dateFrom} onChange={(e) => setFilter('dateFrom', e.target.value)} className={inputCls} title="From" />
        <input type="date" value={filters.dateTo} onChange={(e) => setFilter('dateTo', e.target.value)} className={inputCls} title="To" />
      </div>

      {isLoading && <LegacyLoadingCard label="Loading expense reports…" />}
      {isError && <LegacyErrorCard title="Couldn't load expense reports" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {data && (
        <>
          <Card className="!h-auto !p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                  <th className="font-medium px-3 py-2">Ref</th>
                  <th className="font-medium px-3 py-2">Employee</th>
                  <th className="font-medium px-3 py-2">Linked To</th>
                  <th className="font-medium px-3 py-2">Period</th>
                  <th className="font-medium px-3 py-2 text-right">Total HT</th>
                  <th className="font-medium px-3 py-2 text-right">Total TTC</th>
                  <th className="font-medium px-3 py-2">Status</th>
                  <th className="font-medium px-3 py-2">Paid</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-4 text-text-faint italic">
                      No expense reports found.
                    </td>
                  </tr>
                ) : (
                  data.rows.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 text-text!">
                        <Link to={ROUTES.expenseReportDetail.replace(':id', String(r.id))} className="text-brand hover:underline">
                          {r.ref}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-text-muted">{r.user}</td>
                      <td className="px-3 py-2 text-text-muted">{r.linkedTo}</td>
                      <td className="px-3 py-2 text-text-muted whitespace-nowrap">
                        {r.dateStart} – {r.dateEnd}
                      </td>
                      <td className="px-3 py-2 text-right text-text-muted">{r.totalHt}</td>
                      <td className="px-3 py-2 text-right text-text!">{r.totalTtc}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE_CLS[r.status] ?? 'bg-neutral-bg text-neutral-fg'}`}>{r.status}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${r.paid ? 'bg-success-bg text-success-fg' : 'bg-warning-bg text-warning-fg'}`}>
                          {r.paid ? 'Paid' : 'Unpaid'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card>

          <div className="flex items-center justify-between text-sm text-text-muted">
            <span>{data.filtered} expense reports</span>
            <div className="flex items-center gap-2">
              <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="p-1.5 rounded-md border border-border disabled:opacity-40">
                <ChevronLeft size={14} />
              </button>
              <span>Page {page + 1}</span>
              <button
                type="button"
                disabled={(page + 1) * PAGE_SIZE >= data.filtered}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-md border border-border disabled:opacity-40"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
