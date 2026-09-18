import { useState } from 'react'
import { ListFilter, Filter, LoaderCircle, AlertTriangle, Search } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { useWarehouses } from '../warehouseExtras.queries'
import { useProductOptions } from '../../products/products.queries'
import { useRacksReal, useShelvesReal, useRackListReport, useDistinctLots, type RackListReportRow, type RackListFilters } from '../racks.queries'

const selectCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 appearance-none'

type SortKey = 'rack' | 'warehouse' | 'shelf' | 'lot' | 'product' | 'qty'

const COLUMNS: { label: string; key: SortKey; align?: 'right' }[] = [
  { label: 'Rack Label', key: 'rack' },
  { label: 'Warehouse', key: 'warehouse' },
  { label: 'Shelves Ref', key: 'shelf' },
  { label: 'Lot', key: 'lot' },
  { label: 'Product Name', key: 'product' },
  { label: 'QTY', key: 'qty', align: 'right' },
]
const COLUMN_LABELS = ['No', ...COLUMNS.map((c) => c.label)]
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

function sortValue(r: RackListReportRow, key: SortKey): string | number {
  switch (key) {
    case 'rack':
      return r.rackName
    case 'warehouse':
      return r.warehouseName
    case 'shelf':
      return r.shelfRef
    case 'lot':
      return r.lot
    case 'product':
      return r.productName
    case 'qty':
      return r.qty
  }
}

// Real reference module: custom/racks/racksindex.php?action=rack_list — a
// real, working read-only report joining llx_shelvesdet to rack/shelf/
// warehouse/product (see racks.queries.ts's header comment). Only assigned
// products in a Rack whose own status is Active ever appear here — that
// `WHERE ra.status = 1` is baked into the real query itself, not a filter
// this page can lift.
//
// The reference page's own Rack→Shelf cascade
// (save_ajax.php?action=rack) is broken server-side (confirmed by reading
// it — iterates an undefined variable), so every filter dropdown here is
// independently sourced instead of chained through that dead AJAX call.
export function RacksListPage() {
  const [warehouseId, setWarehouseId] = useState('')
  const [rackId, setRackId] = useState('')
  const [shelfId, setShelfId] = useState('')
  const [lot, setLot] = useState('')
  const [productId, setProductId] = useState('')
  const [applied, setApplied] = useState<RackListFilters>({})
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)

  const warehouses = useWarehouses()
  const { data: racks } = useRacksReal()
  const { data: shelves } = useShelvesReal()
  const { data: products } = useProductOptions()
  const { data, isLoading, isError, error } = useRackListReport(applied)
  const lots = useDistinctLots(data)

  const rows = data ?? []
  const filtered = rows.filter((r) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return [r.rackName, r.warehouseName, r.shelfRef, r.lot, r.productName].some((f) => f.toLowerCase().includes(q))
  })
  const { sorted, sort, toggleSort } = useSortableRows<RackListReportRow, SortKey>(filtered, sortValue)
  const pageRows = sorted.slice((page - 1) * perPage, page * perPage)

  function handleFilter() {
    setApplied({ warehouseId: warehouseId || undefined, rackId: rackId || undefined, shelfId: shelfId || undefined, lot: lot || undefined, productId: productId || undefined })
    setPage(1)
  }

  function getExportData() {
    return { headers: COLUMN_LABELS.slice(1), rows: sorted.map((r) => [r.rackName, r.warehouseName, r.shelfRef, r.lot, r.productName, String(r.qty)]) }
  }

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <ListFilter size={20} className="text-brand" /> Assign Product to Rack/Shelf
        </h2>
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
        {isError && (
          <Card className="!bg-danger-bg border-danger/40 flex items-start gap-3">
            <AlertTriangle size={18} className="text-danger-fg shrink-0 mt-0.5" />
            <p className="text-sm text-danger-fg">{error instanceof Error ? error.message : 'Failed to load the rack report.'}</p>
          </Card>
        )}
        <Card className="!h-auto">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-text-faint mb-1">Warehouse</label>
              <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className={selectCls}>
                <option value="">All Warehouses</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.ref}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-faint mb-1">Rack</label>
              <select value={rackId} onChange={(e) => setRackId(e.target.value)} className={selectCls}>
                <option value="">All Racks</option>
                {(racks ?? []).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-faint mb-1">Shelves Ref</label>
              <select value={shelfId} onChange={(e) => setShelfId(e.target.value)} className={selectCls}>
                <option value="">All Shelves</option>
                {(shelves ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.ref}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-faint mb-1">Lot</label>
              <select value={lot} onChange={(e) => setLot(e.target.value)} className={selectCls}>
                <option value="">All Lots</option>
                {lots.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-faint mb-1">Product Name</label>
              <select value={productId} onChange={(e) => setProductId(e.target.value)} className={selectCls}>
                <option value="">All Products</option>
                {(products ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.ref} — {p.label}
                  </option>
                ))}
              </select>
            </div>
            <button type="button" onClick={handleFilter} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
              <Filter size={14} /> Filter
            </button>
          </div>
        </Card>

        <Card className="!p-0 overflow-hidden flex-1 min-h-0">
          <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
            <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1) }} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5">
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
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                placeholder="Search"
                className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text pl-8 pr-3 py-1.5"
              />
            </div>
            <TableExportButtons title="Racks List" getExportData={getExportData} />
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <TheadRow>
                  <Th>No</Th>
                  {COLUMNS.map((col) => (
                    <Th key={col.key} sortKey={col.key} sort={sort} onSort={toggleSort} align={col.align}>
                      {col.label}
                    </Th>
                  ))}
                </TheadRow>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={COLUMN_LABELS.length} className="px-4 py-6 text-center text-text-faint">
                      <LoaderCircle size={16} className="inline animate-spin mr-2" /> Loading…
                    </td>
                  </tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMN_LABELS.length} className="px-4 py-4 text-text-faint italic">
                      No Data Available In Table
                    </td>
                  </tr>
                ) : (
                  pageRows.map((r, i) => (
                    <tr key={`${r.rackName}-${r.shelfRef}-${r.productName}-${i}`} className="border-b border-border last:border-0 hover:bg-surface-hover">
                      <td className="px-4 py-3 text-text-faint">{(page - 1) * perPage + i + 1}</td>
                      <td className="px-4 py-3 text-brand font-medium">{r.rackName}</td>
                      <td className="px-4 py-3 text-text-muted">{r.warehouseName}</td>
                      <td className="px-4 py-3 text-text-muted">{r.shelfRef}</td>
                      <td className="px-4 py-3 text-text-muted">{r.lot || '-'}</td>
                      <td className="px-4 py-3 text-text!">{r.productName}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-text!">{r.qty}</td>
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
