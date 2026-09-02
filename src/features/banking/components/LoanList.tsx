import { useMemo, useState } from 'react'
import { HandCoins, Search } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { useLoanList, type LoanRow } from '../banking.queries'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'

type SortKey = 'label' | 'amountLabel' | 'statusLabel'

const COLUMNS: { label: string; key: SortKey }[] = [
  { label: 'Loan', key: 'label' },
  { label: 'Amount', key: 'amountLabel' },
  { label: 'Status', key: 'statusLabel' },
]
const COLUMN_LABELS = COLUMNS.map((c) => c.label)
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

function matchesSearch(loan: LoanRow, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [loan.label, loan.amountLabel, loan.statusLabel].some((field) => field.toLowerCase().includes(q))
}

function sortValue(l: LoanRow, key: SortKey): string | number {
  switch (key) {
    case 'label':
      return l.label
    case 'amountLabel':
      return l.amountLabel
    case 'statusLabel':
      return l.statusLabel
  }
}

// Real via loan/loan-sidebar-list-ajax.php — confirmed genuine JSON, but no
// permission check at all server-side (any logged-in user can call it).
// This is Dolibarr's core loan/ module (llx_loan), NOT the same feature as
// Payroll's own "Employee Loan" (payroll/loan.php, a different table —
// confirmed separately this session).
export function LoanList() {
  const { data: loans, isLoading, isError, error, refetch } = useLoanList()
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [search, setSearch] = useState('')

  const filteredLoans = useMemo(() => (loans ?? []).filter((l) => matchesSearch(l, search)), [loans, search])
  const { sorted: sortedLoans, sort, toggleSort } = useSortableRows<LoanRow, SortKey>(filteredLoans, sortValue)
  const pageLoans = sortedLoans.slice((page - 1) * perPage, page * perPage)

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handlePerPageChange(value: number) {
    setPerPage(value)
    setPage(1)
  }

  function getExportData() {
    const rows = sortedLoans.map((l) => [l.label, l.amountLabel, l.statusLabel])
    return { headers: COLUMN_LABELS, rows }
  }

  return (
    // -m-6 + flex-1 flex-col: same pattern as ServicesList.tsx / ThirdPartyList.tsx.
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <HandCoins size={20} className="text-brand" /> Loan List
        </h2>
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
        {isLoading && <LegacyLoadingCard label="Loading loans…" />}
        {isError && <LegacyErrorCard title="Couldn't load loans" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

        {loans && (
          <Card className="!p-0 overflow-hidden flex-1 min-h-0">
            <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
              <select
                value={perPage}
                onChange={(e) => handlePerPageChange(Number(e.target.value))}
                className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5"
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <div className="relative w-48">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search"
                  className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text pl-8 pr-3 py-1.5"
                />
              </div>
              <TableExportButtons title="Loan List" getExportData={getExportData} />
            </div>
            <div className="flex-1 min-h-0 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <TheadRow>
                    {COLUMNS.map((col) => (
                      <Th key={col.key} sortKey={col.key} sort={sort} onSort={toggleSort}>
                        {col.label}
                      </Th>
                    ))}
                  </TheadRow>
                </thead>
                <tbody>
                  {loans.length === 0 ? (
                    <tr>
                      <td colSpan={COLUMN_LABELS.length} className="px-4 py-4 text-text-faint italic">
                        No loans found.
                      </td>
                    </tr>
                  ) : filteredLoans.length === 0 ? (
                    <tr>
                      <td colSpan={COLUMN_LABELS.length} className="px-4 py-4 text-text-faint italic">
                        No loans match "{search}".
                      </td>
                    </tr>
                  ) : (
                    pageLoans.map((l) => (
                      <tr key={l.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-2 text-text!">{l.label}</td>
                        <td className="px-4 py-2 text-text-muted">{l.amountLabel}</td>
                        <td className="px-4 py-2 text-text-muted">{l.statusLabel}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
      <ListPagination page={page} perPage={perPage} total={filteredLoans.length} onPageChange={setPage} edgeToEdge />
    </div>
  )
}
