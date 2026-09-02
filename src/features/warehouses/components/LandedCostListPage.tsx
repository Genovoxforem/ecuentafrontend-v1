import { useMemo, useState } from 'react'
import { Truck, Search } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { useProductOptions } from '../../products/products.queries'
import { useLandedCosts, type LandedCostRecord } from '../warehouseExtras.queries'
import { formatDate } from '../../../utils/format'

const selectCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none appearance-none'

// Vendor/Amount/Allocated Amount/Unallocated Amount have no real backing
// field on LandedCostRecord (see warehouseExtras.queries.ts) — they render
// as fixed placeholders just like before, so those columns stay
// non-sortable rather than sorting on a constant.
type SortKey = 'date' | 'ref' | 'product' | 'expense'

const COLUMNS: { label: string; key?: SortKey; align?: 'right' }[] = [
  { label: 'Date', key: 'date' },
  { label: 'Ref', key: 'ref' },
  { label: 'Product', key: 'product' },
  { label: 'Vendor' },
  { label: 'Service/Expense', key: 'expense' },
  { label: 'Amount', align: 'right' },
  { label: 'Allocated Amount', align: 'right' },
  { label: 'Unallocated Amount', align: 'right' },
]
const COLUMN_LABELS = COLUMNS.map((c) => c.label)
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

function matchesSearch(c: LandedCostRecord, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [c.ref, c.purchaseInvoice || '', c.landedExpense || '', formatDate(c.startDate)].some((field) => field.toLowerCase().includes(q))
}

function sortValue(c: LandedCostRecord, key: SortKey): string | number {
  switch (key) {
    case 'date':
      return c.startDate
    case 'ref':
      return c.ref
    case 'product':
      return c.purchaseInvoice || ''
    case 'expense':
      return c.landedExpense || ''
  }
}

export function LandedCostListPage() {
  const [productFilter, setProductFilter] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const { data: products } = useProductOptions()
  const costs = useLandedCosts()

  const filtered = useMemo(
    () => (productFilter ? costs.filter((c) => c.purchaseInvoice === productFilter) : costs).filter((c) => matchesSearch(c, search)),
    [costs, productFilter, search],
  )
  const { sorted: sortedCosts, sort, toggleSort } = useSortableRows<LandedCostRecord, SortKey>(filtered, sortValue)
  const pageCosts = sortedCosts.slice((page - 1) * perPage, page * perPage)

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handlePerPageChange(value: number) {
    setPerPage(value)
    setPage(1)
  }

  function getExportData() {
    const rows = sortedCosts.map((c) => [
      formatDate(c.startDate),
      c.ref,
      c.purchaseInvoice || '—',
      '—',
      c.landedExpense || '—',
      '0.00',
      '0.00',
      '0.00',
    ])
    return { headers: COLUMN_LABELS, rows }
  }

  return (
    // -m-6 + flex-1 flex-col: same pattern as ThirdPartyList.tsx / StickyFormShell.tsx.
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Truck size={20} className="text-brand" /> List Landed Cost
        </h2>
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-text-faint mb-1">Product</label>
            <select value={productFilter} onChange={(e) => setProductFilter(e.target.value)} className={selectCls + ' w-56'}>
              <option value="">-- Select Product --</option>
              {(products ?? []).map((p) => (
                <option key={p.id} value={p.label}>
                  {p.ref} — {p.label}
                </option>
              ))}
            </select>
          </div>
          <button type="button" className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
            Go
          </button>
          <button type="button" onClick={() => setProductFilter('')} className="rounded-md border border-input-border px-4 py-2 text-sm font-medium text-text-muted hover:bg-surface-hover">
            Clear
          </button>
        </div>

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
            <TableExportButtons title="List Landed Cost" getExportData={getExportData} />
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <TheadRow>
                  {COLUMNS.map((col) => (
                    <Th key={col.label} sortKey={col.key} sort={sort} onSort={toggleSort} align={col.align}>
                      {col.label}
                    </Th>
                  ))}
                </TheadRow>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMN_LABELS.length} className="px-4 py-4 text-text-faint italic">
                      {costs.length === 0 ? 'No Data Available In Table' : 'No landed costs match these filters.'}
                    </td>
                  </tr>
                ) : (
                  pageCosts.map((c) => (
                    <tr key={c.ref} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 text-text-muted whitespace-nowrap">{formatDate(c.startDate)}</td>
                      <td className="px-4 py-3 text-brand">{c.ref}</td>
                      <td className="px-4 py-3 text-text-muted">{c.purchaseInvoice || '—'}</td>
                      <td className="px-4 py-3 text-text-muted">—</td>
                      <td className="px-4 py-3 text-text-muted">{c.landedExpense || '—'}</td>
                      <td className="px-4 py-3 text-right text-text-muted">0.00</td>
                      <td className="px-4 py-3 text-right text-text-muted">0.00</td>
                      <td className="px-4 py-3 text-right text-text-muted">0.00</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      <ListPagination page={page} perPage={perPage} total={filtered.length} onPageChange={setPage} edgeToEdge />
    </div>
  )
}
