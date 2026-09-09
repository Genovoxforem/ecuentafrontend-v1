import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PackageCheck, Search, Loader2, AlertTriangle } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { ROUTES } from '../../../routes'
import { useOrdersPendingReception, type PendingReceptionRow } from '../ordersPendingReception.queries'

type SortKey = 'ref' | 'status' | 'date' | 'author'
const COLUMNS: { label: string; key: SortKey }[] = [
  { label: 'Ref.Id', key: 'ref' },
  { label: 'Order Status', key: 'status' },
  { label: 'Order Date', key: 'date' },
  { label: 'Created By', key: 'author' },
]
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

function sortValue(row: PendingReceptionRow, key: SortKey): string | number {
  switch (key) {
    case 'ref':
      return row.ref
    case 'status':
      return row.status
    case 'date':
      return row.orderDate
    case 'author':
      return row.requestAuthor
  }
}

// reception/card.php?action=create2's "Waiting For Reception" tab. See
// ordersPendingReception.queries.ts's header comment for the exact real SQL
// this reproduces and what's genuinely real vs. a bounded, justified scrape
// (no fake data anywhere).
export function ReceptionCreatePage() {
  const { rows: allRows, isLoading, isError, error } = useOrdersPendingReception()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return allRows
    return allRows.filter((r) => r.ref.toLowerCase().includes(q) || r.thirdParty.toLowerCase().includes(q) || r.requestAuthor.toLowerCase().includes(q))
  }, [allRows, search])

  const { sorted, sort, toggleSort } = useSortableRows<PendingReceptionRow, SortKey>(filteredRows, sortValue)
  const pageRows = sorted.slice((page - 1) * perPage, page * perPage)

  function getExportData() {
    return {
      headers: COLUMNS.map((c) => c.label),
      rows: sorted.map((r) => [r.ref, r.status, r.orderDate, r.requestAuthor]),
    }
  }

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <PackageCheck size={20} className="text-brand" /> Waiting For Reception
        </h2>
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
        {isError && (
          <Card className="!bg-danger-bg border-danger/40 flex items-start gap-3">
            <AlertTriangle size={18} className="text-danger-fg shrink-0 mt-0.5" />
            <p className="text-sm text-danger-fg">{error instanceof Error ? error.message : 'Failed to load purchase orders pending reception.'}</p>
          </Card>
        )}

        <Card className="!p-0 overflow-hidden flex-1 min-h-0">
          <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
            <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1) }} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5">
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <div className="relative w-56">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                placeholder="Search Ref / Third-Party / Created By"
                className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text pl-8 pr-3 py-1.5"
              />
            </div>
            <TableExportButtons title="Waiting For Reception" getExportData={getExportData} />
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
                  <Th>Action</Th>
                </TheadRow>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={COLUMNS.length + 1} className="px-4 py-6 text-center text-text-faint">
                      <Loader2 size={16} className="inline animate-spin mr-2" /> Checking which orders still need a reception…
                    </td>
                  </tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMNS.length + 1} className="px-4 py-4 text-text-faint italic">
                      No Data Available In Table
                    </td>
                  </tr>
                ) : (
                  pageRows.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">
                        {r.id ? (
                          <Link to={ROUTES.purchaseOrderDetail.replace(':id', String(r.id))} className="text-brand hover:underline">
                            {r.ref}
                          </Link>
                        ) : (
                          r.ref
                        )}
                      </td>
                      <td className="px-4 py-3 text-text-muted">{r.status}</td>
                      <td className="px-4 py-3 text-text-muted whitespace-nowrap">{r.orderDate}</td>
                      <td className="px-4 py-3 text-text-muted">{r.requestAuthor}</td>
                      <td className="px-4 py-3">
                        <Link
                          to={r.id ? `${ROUTES.purchaseOrderDetail.replace(':id', String(r.id))}?tab=receipts` : '#'}
                          className="inline-flex items-center rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-hover"
                        >
                          Create reception
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      <ListPagination page={page} perPage={perPage} total={sorted.length} onPageChange={setPage} edgeToEdge />
    </div>
  )
}
