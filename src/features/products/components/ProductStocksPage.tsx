import { useDeferredValue, useState } from 'react'
import { Link } from 'react-router-dom'
import { Package, Search } from 'lucide-react'
import { ListPagination } from '../../../shared/components/ListPagination'
import { useCategories } from '../../customers/categories.queries'
import { useWarehousePickerOptions } from '../../warehouses/warehouseExtras.queries'
import { formatNumber } from '../../../utils/format'
import { ROUTES } from '../../../routes'
import { stockBucket, useStockList, type StockBucket, type StockListFilters, type StockListRow } from '../productTools.queries'
import { LegacyLoadingCard, LegacyErrorCard } from './LegacyReportStates'

const selectCls = 'text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5'

const COLUMNS: { key: StockBucket; title: string; head: string }[] = [
  { key: 'out', title: 'Out of Stock', head: 'bg-danger text-white' },
  { key: 'low', title: 'Low Stock', head: 'bg-warning text-black' },
  { key: 'in', title: 'In Stock', head: 'bg-success text-white' },
  { key: 'over', title: 'Overstock', head: 'bg-info text-white' },
]

function Metric({ label, value, tone }: { label: string; value: number; tone?: 'danger' }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-brand/70">{label}</span>
      <span className={`tabular-nums ${tone === 'danger' ? 'text-danger' : 'text-brand'}`}>{formatNumber(value)}</span>
    </div>
  )
}

function Badge({ children, tone }: { children: string; tone: 'muted' | 'plain' }) {
  return <span className={tone === 'muted' ? 'rounded-full bg-text-muted/80 px-2 py-0.5 text-xs font-medium text-white' : 'rounded-full bg-surface-hover px-2 py-0.5 text-xs text-text'}>{children}</span>
}

function StockCard({ row }: { row: StockListRow }) {
  return (
    <div className="rounded-md border border-border bg-surface-alt p-3 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning/20 text-warning">
          <Package size={17} />
        </span>
        <div className="min-w-0">
          {row.id ? (
            <Link to={ROUTES.productDetail.replace(':id', row.id)} className="block truncate font-semibold text-brand hover:underline">
              {row.label}
            </Link>
          ) : (
            <span className="block truncate font-semibold text-text!">{row.label}</span>
          )}
          <span className="text-xs text-text-faint">Ref: {row.ref}</span>
        </div>
      </div>
      <p className="mt-2 text-sm text-text!">{row.label}</p>
      <div className="mt-1 space-y-0.5">
        <Metric label="Physical Stock" value={row.physical} tone={row.physical < 0 ? 'danger' : undefined} />
        <Metric label="Stock limit for alert" value={row.stockLimit} />
        <Metric label="Desired Stock" value={row.desiredStock} />
        {row.virtual !== null && <Metric label="Virtual stock" value={row.virtual} tone={row.virtual < 0 ? 'danger' : undefined} />}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {row.zra && <Badge tone="muted">{row.zra}</Badge>}
        <Badge tone="plain">{row.forSale}</Badge>
        <Badge tone="plain">{/not for/i.test(row.forPurchase) ? 'Product Status Off Buy' : 'Product Status On Buy'}</Badge>
      </div>
      {row.id && (
        <Link to={`${ROUTES.stockMovements}?idproduct=${row.id}`} className="mt-2 inline-block text-sm text-brand hover:underline">
          Movements
        </Link>
      )}
    </div>
  )
}

// Products (Stocks) — the classic board: four columns (Out of Stock, Low Stock,
// In Stock, Overstock) of product cards, each with its physical / alert / desired /
// virtual stock, ZRA state and sale status. Data: product/stock/fapi/reassort.php
// (server-side search, warehouse, tag and "below alert" filters and paging; the
// board groups the current page), or the product/reassort.php scrape on an older
// backend. The list is "what is stocked": a product with no stock row in a
// warehouse is not on it, as on the classic page.
export function ProductStocksPage() {
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [filters, setFilters] = useState<Omit<StockListFilters, 'search'>>({ warehouse: 0, categ: 0, lowStock: false, page: 1, limit: 50 })
  const { data, isLoading, isError, error, refetch, isFetching } = useStockList({ ...filters, search: deferredSearch })
  const { data: warehouses } = useWarehousePickerOptions()
  const { data: categories } = useCategories(0)
  const legacy = data?.source === 'legacy'
  const setFilter = (patch: Partial<typeof filters>) => setFilters((f) => ({ ...f, ...patch, page: 1 }))
  const grouped = new Map<StockBucket, StockListRow[]>(COLUMNS.map((c) => [c.key, []]))
  for (const row of data?.rows ?? []) grouped.get(stockBucket(row))!.push(row)

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3 shrink-0">
        <div className="relative w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setFilters((f) => ({ ...f, page: 1 }))
            }}
            placeholder="Search ref, label, barcode…"
            className="w-full rounded-md border border-input-border bg-input-bg py-1.5 pl-8 pr-3 text-sm text-text"
          />
        </div>
        <select value={filters.warehouse} onChange={(e) => setFilter({ warehouse: Number(e.target.value) })} className={selectCls} disabled={legacy} aria-label="Warehouse">
          <option value={0}>All warehouses</option>
          {(warehouses ?? []).map((w) => (
            <option key={w.id} value={w.id}>
              {w.ref}
              {w.label && w.label !== w.ref ? ` — ${w.label}` : ''}
            </option>
          ))}
        </select>
        <select value={filters.categ} onChange={(e) => setFilter({ categ: Number(e.target.value) })} className={selectCls} disabled={legacy} aria-label="Tag">
          <option value={0}>All tags</option>
          <option value={-2}>No tag</option>
          {(categories?.items ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.fullLabel}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-text">
          <input type="checkbox" checked={filters.lowStock} onChange={(e) => setFilter({ lowStock: e.target.checked })} />
          Below alert level only
        </label>
        {isFetching && <span className="text-xs text-text-faint">Refreshing…</span>}
      </div>
      {legacy && <p className="text-xs text-text-faint">This backend has no stock API yet — showing the classic page; the warehouse and tag filters need the newer backend.</p>}

      {isError && <LegacyErrorCard title="Couldn't load stock levels" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}
      {isLoading && <LegacyLoadingCard label="Loading stock levels…" />}

      {data && (
        <>
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {COLUMNS.map((col) => {
              const rows = grouped.get(col.key)!
              return (
                <section key={col.key} className="flex min-h-0 flex-col rounded-md bg-surface p-2.5 shadow-sm">
                  <header className={`mb-2 flex shrink-0 items-center justify-between rounded px-3 py-1.5 text-sm font-semibold ${col.head}`}>
                    {col.title}
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-xs font-bold text-black">{rows.length}</span>
                  </header>
                  {rows.length === 0 ? <p className="py-3 text-center text-sm text-text-faint">None</p> : <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-1">{rows.map((r) => <StockCard key={r.id ?? r.ref} row={r} />)}</div>}
                </section>
              )
            })}
          </div>
          <ListPagination page={filters.page} perPage={filters.limit} total={data.total} onPageChange={(page) => setFilters((f) => ({ ...f, page }))} />
        </>
      )}
    </div>
  )
}
