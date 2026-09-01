import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Warehouse, Plus, Boxes, Package, CircleDollarSign, Search } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { ROUTES } from '../../../routes'
import { useProductOptions } from '../../products/products.queries'
import { useWarehouseList, type WarehouseListRow } from '../warehouseExtras.queries'
import { formatMoney } from '../../../utils/format'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'

function StatTile({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof Warehouse }) {
  return (
    <Card className="!p-3 !flex-row items-center justify-between gap-3">
      <div>
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-text! mt-1">{value}</p>
      </div>
      <span className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-brand/10 text-brand">
        <Icon size={18} />
      </span>
    </Card>
  )
}

type SortKey = 'ref' | 'shortName' | 'environment' | 'inputStockValue' | 'valueForSell' | 'status'

const COLUMNS: { label: string; key: SortKey; align?: 'right' }[] = [
  { label: 'Ref', key: 'ref' },
  { label: 'Short Name Location', key: 'shortName' },
  { label: 'Environment', key: 'environment' },
  { label: 'Input Stock Value', key: 'inputStockValue', align: 'right' },
  { label: 'Value For Sell', key: 'valueForSell', align: 'right' },
  { label: 'Status', key: 'status' },
]
const COLUMN_LABELS = COLUMNS.map((c) => c.label)
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

function matchesSearch(w: WarehouseListRow, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [w.ref, w.shortName, w.environment, w.statusLabel].some((field) => field.toLowerCase().includes(q))
}

function sortValue(w: WarehouseListRow, key: SortKey): string | number {
  switch (key) {
    case 'ref':
      return w.ref
    case 'shortName':
      return w.shortName
    case 'environment':
      return w.environment
    case 'inputStockValue':
      return w.inputStockValue
    case 'valueForSell':
      return w.valueForSell
    case 'status':
      return w.statusLabel
  }
}

// Warehouses now come from the real product/stock/list.php page (see
// warehouseExtras.queries.ts) — "Total Products"/"Total Stock"/"Total Stock
// Value" stay sourced from /api/products/, the same real catalog the
// Warehouses Area dashboard's own tiles use.
export function WarehouseListPage() {
  const { warehouses, isLoading, isError, error, refetch } = useWarehouseList()
  const { data: products } = useProductOptions()
  const totalStockValue = (products ?? []).reduce((sum, p) => sum + p.priceExclTax * p.stock, 0)

  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [search, setSearch] = useState('')

  const filteredWarehouses = useMemo(() => warehouses.filter((w) => matchesSearch(w, search)), [warehouses, search])
  const { sorted: sortedWarehouses, sort, toggleSort } = useSortableRows<WarehouseListRow, SortKey>(filteredWarehouses, sortValue)
  const pageWarehouses = sortedWarehouses.slice((page - 1) * perPage, page * perPage)

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handlePerPageChange(value: number) {
    setPerPage(value)
    setPage(1)
  }

  function getExportData() {
    const rows = sortedWarehouses.map((w) => [
      w.ref,
      w.shortName,
      w.environment,
      w.inputStockValue ? formatMoney(w.inputStockValue) : '',
      formatMoney(w.valueForSell),
      w.statusLabel,
    ])
    return { headers: COLUMN_LABELS, rows }
  }

  return (
    // -m-6 + flex-1 flex-col: same pattern as ThirdPartyList.tsx / StickyFormShell.tsx.
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Warehouse size={20} className="text-brand" /> Warehouse Details
        </h2>
        <Link to={ROUTES.warehouseCreate} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          <Plus size={14} /> New
        </Link>
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatTile label="Total Warehouses" value={warehouses.length} icon={Warehouse} />
          <StatTile label="Total Products" value={(products ?? []).length} icon={Boxes} />
          <StatTile label="Total Stock" value={(products ?? []).reduce((sum, p) => sum + p.stock, 0)} icon={Package} />
          <StatTile label="Total Stock Value" value={`${totalStockValue.toFixed(2)} ZMW`} icon={CircleDollarSign} />
        </div>

        {isLoading ? (
          <LegacyLoadingCard label="Loading warehouses…" />
        ) : isError ? (
          <LegacyErrorCard title="Couldn't load warehouses" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
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
              <TableExportButtons title="Warehouse Details" getExportData={getExportData} />
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
                  {warehouses.length === 0 ? (
                    <tr>
                      <td colSpan={COLUMN_LABELS.length} className="px-4 py-4 text-text-faint italic">
                        No Data Available In Table
                      </td>
                    </tr>
                  ) : filteredWarehouses.length === 0 ? (
                    <tr>
                      <td colSpan={COLUMN_LABELS.length} className="px-4 py-4 text-text-faint italic">
                        No warehouses match "{search}".
                      </td>
                    </tr>
                  ) : (
                    pageWarehouses.map((w) => (
                      <tr key={w.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-3 text-brand">
                          <Link to={ROUTES.warehouseDetail.replace(':id', String(w.id))} className="hover:underline">
                            {w.ref}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-text-muted">{w.shortName}</td>
                        <td className="px-4 py-3 text-text-muted">{w.environment}</td>
                        <td className="px-4 py-3 text-right text-text-muted">{w.inputStockValue ? formatMoney(w.inputStockValue) : ''}</td>
                        <td className="px-4 py-3 text-right text-text-muted">{formatMoney(w.valueForSell)}</td>
                        <td className="px-4 py-3 text-text-muted">{w.statusLabel}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
      <ListPagination page={page} perPage={perPage} total={filteredWarehouses.length} onPageChange={setPage} edgeToEdge />
    </div>
  )
}
