import { useMemo, useState } from 'react'
import { Warehouse, ShoppingCart, ShoppingBag, Tag, RefreshCw, Search } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { useProductOptions } from '../../products/products.queries'
import { useRecentMovements, type StockMovement } from '../warehouses.queries'
import { useWarehouses } from '../warehouseExtras.queries'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const selectCls = inputCls + ' appearance-none'

function StatTile({ label, value, caption, icon: Icon }: { label: string; value: string | number; caption: string; icon: typeof Warehouse }) {
  return (
    <Card className="!p-3 !flex-row items-center justify-between gap-3">
      <div>
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-text! mt-1">{value}</p>
        <p className="text-xs text-text-faint mt-0.5">{caption}</p>
      </div>
      <span className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-brand/10 text-brand">
        <Icon size={18} />
      </span>
    </Card>
  )
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-ZM', { day: '2-digit', month: 'short', year: 'numeric' })
}

type SortKey = 'ref' | 'date' | 'productRef' | 'productLabel' | 'lotSerial' | 'warehouse' | 'type' | 'reason' | 'qty'

const COLUMNS: { label: string; key: SortKey; align?: 'right' }[] = [
  { label: 'Ref.', key: 'ref' },
  { label: 'Date', key: 'date' },
  { label: 'Product Ref.', key: 'productRef' },
  { label: 'Product Label', key: 'productLabel' },
  { label: 'Lot/Serial', key: 'lotSerial' },
  { label: 'Warehouse', key: 'warehouse' },
  { label: 'Type', key: 'type' },
  { label: 'Label Of Movement', key: 'reason' },
  { label: 'Qty', key: 'qty', align: 'right' },
]
const COLUMN_LABELS = COLUMNS.map((c) => c.label)
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

// No general-purpose stock-movement ledger endpoint exists on this backend
// (the only real /api/zra/stock-movements/* endpoints are ZRA
// tax-filing-shaped, not this warehouse ledger — see warehouses.queries.ts
// header comments). Rows shown here ARE real, though: Stock Correction,
// Stock Transfer, and Mass Stock Transfer all record into the same local
// ledger (useRecordStockMovement/useRecordStockMovements) that this page
// reads from, so anything recorded there shows up here immediately — it's
// genuinely session-persisted, just not written back to the real backend.
export function StockMovementsListPage() {
  const { data: products } = useProductOptions()
  const warehouses = useWarehouses()
  const movements = useRecentMovements(500)
  const now = new Date()
  const [dateRange, setDateRange] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01 - ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, '0')}`,
  )
  const [productRef, setProductRef] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)

  const warehouseLabel = (ref?: string) => warehouses.find((w) => w.ref === ref)?.shortName || ref || '-'

  function matchesSearch(m: StockMovement, query: string) {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return [m.ref, m.productRef, m.productLabel, m.lotSerial || '', warehouseLabel(m.warehouseRef), m.type || m.reason, m.reason].some((field) =>
      field.toLowerCase().includes(q),
    )
  }

  function sortValue(m: StockMovement, key: SortKey): string | number {
    switch (key) {
      case 'ref':
        return m.ref
      case 'date':
        return m.date
      case 'productRef':
        return m.productRef
      case 'productLabel':
        return m.productLabel
      case 'lotSerial':
        return m.lotSerial || ''
      case 'warehouse':
        return warehouseLabel(m.warehouseRef)
      case 'type':
        return m.type || m.reason
      case 'reason':
        return m.reason
      case 'qty':
        return m.delta
    }
  }

  const filtered = useMemo(
    () => (productRef ? movements.filter((m) => m.productRef === productRef) : movements).filter((m) => matchesSearch(m, search)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [movements, productRef, search, warehouses],
  )
  const { sorted: sortedMovements, sort, toggleSort } = useSortableRows<StockMovement, SortKey>(filtered, sortValue)
  const pageMovements = sortedMovements.slice((page - 1) * perPage, page * perPage)

  const today = now.toISOString().slice(0, 10)
  const isToday = (iso: string) => iso.slice(0, 10) === today
  const stockCorrections = movements.filter((m) => m.type === 'Correction')
  const lotUsed = movements.filter((m) => m.lotSerial).length
  const lotUsedToday = movements.filter((m) => m.lotSerial && isToday(m.date)).length

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handlePerPageChange(value: number) {
    setPerPage(value)
    setPage(1)
  }

  function getExportData() {
    const rows = sortedMovements.map((m) => [
      m.ref,
      fmtDate(m.date),
      m.productRef,
      m.productLabel,
      m.lotSerial || '-',
      warehouseLabel(m.warehouseRef),
      m.type || m.reason,
      m.reason,
      `${m.delta >= 0 ? '+' : ''}${m.delta}`,
    ])
    return { headers: COLUMN_LABELS, rows }
  }

  return (
    // -m-6 + flex-1 flex-col: same pattern as ThirdPartyList.tsx / StickyFormShell.tsx.
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <div>
          <p className="text-xs text-text-faint">Warehouse Stock Information</p>
          <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
            <Warehouse size={20} className="text-brand" /> List Of Stock Movements
          </h2>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          <StatTile label="Product Use For Sale" value="0 Qty" caption="Today: 0 Qty" icon={ShoppingCart} />
          <StatTile label="Total Product Sold" value="0 Qty" caption="Today: 0 Qty" icon={ShoppingCart} />
          <StatTile label="Total Purchase Done" value="0 Qty" caption="Today: 0 Qty" icon={ShoppingBag} />
          <StatTile label="Total Lot Used" value={`${lotUsed} Lots`} caption={`Today: ${lotUsedToday} Lots`} icon={Tag} />
          <StatTile label="Stock Correction Count" value={`${stockCorrections.length} Movements`} caption={`Today: ${stockCorrections.filter((m) => isToday(m.date)).length} Movements`} icon={RefreshCw} />
        </div>

        <Card className="!h-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-xs text-text-faint mb-1">Movement Date</label>
              <input value={dateRange} onChange={(e) => setDateRange(e.target.value)} className={inputCls + ' w-full'} />
            </div>
            <div>
              <label className="block text-xs text-text-faint mb-1">Product ref.</label>
              <select value={productRef} onChange={(e) => setProductRef(e.target.value)} className={selectCls + ' w-full'}>
                <option value="">Select Predefined Product/services</option>
                {(products ?? []).map((p) => (
                  <option key={p.id} value={p.ref}>
                    {p.ref} — {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-faint mb-1">Lot/Serial</label>
              <select className={selectCls + ' w-full'} disabled>
                <option>Select a Lot</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-faint mb-1">Inv./Mov. Code</label>
              <select className={selectCls + ' w-full'} disabled>
                <option>Select a Inv/Code</option>
              </select>
            </div>
          </div>
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
            <TableExportButtons title="List Of Stock Movements" getExportData={getExportData} />
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <TheadRow>
                  {COLUMNS.map((col) => (
                    <Th key={col.key} sortKey={col.key} sort={sort} onSort={toggleSort} align={col.align} className="whitespace-nowrap">
                      {col.label}
                    </Th>
                  ))}
                </TheadRow>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMN_LABELS.length} className="px-4 py-4 text-text-faint italic">
                      {movements.length === 0 ? 'No Data Available In Table' : 'No movements match these filters.'}
                    </td>
                  </tr>
                ) : (
                  pageMovements.map((m) => (
                    <tr key={m.ref} className="border-b border-border hover:bg-surface-hover">
                      <td className="px-4 py-2.5 text-brand font-medium whitespace-nowrap">{m.ref}</td>
                      <td className="px-4 py-2.5 text-text-muted whitespace-nowrap">{fmtDate(m.date)}</td>
                      <td className="px-4 py-2.5 text-text-muted whitespace-nowrap">{m.productRef}</td>
                      <td className="px-4 py-2.5 text-text!">{m.productLabel}</td>
                      <td className="px-4 py-2.5 text-text-muted whitespace-nowrap">{m.lotSerial || '-'}</td>
                      <td className="px-4 py-2.5 text-text-muted whitespace-nowrap">{warehouseLabel(m.warehouseRef)}</td>
                      <td className="px-4 py-2.5 text-text-muted whitespace-nowrap">{m.type || m.reason}</td>
                      <td className="px-4 py-2.5 text-text-muted">{m.reason}</td>
                      <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${m.delta >= 0 ? 'text-success' : 'text-danger'}`}>{m.delta >= 0 ? '+' : ''}{m.delta}</td>
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
