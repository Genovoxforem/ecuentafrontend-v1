import { useMemo, useState } from 'react'
import { Receipt, Info, Search } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'

// Native replacement for linking out to compta/paiement/cheque/list.php —
// no JSON API exists (confirmed by reading the PHP source directly), so
// there is no real data source to fetch check deposits from. The columns
// below match that legacy page's own column set exactly; the standard
// search/sort/pagination/export chrome is still applied for consistency
// with every other list table in the app, but — since `rows` has no real
// backend to populate it from — it will always show as empty rather than
// display any invented/sample data.
interface CheckDepositRow {
  ref: string
  creationDate: string
  account: string
  checkCount: number
  amount: number
  status: string
}

type SortKey = 'ref' | 'creationDate' | 'account' | 'checkCount' | 'amount' | 'status'

const COLUMNS: { label: string; key: SortKey; align?: 'right' }[] = [
  { label: 'Ref', key: 'ref' },
  { label: 'Creation Date', key: 'creationDate' },
  { label: 'Account', key: 'account' },
  { label: 'Number of Checks', key: 'checkCount' },
  { label: 'Amount', key: 'amount', align: 'right' },
  { label: 'Status', key: 'status' },
]
const COLUMN_LABELS = COLUMNS.map((c) => c.label)
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

const rows: CheckDepositRow[] = []

function matchesSearch(row: CheckDepositRow, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [row.ref, row.account, row.status].some((field) => field.toLowerCase().includes(q))
}

function sortValue(row: CheckDepositRow, key: SortKey): string | number {
  switch (key) {
    case 'ref':
      return row.ref
    case 'creationDate':
      return row.creationDate
    case 'account':
      return row.account
    case 'checkCount':
      return row.checkCount
    case 'amount':
      return row.amount
    case 'status':
      return row.status
  }
}

export function CheckDepositListView() {
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [search, setSearch] = useState('')

  const filteredRows = useMemo(() => rows.filter((r) => matchesSearch(r, search)), [search])
  const { sorted: sortedRows, sort, toggleSort } = useSortableRows<CheckDepositRow, SortKey>(filteredRows, sortValue)
  const pageRows = sortedRows.slice((page - 1) * perPage, page * perPage)

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handlePerPageChange(value: number) {
    setPerPage(value)
    setPage(1)
  }

  function getExportData() {
    const exportRows = sortedRows.map((r) => [r.ref, r.creationDate, r.account, String(r.checkCount), String(r.amount), r.status])
    return { headers: COLUMN_LABELS, rows: exportRows }
  }

  return (
    // -m-6 + flex-1 flex-col: same pattern as ServicesList.tsx / ThirdPartyList.tsx.
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Receipt size={20} className="text-brand" /> Check Deposits
        </h2>
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
        <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
          <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
          <p className="text-xs text-info-fg">
            Backend page: <code className="font-mono">compta/paiement/cheque/list.php</code> — a classic full-page-reload page, no JSON API. There's no real data source to populate this table
            from yet, so it will always be empty; search/sort/pagination/export are still shown for consistency with the rest of the app.
          </p>
        </Card>

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
            <TableExportButtons title="Check Deposits" getExportData={getExportData} />
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <TheadRow>
                  {COLUMNS.map((col) => (
                    <Th key={col.key} sortKey={col.key} sort={sort} onSort={toggleSort} align={col.align}>
                      {col.label}
                    </Th>
                  ))}
                </TheadRow>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMN_LABELS.length} className="px-3 py-4 text-text-faint italic">
                      No Data Available In Table
                    </td>
                  </tr>
                ) : (
                  pageRows.map((r) => (
                    <tr key={r.ref} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 text-text!">{r.ref}</td>
                      <td className="px-3 py-2 text-text-muted">{r.creationDate}</td>
                      <td className="px-3 py-2 text-text-muted">{r.account}</td>
                      <td className="px-3 py-2 text-text-muted">{r.checkCount}</td>
                      <td className="px-3 py-2 text-right text-text!">{r.amount}</td>
                      <td className="px-3 py-2 text-text-muted">{r.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      <ListPagination page={page} perPage={perPage} total={filteredRows.length} onPageChange={setPage} edgeToEdge />
    </div>
  )
}
