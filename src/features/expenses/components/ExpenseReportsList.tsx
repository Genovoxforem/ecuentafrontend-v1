import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Receipt } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { useExpenseReportsList, type ExpenseListFilters, type ExpenseReportRow } from '../expenses.queries'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { ROUTES } from '../../../routes'

const PAGE_SIZE = 20

type SortKey = 'ref' | 'user' | 'linkedTo' | 'dateStart' | 'totalHt' | 'totalTtc' | 'status' | 'paid'

// Server-paginated (expense/ajax/expense_list.php) — sorting applies within
// the loaded page only, same caveat as this app's other server-paginated
// lists (ContactListPage.tsx).
function sortValue(r: ExpenseReportRow, key: SortKey): string | number {
  switch (key) {
    case 'ref':
      return r.ref
    case 'user':
      return r.user
    case 'linkedTo':
      return r.linkedTo
    case 'dateStart':
      return r.dateStart
    case 'totalHt':
      return r.totalHt
    case 'totalTtc':
      return r.totalTtc
    case 'status':
      return r.status
    case 'paid':
      return r.paid ? 1 : 0
  }
}
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
  const rows = data?.rows ?? []
  const { sorted: sortedRows, sort, toggleSort } = useSortableRows<ExpenseReportRow, SortKey>(rows, sortValue)

  function setFilter<K extends keyof ExpenseListFilters>(key: K, value: ExpenseListFilters[K]) {
    setPage(0)
    setFilters((f) => ({ ...f, [key]: value }))
  }

  function getExportData() {
    return {
      headers: ['Ref', 'Employee', 'Linked To', 'Period', 'Total HT', 'Total TTC', 'Status', 'Paid'],
      rows: sortedRows.map((r) => [r.ref, r.user, r.linkedTo, `${r.dateStart} - ${r.dateEnd}`, r.totalHt, r.totalTtc, r.status, r.paid ? 'Paid' : 'Unpaid']),
    }
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
          <div className="flex justify-end">
            <TableExportButtons title="Expense Reports" getExportData={getExportData} />
          </div>

          <Card className="!h-auto !p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <TheadRow>
                  <Th sortKey="ref" sort={sort} onSort={toggleSort}>Ref</Th>
                  <Th sortKey="user" sort={sort} onSort={toggleSort}>Employee</Th>
                  <Th sortKey="linkedTo" sort={sort} onSort={toggleSort}>Linked To</Th>
                  <Th sortKey="dateStart" sort={sort} onSort={toggleSort}>Period</Th>
                  <Th sortKey="totalHt" sort={sort} onSort={toggleSort} align="right">Total HT</Th>
                  <Th sortKey="totalTtc" sort={sort} onSort={toggleSort} align="right">Total TTC</Th>
                  <Th sortKey="status" sort={sort} onSort={toggleSort}>Status</Th>
                  <Th sortKey="paid" sort={sort} onSort={toggleSort}>Paid</Th>
                </TheadRow>
              </thead>
              <tbody>
                {sortedRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-4 text-text-faint italic">
                      No expense reports found.
                    </td>
                  </tr>
                ) : (
                  sortedRows.map((r) => (
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

          <ListPagination page={page + 1} perPage={PAGE_SIZE} total={data.filtered} onPageChange={(p) => setPage(p - 1)} />
        </>
      )}
    </div>
  )
}
