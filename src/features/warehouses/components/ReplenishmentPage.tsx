import { useMemo, useState } from 'react'
import { PackageSearch, Search, Filter, LoaderCircle, AlertTriangle, CheckCircle2, ShoppingCart } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { useVendorsSummary } from '../../vendors/vendors.queries'
import {
  useMissingStocks,
  useReplenishmentOrders,
  useCreateReplenishmentOrders,
  type MissingStockRow,
  type ReplenishmentOrderRow,
} from '../replenishment.queries'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const selectCls = inputCls + ' appearance-none'
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

type SortKey = 'ref' | 'label' | 'desired' | 'alert' | 'stock' | 'ordered' | 'toOrder'

const COLUMNS: { label: string; key?: SortKey; align?: 'right' }[] = [
  { label: 'Ref.', key: 'ref' },
  { label: 'Label', key: 'label' },
  { label: 'Desired Stock', key: 'desired', align: 'right' },
  { label: 'Limit For Alert', key: 'alert', align: 'right' },
  { label: 'Physical Stock', key: 'stock', align: 'right' },
  { label: 'Ordered', key: 'ordered', align: 'right' },
  { label: 'To Order', key: 'toOrder', align: 'right' },
  { label: 'Vendor SKU' },
]
const COLUMN_LABELS = ['', ...COLUMNS.map((c) => c.label)]

function sortValue(r: MissingStockRow, key: SortKey): string | number {
  switch (key) {
    case 'ref':
      return r.ref
    case 'label':
      return r.label
    case 'desired':
      return r.desiredStock
    case 'alert':
      return r.limitForAlert
    case 'stock':
      return r.stock
    case 'ordered':
      return r.ordered
    case 'toOrder':
      return r.toOrderDefault
  }
}

interface RowState {
  checked: boolean
  qty: number
  vendorPriceId: number
}

function MissingStocksTab({ onViewOrdersFor }: { onViewOrdersFor: (productId: number) => void }) {
  const [mode, setMode] = useState<'virtual' | 'physical'>('virtual')
  const [supplierDraft, setSupplierDraft] = useState('')
  const [fkSupplier, setFkSupplier] = useState<number | undefined>(undefined)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [rowState, setRowState] = useState<Map<number, RowState>>(new Map())

  const { data, isLoading, isError, error } = useMissingStocks({ mode, fkSupplier })
  const vendors = useVendorsSummary()
  const createOrders = useCreateReplenishmentOrders()

  const rows = useMemo(() => data?.rows ?? [], [data])
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => r.ref.toLowerCase().includes(q) || r.label.toLowerCase().includes(q))
  }, [rows, search])
  const { sorted, sort, toggleSort } = useSortableRows<MissingStockRow, SortKey>(filtered, sortValue)
  const pageRows = sorted.slice((page - 1) * perPage, page * perPage)

  function stateFor(r: MissingStockRow): RowState {
    return (
      rowState.get(r.productId) ?? {
        checked: false,
        qty: r.toOrderDefault,
        vendorPriceId: r.vendorOptions.find((o) => o.selected)?.value ?? r.vendorOptions[0]?.value ?? 0,
      }
    )
  }
  function patchRow(r: MissingStockRow, patch: Partial<RowState>) {
    setRowState((prev) => {
      const next = new Map(prev)
      next.set(r.productId, { ...stateFor(r), ...patch })
      return next
    })
  }

  const selectedLines = rows
    .map((r) => ({ row: r, state: rowState.get(r.productId) }))
    .filter((x): x is { row: MissingStockRow; state: RowState } => !!x.state?.checked && x.state.qty > 0 && x.state.vendorPriceId > 0)

  function handleFilter() {
    setFkSupplier(supplierDraft ? Number(supplierDraft) : undefined)
    setPage(1)
  }

  function handleCreateOrders() {
    if (!data || selectedLines.length === 0) return
    if (!window.confirm(`Create purchase order(s) for ${selectedLines.length} selected product(s)?`)) return
    createOrders.mutate(
      { token: data.token, lines: selectedLines.map((l) => ({ productId: l.row.productId, vendorPriceId: l.state.vendorPriceId, qty: l.state.qty })) },
      { onSuccess: () => setRowState(new Map()) },
    )
  }

  function getExportData() {
    return {
      headers: COLUMN_LABELS.slice(1),
      rows: sorted.map((r) => [
        r.ref,
        r.label,
        String(r.desiredStock),
        String(r.limitForAlert),
        String(r.stock),
        String(r.ordered),
        String(stateFor(r).qty),
        r.hasVendorPrice ? r.vendorOptions.map((o) => o.label).join(' | ') : 'No vendor price/qty defined',
      ]),
    }
  }

  return (
    <>
    <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
      <Card className="!h-auto">
        <p className="text-sm text-text-muted mb-3">
          This is a list of all products with a stock lower than desired stock (or lower than the alert value). Check a row, pick a vendor and quantity, then create purchase orders to fill the difference.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium text-text-faint">Current selection mode:</span>
          <div className="flex rounded-lg border border-input-border overflow-hidden">
            <button
              type="button"
              onClick={() => setMode('virtual')}
              className={`px-3 py-1.5 text-sm font-medium ${mode === 'virtual' ? 'bg-brand text-white' : 'bg-transparent text-text-muted hover:bg-surface-hover'}`}
            >
              Use virtual stock
            </button>
            <button
              type="button"
              onClick={() => setMode('physical')}
              className={`px-3 py-1.5 text-sm font-medium ${mode === 'physical' ? 'bg-brand text-white' : 'bg-transparent text-text-muted hover:bg-surface-hover'}`}
            >
              Use physical stock
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3 mt-3">
          <div>
            <label className="block text-xs text-text-faint mb-1">Supplier</label>
            <select value={supplierDraft} onChange={(e) => setSupplierDraft(e.target.value)} className={selectCls + ' w-56'}>
              <option value="">All vendors</option>
              {vendors.data?.vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
          <button type="button" onClick={handleFilter} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
            <Filter size={14} /> Filter
          </button>
        </div>
      </Card>

      {isError && (
        <Card className="!bg-danger-bg border-danger/40 flex items-start gap-3">
          <AlertTriangle size={18} className="text-danger-fg shrink-0 mt-0.5" />
          <p className="text-sm text-danger-fg">{error instanceof Error ? error.message : 'Failed to load missing stocks.'}</p>
        </Card>
      )}
      {createOrders.isError && (
        <Card className="!bg-danger-bg border-danger/40 flex items-start gap-3">
          <AlertTriangle size={18} className="text-danger-fg shrink-0 mt-0.5" />
          <p className="text-sm text-danger-fg">{(createOrders.error as Error).message}</p>
        </Card>
      )}
      {createOrders.isSuccess && (
        <Card className="!bg-success-bg border-success/40 flex items-start gap-3">
          <CheckCircle2 size={18} className="text-success-fg shrink-0 mt-0.5" />
          <p className="text-sm text-success-fg">Purchase order(s) created — see the Replenishment Orders tab.</p>
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
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search ref or label…"
              className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text pl-8 pr-3 py-1.5"
            />
          </div>
          <TableExportButtons title="Missing Stocks" getExportData={getExportData} />
          {selectedLines.length > 0 && (
            <button
              type="button"
              disabled={createOrders.isPending}
              onClick={handleCreateOrders}
              className="ml-auto flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
            >
              {createOrders.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <ShoppingCart size={14} />} Create Orders ({selectedLines.length})
            </button>
          )}
        </div>
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <TheadRow>
                <Th className="w-10" />
                {COLUMNS.map((col) => (
                  <Th key={col.label} sortKey={col.key} sort={sort} onSort={toggleSort} align={col.align} className="whitespace-nowrap">
                    {col.label}
                  </Th>
                ))}
              </TheadRow>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={COLUMN_LABELS.length} className="px-3 py-6 text-center text-text-faint">
                    <LoaderCircle size={16} className="inline animate-spin mr-2" /> Loading…
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={COLUMN_LABELS.length} className="px-3 py-4 text-text-faint italic">
                    No products are below their desired stock or alert threshold.
                  </td>
                </tr>
              ) : (
                pageRows.map((r) => {
                  const state = stateFor(r)
                  return (
                    <tr key={r.productId} className="border-b border-border hover:bg-surface-hover">
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={state.checked}
                          disabled={!r.hasVendorPrice}
                          title={r.hasVendorPrice ? undefined : 'No vendor price defined for this product — cannot be ordered.'}
                          onChange={(e) => patchRow(r, { checked: e.target.checked })}
                        />
                      </td>
                      <td className="px-3 py-2.5 text-brand font-medium whitespace-nowrap">{r.ref}</td>
                      <td className="px-3 py-2.5 text-text!">{r.label}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-text-muted">{r.desiredStock}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-text-muted">{r.limitForAlert}</td>
                      <td className={`px-3 py-2.5 text-right tabular-nums font-medium ${r.belowAlert ? 'text-danger' : 'text-text!'}`}>{r.stock}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        <button type="button" onClick={() => onViewOrdersFor(r.productId)} className="text-brand hover:underline">
                          {r.ordered}
                        </button>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <input
                          type="number"
                          min={0}
                          value={state.qty}
                          onChange={(e) => patchRow(r, { qty: Number(e.target.value) || 0 })}
                          className="w-20 h-8 px-2 rounded-md border border-input-border bg-input-bg text-text text-sm text-right outline-none focus:ring-2 focus:ring-brand/30"
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        {r.hasVendorPrice ? (
                          <select
                            value={state.vendorPriceId}
                            onChange={(e) => patchRow(r, { vendorPriceId: Number(e.target.value) })}
                            className={selectCls + ' w-full max-w-56'}
                          >
                            {r.vendorOptions.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-text-faint text-xs">-- No vendor price/qty defined --</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
      <ListPagination page={page} perPage={perPage} total={sorted.length} onPageChange={setPage} edgeToEdge />
    </>
  )
}

const ORDER_COLUMNS = ['Ref.', 'Company', 'Author', 'Amount (Inc. Tax)', 'Order Creation', 'Status']

// Codes match CommandeFournisseur::LibStatut mode 5 (see purchaseOrderListParser.ts's
// STATUS_LABELS): 0 draft, 1 validated, 2 approved, 3 ordered/standby
// reception, 4 partially received, 5 all products received, 6 canceled, 9 refused.
function statusBadgeClass(code: number | null) {
  switch (code) {
    case 0:
    case 6:
      return 'bg-surface-hover text-text-muted'
    case 1:
    case 3:
      return 'bg-info-bg text-info-fg'
    case 2:
    case 4:
      return 'bg-warning-bg text-warning-fg'
    case 5:
      return 'bg-success-bg text-success-fg'
    case 9:
      return 'bg-danger-bg text-danger-fg'
    default:
      return 'bg-surface-hover text-text-muted'
  }
}

function ReplenishmentOrdersTab({ searchProduct, onClearFilter }: { searchProduct: number | null; onClearFilter: () => void }) {
  const [page, setPage] = useState(1)
  const perPage = 25
  const { data, isLoading, isError, error } = useReplenishmentOrders(searchProduct ?? undefined)
  const rows = data ?? []
  const pageRows = rows.slice((page - 1) * perPage, page * perPage)

  function getExportData() {
    return {
      headers: ORDER_COLUMNS,
      rows: rows.map((r: ReplenishmentOrderRow) => [r.ref, r.company, r.author, String(r.amountIncTax), r.orderCreation, r.statusLabel]),
    }
  }

  return (
    <>
    <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
      {searchProduct && (
        <div className="flex items-center gap-2 rounded-lg bg-info-bg text-info-fg px-4 py-2.5 text-sm">
          Showing orders containing product #{searchProduct}.
          <button type="button" onClick={onClearFilter} className="ml-auto text-xs font-medium hover:underline">
            Clear filter
          </button>
        </div>
      )}
      {isError && (
        <Card className="!bg-danger-bg border-danger/40 flex items-start gap-3">
          <AlertTriangle size={18} className="text-danger-fg shrink-0 mt-0.5" />
          <p className="text-sm text-danger-fg">{error instanceof Error ? error.message : 'Failed to load replenishment orders.'}</p>
        </Card>
      )}
      <Card className="!p-0 overflow-hidden flex-1 min-h-0">
        <div className="flex items-center justify-between gap-3 p-4 border-b border-border">
          <p className="text-sm text-text-muted">This is a list of all open purchase orders including predefined products.</p>
          <TableExportButtons title="Replenishment Orders" getExportData={getExportData} />
        </div>
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <TheadRow>
                {ORDER_COLUMNS.map((c) => (
                  <Th key={c} className="whitespace-nowrap">
                    {c}
                  </Th>
                ))}
              </TheadRow>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={ORDER_COLUMNS.length} className="px-3 py-6 text-center text-text-faint">
                    <LoaderCircle size={16} className="inline animate-spin mr-2" /> Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={ORDER_COLUMNS.length} className="px-3 py-4 text-text-faint italic">
                    No open purchase orders with predefined products.
                  </td>
                </tr>
              ) : (
                pageRows.map((r) => (
                  <tr key={r.id} className="border-b border-border hover:bg-surface-hover">
                    <td className="px-3 py-2.5 text-brand font-medium whitespace-nowrap">{r.ref}</td>
                    <td className="px-3 py-2.5 text-text!">{r.company}</td>
                    <td className="px-3 py-2.5 text-text-muted">{r.author}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-text!">{r.amountIncTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="px-3 py-2.5 text-text-muted whitespace-nowrap">{r.orderCreation}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(r.statusCode)}`}>{r.statusLabel}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
      <ListPagination page={page} perPage={perPage} total={rows.length} onPageChange={setPage} edgeToEdge />
    </>
  )
}

export function ReplenishmentPage() {
  const [tab, setTab] = useState<'missing' | 'orders'>('missing')
  const [searchProduct, setSearchProduct] = useState<number | null>(null)

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <PackageSearch size={20} className="text-brand" /> Replenishment
        </h2>
      </div>

      <div className="flex items-center gap-1 border-b border-border px-6 pt-3 bg-white dark:bg-gray-950">
        <button
          type="button"
          onClick={() => setTab('missing')}
          className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${tab === 'missing' ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-text'}`}
        >
          Missing Stocks
        </button>
        <button
          type="button"
          onClick={() => setTab('orders')}
          className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${tab === 'orders' ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-text'}`}
        >
          Replenishment Orders
        </button>
      </div>
      {tab === 'missing' ? (
        <MissingStocksTab
          onViewOrdersFor={(productId) => {
            setSearchProduct(productId)
            setTab('orders')
          }}
        />
      ) : (
        <ReplenishmentOrdersTab searchProduct={searchProduct} onClearFilter={() => setSearchProduct(null)} />
      )}
    </div>
  )
}
