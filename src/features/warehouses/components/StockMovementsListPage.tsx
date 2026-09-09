import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Warehouse, ShoppingCart, ShoppingBag, RefreshCw, Search, RotateCcw, LoaderCircle, AlertTriangle, CloudUpload } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { ROUTES } from '../../../routes'
import { useWarehouses } from '../warehouseExtras.queries'
import { useStockMovementsList, useBulkUpdateZraStatus, type StockMovementRow, type StockMovementFilters } from '../stockMovementsList.queries'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const selectCls = inputCls + ' appearance-none'

function StatTile({ label, value, today, icon: Icon }: { label: string; value: number; today: number; icon: typeof Warehouse }) {
  return (
    <Card className="!p-3 !flex-row items-center justify-between gap-3">
      <div>
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-text! mt-1">{value.toLocaleString()} Qty</p>
        <p className="text-xs text-text-faint mt-0.5">Today: {today.toLocaleString()} Qty</p>
      </div>
      <span className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-brand/10 text-brand">
        <Icon size={18} />
      </span>
    </Card>
  )
}

function firstOfMonth() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1)
}
function lastOfMonth() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}
function fmtUs(d: Date) {
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`
}

type SortKey = 'ref' | 'date' | 'productRef' | 'productLabel' | 'warehouse' | 'invCode' | 'label' | 'type' | 'origin' | 'cost' | 'qty' | 'zra'
const COLUMNS: { label: string; key: SortKey; align?: 'right' }[] = [
  { label: 'Ref.', key: 'ref' },
  { label: 'Date', key: 'date' },
  { label: 'Product Ref.', key: 'productRef' },
  { label: 'Product Label', key: 'productLabel' },
  { label: 'Warehouse', key: 'warehouse' },
  { label: 'Inv./Mov. Code', key: 'invCode' },
  { label: 'Label Of Movement', key: 'label' },
  { label: 'Type', key: 'type' },
  { label: 'Origin', key: 'origin' },
  { label: 'Cost Price', key: 'cost' },
  { label: 'Qty', key: 'qty', align: 'right' },
  { label: 'ZRA Status', key: 'zra' },
]
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

function sortValue(m: StockMovementRow, key: SortKey): string | number {
  switch (key) {
    case 'ref':
      return m.id
    case 'date':
      return m.dateFormatted
    case 'productRef':
      return m.productRef
    case 'productLabel':
      return m.productLabel
    case 'warehouse':
      return m.warehouseRef
    case 'invCode':
      return m.inventoryCode ?? ''
    case 'label':
      return m.label
    case 'type':
      return m.typeLabel
    case 'origin':
      return m.originRef
    case 'cost':
      return m.costPrice
    case 'qty':
      return Number(m.qty)
    case 'zra':
      return m.zraStatusDisplay
  }
}

// product/stock/movement_list.php ("List of Stock Movements"). See
// stockMovementsList.queries.ts's header comment: this is a real SPA backed
// by a genuine, complete JSON API (product/stock/ajax/movement_list_api.php),
// not classic HTML — every stat tile, filter option, table column and the
// bulk "Update to ZRA" action below is real, live-verified data.
export function StockMovementsListPage() {
  const warehouses = useWarehouses()
  const [warehouseId, setWarehouseId] = useState('')
  const [dateFrom, setDateFrom] = useState(firstOfMonth())
  const [dateTo, setDateTo] = useState(lastOfMonth())
  const [productId, setProductId] = useState('')
  const [batch, setBatch] = useState('')
  const [inventoryCode, setInventoryCode] = useState('')
  const [applied, setApplied] = useState<StockMovementFilters>({
    dateRange: `${fmtUs(firstOfMonth())}-${fmtUs(lastOfMonth())}`,
  })
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const { data, isLoading, isError, error } = useStockMovementsList({ ...applied, warehouseId: warehouseId || undefined })
  const bulkZra = useBulkUpdateZraStatus()

  const stats = data?.stats

  const filteredRows = useMemo(() => {
    const movements = data?.movements ?? []
    const q = search.trim().toLowerCase()
    if (!q) return movements
    return movements.filter(
      (m) => m.productRef.toLowerCase().includes(q) || m.productLabel.toLowerCase().includes(q) || m.label.toLowerCase().includes(q) || String(m.id).includes(q),
    )
  }, [data, search])

  const { sorted, sort, toggleSort } = useSortableRows<StockMovementRow, SortKey>(filteredRows, sortValue)
  const pageRows = sorted.slice((page - 1) * perPage, page * perPage)

  const productOptions = (data?.products ?? []).map((p) => ({ value: p.id, label: `${p.ref} — ${p.label}` }))

  function handleSearch() {
    setApplied({
      dateRange: `${fmtUs(dateFrom)}-${fmtUs(dateTo)}`,
      productId: productId || undefined,
      batch: batch || undefined,
      inventoryCode: inventoryCode || undefined,
    })
    setPage(1)
    setSelected(new Set())
  }

  function handleReset() {
    setProductId('')
    setBatch('')
    setInventoryCode('')
    setDateFrom(firstOfMonth())
    setDateTo(lastOfMonth())
    setApplied({ dateRange: `${fmtUs(firstOfMonth())}-${fmtUs(lastOfMonth())}` })
    setPage(1)
    setSelected(new Set())
  }

  function toggleAll() {
    if (selected.size === pageRows.length && pageRows.length > 0) setSelected(new Set())
    else setSelected(new Set(pageRows.map((r) => r.id)))
  }

  function toggleRow(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleBulkZra() {
    const rows = (data?.movements ?? []).filter((m) => selected.has(m.id)).map((m) => ({ rowid: m.id, inventoryCode: m.inventoryCode }))
    if (rows.length === 0) return
    if (!window.confirm(`Update ${rows.length} movement(s) to ZRA?`)) return
    bulkZra.mutate(rows, { onSuccess: () => setSelected(new Set()) })
  }

  function getExportData() {
    return {
      headers: COLUMNS.map((c) => c.label),
      rows: sorted.map((m) => [
        String(m.id),
        m.dateFormatted,
        m.productRef,
        m.productLabel,
        m.warehouseRef,
        m.inventoryCode || '—',
        m.label,
        m.typeLabel,
        m.originRef || '—',
        m.costPrice,
        m.qty,
        m.zraStatusDisplay,
      ]),
    }
  }

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <div>
          <p className="text-xs text-text-faint">Warehouse Stock Information</p>
          <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
            <Warehouse size={20} className="text-brand" /> List Of Stock Movements
          </h2>
        </div>
        <select value={warehouseId} onChange={(e) => { setWarehouseId(e.target.value); setPage(1) }} className={selectCls + ' w-56'}>
          <option value="">Select Warehouse</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.shortName || w.ref}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
        {isError && (
          <Card className="!bg-danger-bg border-danger/40 flex items-start gap-3">
            <AlertTriangle size={18} className="text-danger-fg shrink-0 mt-0.5" />
            <p className="text-sm text-danger-fg">{error instanceof Error ? error.message : 'Failed to load stock movements.'}</p>
          </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatTile label="Product Use For Sale" value={stats?.saleUseQty ?? 0} today={stats?.saleUseToday ?? 0} icon={ShoppingCart} />
          <StatTile label="Total Product Sold" value={stats?.soldQty ?? 0} today={stats?.soldToday ?? 0} icon={ShoppingCart} />
          <StatTile label="Total Purchase Done" value={stats?.purchaseQty ?? 0} today={stats?.purchaseToday ?? 0} icon={ShoppingBag} />
          <StatTile label="Stock Correction" value={stats?.correctionCount ?? 0} today={stats?.correctionToday ?? 0} icon={RefreshCw} />
        </div>

        <Card className="!h-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-xs text-text-faint mb-1">Movement Date</label>
              <div className="flex items-center gap-1.5">
                <input type="date" value={dateFrom.toISOString().slice(0, 10)} onChange={(e) => setDateFrom(new Date(e.target.value))} className={inputCls + ' flex-1'} />
                <span className="text-text-faint text-xs shrink-0">to</span>
                <input type="date" value={dateTo.toISOString().slice(0, 10)} onChange={(e) => setDateTo(new Date(e.target.value))} className={inputCls + ' flex-1'} />
              </div>
            </div>
            <div>
              <label className="block text-xs text-text-faint mb-1">Product</label>
              <SearchableSelect value={productId} onChange={setProductId} options={productOptions} placeholder="Search a product" />
            </div>
            <div>
              <label className="block text-xs text-text-faint mb-1">BatchNumberShort</label>
              <select value={batch} onChange={(e) => setBatch(e.target.value)} className={selectCls + ' w-full'}>
                <option value="">Select a Lot</option>
                {(data?.batches ?? []).map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-faint mb-1">Inv./Mov. Code</label>
              <select value={inventoryCode} onChange={(e) => setInventoryCode(e.target.value)} className={selectCls + ' w-full'}>
                <option value="">Select a Inv/Code</option>
                {(data?.inventoryCodes ?? []).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 mt-3">
            <button type="button" onClick={handleReset} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-muted hover:bg-surface-hover">
              <RotateCcw size={14} /> Reset
            </button>
            <button type="button" onClick={handleSearch} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
              <Search size={14} /> Search
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
            <TableExportButtons title="List Of Stock Movements" getExportData={getExportData} />
            {selected.size > 0 && (
              <button
                type="button"
                disabled={bulkZra.isPending}
                onClick={handleBulkZra}
                className="ml-auto flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
              >
                {bulkZra.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <CloudUpload size={14} />} Update {selected.size} to ZRA
              </button>
            )}
          </div>
          {bulkZra.isError && (
            <p className="px-4 py-2 text-xs text-danger border-b border-border">{bulkZra.error instanceof Error ? bulkZra.error.message : 'Could not update ZRA status.'}</p>
          )}
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <TheadRow>
                  <Th className="w-10">
                    <input type="checkbox" checked={pageRows.length > 0 && selected.size === pageRows.length} onChange={toggleAll} className="cursor-pointer" />
                  </Th>
                  {COLUMNS.map((col) => (
                    <Th key={col.key} sortKey={col.key} sort={sort} onSort={toggleSort} align={col.align} className="whitespace-nowrap">
                      {col.label}
                    </Th>
                  ))}
                </TheadRow>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={COLUMNS.length + 1} className="px-4 py-6 text-center text-text-faint">
                      <LoaderCircle size={16} className="inline animate-spin mr-2" /> Loading stock movements…
                    </td>
                  </tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMNS.length + 1} className="px-4 py-4 text-text-faint italic">
                      No Data Available In Table
                    </td>
                  </tr>
                ) : (
                  pageRows.map((m) => (
                    <tr key={m.id} className="border-b border-border hover:bg-surface-hover">
                      <td className="px-3 py-2.5">
                        <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggleRow(m.id)} className="cursor-pointer" />
                      </td>
                      <td className="px-4 py-2.5 text-brand font-medium whitespace-nowrap">{m.id}</td>
                      <td className="px-4 py-2.5 text-text-muted whitespace-nowrap">{m.dateFormatted}</td>
                      <td className="px-4 py-2.5 text-text-muted whitespace-nowrap">{m.productRef}</td>
                      <td className="px-4 py-2.5 text-text!">{m.productLabel}</td>
                      <td className="px-4 py-2.5 text-text-muted whitespace-nowrap">{m.warehouseRef}</td>
                      <td className="px-4 py-2.5 text-text-muted whitespace-nowrap">{m.inventoryCode || '—'}</td>
                      <td className="px-4 py-2.5 text-text-muted">{m.label}</td>
                      <td className="px-4 py-2.5 text-text-muted whitespace-nowrap">{m.typeLabel}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {m.originUrl.includes('facid=') ? (
                          <Link to={ROUTES.invoiceDetail.replace(':id', m.originUrl.match(/facid=(\d+)/)?.[1] ?? '')} className="text-brand hover:underline">
                            {m.originRef}
                          </Link>
                        ) : (
                          <span className="text-text-muted">{m.originRef || '—'}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-text-muted whitespace-nowrap">{m.costPrice || '—'}</td>
                      <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${Number(m.qty) >= 0 ? 'text-success' : 'text-danger'}`}>
                        {Number(m.qty) >= 0 ? '+' : ''}
                        {m.qty}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${m.zraStatusClass === 'badge-danger' ? 'bg-danger-bg text-danger-fg' : 'bg-success-bg text-success-fg'}`}
                          title={m.zraStatusDisplay}
                        >
                          {m.zraStatusDisplay || '—'}
                        </span>
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
