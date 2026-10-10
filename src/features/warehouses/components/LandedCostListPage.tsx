import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Truck, Search, AlertTriangle } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { LegacyErrorCard, LegacyLoadingCard } from '../../products/components/LegacyReportStates'
import { useLandedCostList } from '../warehouseExtras.queries'
import type { LandedCostRow } from '../landedCostListParser'
import { formatDateTime, formatMoney } from '../../../utils/format'

const selectCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none appearance-none'

type SortKey = 'date' | 'ref' | 'product' | 'vendor' | 'expense' | 'amount' | 'allocated' | 'unallocated'

const COLUMNS: { label: string; key: SortKey; align?: 'right' }[] = [
  { label: 'Date', key: 'date' },
  { label: 'Ref', key: 'ref' },
  { label: 'Product', key: 'product' },
  { label: 'Vendor', key: 'vendor' },
  { label: 'Service/Expense', key: 'expense' },
  { label: 'Amount', key: 'amount', align: 'right' },
  { label: 'Allocated Amount', key: 'allocated', align: 'right' },
  { label: 'Unallocated Amount', key: 'unallocated', align: 'right' },
]
const COLUMN_LABELS = COLUMNS.map((c) => c.label)
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

function matchesSearch(c: LandedCostRow, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [c.invoiceRef, c.product, c.vendor, c.expense, formatDateTime(c.date)].some((field) => field.toLowerCase().includes(q))
}

function sortValue(c: LandedCostRow, key: SortKey): string | number {
  switch (key) {
    case 'date':
      return c.date
    case 'ref':
      return c.invoiceRef
    case 'product':
      return c.product
    case 'vendor':
      return c.vendor
    case 'expense':
      return c.expense
    case 'amount':
      return c.amount
    case 'allocated':
      return c.allocated
    case 'unallocated':
      return c.unallocated
  }
}

// List Landed Cost — the backend's own list (fourn/facture/landedcostlist.php), with its
// product filter applied by the backend.
export function LandedCostListPage() {
  const [productDraft, setProductDraft] = useState('')
  const [productFilter, setProductFilter] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const { data, isLoading, isError, error, refetch } = useLandedCostList(productFilter)
  const costs = useMemo(() => data?.rows ?? [], [data])

  const filtered = useMemo(() => costs.filter((c) => matchesSearch(c, search)), [costs, search])
  const { sorted: sortedCosts, sort, toggleSort } = useSortableRows<LandedCostRow, SortKey>(filtered, sortValue)
  const pageCosts = sortedCosts.slice((page - 1) * perPage, page * perPage)

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handlePerPageChange(value: number) {
    setPerPage(value)
    setPage(1)
  }

  function applyFilter(value: string) {
    setProductDraft(value)
    setProductFilter(value)
    setPage(1)
  }

  function getExportData() {
    const rows = sortedCosts.map((c) => [formatDateTime(c.date), c.invoiceRef, c.product || '—', c.vendor || '—', c.expense || '—', c.amount.toFixed(2), c.allocated.toFixed(2), c.unallocated.toFixed(2)])
    return { headers: COLUMN_LABELS, rows }
  }

  return (
    // -m-6 + flex-1 flex-col: same pattern as ThirdPartyList.tsx / StickyFormShell.tsx.
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Truck size={20} className="text-brand" /> List Landed Cost
        </h2>
        <Link to={ROUTES.landedCostCreate} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          New
        </Link>
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
        {data?.incomplete && (
          <div role="alert" className="flex items-start gap-2 rounded-md border border-warning-fg/30 bg-warning-bg px-3 py-2 text-sm text-warning-fg">
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            <span>
              The backend's landed cost list page stops with an error part-way through (landedcostlist.php, line 335), so only the record(s) it printed before failing are shown here. Its
              administrator needs to fix that page before the full list can be read.
            </span>
          </div>
        )}

        {isLoading ? (
          <LegacyLoadingCard label="Loading landed costs…" />
        ) : isError || !data ? (
          <LegacyErrorCard title="Couldn't load the landed costs" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
        ) : (
          <Card className="!p-0 overflow-hidden flex-1 min-h-0">
            <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <label className="text-sm text-text-faint">Product</label>
          <select value={productDraft} onChange={(e) => setProductDraft(e.target.value)} className={selectCls + ' w-56'}>
            <option value="">-- Select Product --</option>
            {(data?.products ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <button type="button" onClick={() => applyFilter(productDraft)} className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          Go
        </button>
        <button type="button" onClick={() => applyFilter('')} className="rounded-md border border-input-border px-4 py-2 text-sm font-medium text-text-muted hover:bg-surface-hover">
          Clear
        </button>
              <select value={perPage} onChange={(e) => handlePerPageChange(Number(e.target.value))} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5">
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
                        {costs.length === 0 ? 'No Data Available In Table' : 'No landed costs match this search.'}
                      </td>
                    </tr>
                  ) : (
                    pageCosts.map((c) => (
                      <tr key={c.key} className="border-b border-border last:border-0">
                        <td className="px-4 py-3 text-text-muted whitespace-nowrap">{formatDateTime(c.date)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {c.invoiceId ? (
                            <Link to={ROUTES.vendorInvoiceDetail.replace(':id', c.invoiceId)} className="text-brand hover:underline">
                              {c.invoiceRef}
                            </Link>
                          ) : (
                            <span className="text-text-muted">{c.invoiceRef}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-text-muted">{c.product || '—'}</td>
                        <td className="px-4 py-3">
                          {c.vendorId ? (
                            <Link to={ROUTES.customerDetail.replace(':id', c.vendorId)} className="text-brand hover:underline">
                              {c.vendor}
                            </Link>
                          ) : (
                            <span className="text-text-muted">{c.vendor || '—'}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-text-muted">{c.expense || '—'}</td>
                        <td className="px-4 py-3 text-right text-text-muted">{formatMoney(c.amount)}</td>
                        <td className="px-4 py-3 text-right text-text-muted">{formatMoney(c.allocated)}</td>
                        <td className="px-4 py-3 text-right text-text-muted">{formatMoney(c.unallocated)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
      <ListPagination page={page} perPage={perPage} total={filtered.length} onPageChange={setPage} edgeToEdge />
    </div>
  )
}
