import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, Plus, Search } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { ROUTES } from '../../../routes'
import { useInventoryList, type InventoryListRow } from '../warehouseExtras.queries'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'

type SortKey = 'ref' | 'label' | 'warehouse' | 'product' | 'valueDate' | 'status'

const COLUMNS: { label: string; key: SortKey }[] = [
  { label: 'Ref.', key: 'ref' },
  { label: 'Label', key: 'label' },
  { label: 'Warehouse', key: 'warehouse' },
  { label: 'Product', key: 'product' },
  { label: 'Value Date', key: 'valueDate' },
  { label: 'Status', key: 'status' },
]
const COLUMN_LABELS = COLUMNS.map((c) => c.label)
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

function matchesSearch(inv: InventoryListRow, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [inv.ref, inv.label, inv.warehouseLabel, inv.productLabel, inv.valueDate, inv.statusLabel].some((field) => field.toLowerCase().includes(q))
}

function sortValue(inv: InventoryListRow, key: SortKey): string | number {
  switch (key) {
    case 'ref':
      return inv.ref
    case 'label':
      return inv.label
    case 'warehouse':
      return inv.warehouseLabel
    case 'product':
      return inv.productLabel
    case 'valueDate':
      return inv.valueDate
    case 'status':
      return inv.statusLabel
  }
}

// Inventories now come from the real product/inventory/list.php page (see
// warehouseExtras.queries.ts) instead of a session-only local stub.
export function InventoryListPage() {
  const { inventories, isLoading, isError, error, refetch } = useInventoryList()

  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [search, setSearch] = useState('')

  const filteredInventories = useMemo(() => inventories.filter((inv) => matchesSearch(inv, search)), [inventories, search])
  const { sorted: sortedInventories, sort, toggleSort } = useSortableRows<InventoryListRow, SortKey>(filteredInventories, sortValue)
  const pageInventories = sortedInventories.slice((page - 1) * perPage, page * perPage)

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handlePerPageChange(value: number) {
    setPerPage(value)
    setPage(1)
  }

  function getExportData() {
    const rows = sortedInventories.map((inv) => [
      inv.ref,
      inv.label || '—',
      inv.warehouseLabel || '—',
      inv.productLabel || '—',
      inv.valueDate || '—',
      inv.statusLabel,
    ])
    return { headers: COLUMN_LABELS, rows }
  }

  return (
    // -m-6 + flex-1 flex-col: same pattern as ThirdPartyList.tsx / StickyFormShell.tsx.
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <ClipboardList size={20} className="text-brand" /> List Of Inventories
        </h2>
        <Link to={ROUTES.inventoryCreate} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          <Plus size={14} /> New
        </Link>
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
        {isLoading ? (
          <LegacyLoadingCard label="Loading inventories…" />
        ) : isError ? (
          <LegacyErrorCard title="Couldn't load inventories" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
        ) : (
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
              <TableExportButtons title="List Of Inventories" getExportData={getExportData} />
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
                  {inventories.length === 0 ? (
                    <tr>
                      <td colSpan={COLUMN_LABELS.length} className="px-4 py-4 text-text-faint italic">
                        No Data Available In Table
                      </td>
                    </tr>
                  ) : filteredInventories.length === 0 ? (
                    <tr>
                      <td colSpan={COLUMN_LABELS.length} className="px-4 py-4 text-text-faint italic">
                        No inventories match "{search}".
                      </td>
                    </tr>
                  ) : (
                    pageInventories.map((inv) => (
                      <tr key={inv.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-3">
                          <Link to={ROUTES.inventoryDetail.replace(':id', String(inv.id))} className="text-brand hover:underline">
                            {inv.ref}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-text!">{inv.label || '—'}</td>
                        <td className="px-4 py-3 text-text-muted">
                          {inv.warehouseId ? (
                            <Link to={ROUTES.warehouseDetail.replace(':id', String(inv.warehouseId))} className="text-brand hover:underline">
                              {inv.warehouseLabel || '—'}
                            </Link>
                          ) : (
                            inv.warehouseLabel || '—'
                          )}
                        </td>
                        <td className="px-4 py-3 text-text-muted">{inv.productLabel || '—'}</td>
                        <td className="px-4 py-3 text-text-muted">{inv.valueDate || '—'}</td>
                        <td className="px-4 py-3 text-text-muted">{inv.statusLabel}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
      <ListPagination page={page} perPage={perPage} total={filteredInventories.length} onPageChange={setPage} edgeToEdge />
    </div>
  )
}
