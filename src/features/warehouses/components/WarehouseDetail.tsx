import { useState, useRef, useEffect, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronsLeft,
  ChevronRight,
  ChevronsRight,
  X,
  Warehouse,
  Pencil,
  Trash2,
  ArrowLeftRight,
  FilePenLine,
  Paperclip,
  CalendarClock,
  UploadCloud,
  Plus,
  PackageOpen,
  ShoppingCart,
  Truck,
  Tag,
  RotateCw,
  Printer,
  FileSpreadsheet,
  Filter,
  RotateCcw,
  Calendar,
  Package,
  Barcode,
  MapPin,
  LoaderCircle,
  FileCog,
  Search as SearchIcon,
  type LucideIcon,
} from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Avatar } from '../../../shared/components/Avatar'
import { ROUTES } from '../../../routes'
import { formatMoney } from '../../../utils/format'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useAllProductsRich } from '../../products/products.queries'
import { useWarehouseDetail, useWarehouseMovements, useWarehouseEvents, useGenerateWarehouseDoc, type WarehouseMovementFilters } from '../warehouseExtras.queries'
import type { WarehouseProductRow } from '../warehouseHtmlParser'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { getPageNumbers } from '../../../shared/components/ListPagination'
import { stripBackendPrefix } from '../../customers/customerDetailTabs.queries'
import { WarehouseEditModal } from './WarehouseEditModal'
import { AddEventModal } from '../../agenda/components/AddEventModal'

// Native rebuild of product/stock/card.php?id=X plus its two sibling tabs,
// Stock Movements (movement_list.php — a JS SPA shell backed by a real JSON
// API, product/stock/ajax/movement_list_api.php) and Events (events.php,
// scraped like the Warehouse tab itself) — see warehouseHtmlParser.ts for
// how each was verified against the real backend source, not guessed from
// screenshots. Transfer stock/Correct stock/Update to ZRA (header actions)
// and the per-product Stock movement/Stock correction links stay
// legacy-modal-driven and route out to the real legacy pages, same
// "link out for a not-yet-natively-built action" convention used elsewhere.

type WarehouseTab = 'warehouse' | 'movements' | 'events'

const TABS: { key: WarehouseTab; label: string; icon: LucideIcon }[] = [
  { key: 'warehouse', label: 'Warehouse', icon: Warehouse },
  { key: 'movements', label: 'Stock Movements', icon: ArrowLeftRight },
  { key: 'events', label: 'Events', icon: CalendarClock },
]

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 border-b border-border last:border-0">
      <span className="text-xs text-text-faint shrink-0">{label}</span>
      <span className="text-sm text-text! text-right">{value || <span className="text-text-faint">—</span>}</span>
    </div>
  )
}

// Matches the real .ec-meta-item pills on product/stock/card.php's own
// header banner (icon + label + bold value) — verified live (warehouse
// id=9): fa-boxes-stacked/fa-cubes/fa-money-bill/fa-clock, in this order.
// Matches CustomerDetail.tsx's own StatTile exactly (label/value pair in the
// header's stat row) — named differently here only because this file's own
// Stock Movements tab already has an unrelated icon-based StatTile.
function HeaderStatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 min-w-[120px]">
      <p className="text-xs text-text-faint uppercase tracking-wide">{label}</p>
      <p className="text-lg font-bold text-text! mt-0.5">{value}</p>
    </div>
  )
}

export function WarehouseDetail() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, isError, error, refetch } = useWarehouseDetail(id)
  const [tab, setTab] = useState<WarehouseTab>('warehouse')
  const [productSearchId, setProductSearchId] = useState('')
  const [appliedProductSearchId, setAppliedProductSearchId] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)
  // The real Product Search select (card.php's own select_produits() call)
  // lists the WHOLE product catalog, not just products already stocked
  // here — confirmed live: "mtm" (0 products) still offers a full searchable
  // list, and picking one not stocked in this warehouse legitimately comes
  // back empty (its own SQL just ANDs "p.rowid = selected" onto the
  // already-warehouse-scoped query). Reuses the same real catalog endpoint
  // ProductsList.tsx uses; best-effort — falls back to this warehouse's own
  // (smaller) product list if it fails, so the control never sits empty.
  const { data: allProducts } = useAllProductsRich(0)

  if (isLoading) {
    return (
      <div className="-m-6 flex-1 flex flex-col min-h-0 p-6">
        <LegacyLoadingCard label="Loading warehouse…" />
      </div>
    )
  }
  if (isError || !data) {
    return (
      <div className="-m-6 flex-1 flex flex-col min-h-0 p-6">
        <LegacyErrorCard title="Couldn't load warehouse" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
      </div>
    )
  }

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0 overflow-x-hidden">
      <div className="sticky -top-6 z-10 -mx-6 flex items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <Link to={ROUTES.warehouseList} className="flex items-center gap-1.5 text-sm text-text-faint hover:text-text" title="Back to list">
          <ChevronLeft size={18} /> Warehouses
        </Link>
        <Link to={ROUTES.warehouseList} className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-text" title="Close">
          <X size={18} />
        </Link>
      </div>

      {/* Unified "identity card" header — avatar, name/status, id/location,
          real stats, pill tab bar — matching the same polished layout as
          CustomerDetail.tsx (see its own StatTile/pill-tab-bar pattern),
          instead of the previous two-separate-Cards + underline-tabs look.
          Every value shown is the same real data as before, just restyled;
          the three real "reuses the Stock Movements tab" shortcuts (see the
          Transfer stock/Correct stock/Update to ZRA comment they used to
          carry) become icon buttons alongside Edit/Delete/Close rather than
          full-width bordered buttons, since the reference layout keeps
          header actions compact and icon-only. */}
      <div className="sticky top-0 z-10 -mx-6 pt-4 pb-2 bg-white dark:bg-gray-950">
        <div className="px-6">
          <Card className="!h-auto">
            <div className="flex flex-wrap items-start justify-between gap-4 p-4 border-b border-border">
              <div className="flex items-start gap-4 min-w-[240px] flex-1">
                <span className="flex items-center justify-center w-16 h-16 rounded-lg bg-brand text-white shrink-0">
                  <Warehouse size={28} />
                </span>
                <div className="space-y-1.5 pt-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-text!">{data.ref}</h2>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${data.statusLabel === 'Open' ? 'bg-success-bg text-success-fg' : 'bg-neutral-bg text-neutral-fg'}`}>
                      {data.statusLabel}
                    </span>
                  </div>
                  <p className="text-xs text-text-faint">
                    #{data.id}
                    {data.description && ` · ${data.description}`}
                  </p>
                  {data.locationSummary && (
                    <p className="flex items-center gap-1 text-xs text-text-faint">
                      <MapPin size={12} /> {data.locationSummary}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {/* Real card.php reuses movement_list.php's header markup for
                    these three buttons, but never loads movement_list_app.js
                    (which defines window.EcMovementApp, confirmed by reading
                    card.php's own source) — so on the real Warehouse tab
                    these are silently dead JS calls. They only work on the
                    Stock Movements tab, which does load that script, so
                    these route there instead of replicating the real page's
                    broken buttons. */}
                <Link to={`${ROUTES.stockMovements}?id=${data.id}`} title="Transfer stock" className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-text">
                  <ArrowLeftRight size={16} />
                </Link>
                <Link to={`${ROUTES.stockMovements}?id=${data.id}`} title="Correct stock" className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-text">
                  <FilePenLine size={16} />
                </Link>
                <Link to={`${ROUTES.stockMovements}?id=${data.id}`} title="Update to ZRA" className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-text">
                  <UploadCloud size={16} />
                </Link>
                <span className="w-px h-5 bg-border mx-1" />
                {data.editUrl && (
                  <button type="button" onClick={() => setShowEditModal(true)} title="Edit" className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-text">
                    <Pencil size={16} />
                  </button>
                )}
                {data.deleteUrl ? (
                  <a href={stripBackendPrefix(data.deleteUrl)} target="_blank" rel="noreferrer" title="Delete" className="p-1.5 rounded-md text-text-faint hover:bg-danger-bg hover:text-danger-fg">
                    <Trash2 size={16} />
                  </a>
                ) : (
                  data.deleteRefusedTitle && (
                    <span title={data.deleteRefusedTitle} className="p-1.5 rounded-md text-text-faint/50 cursor-not-allowed">
                      <Trash2 size={16} />
                    </span>
                  )
                )}
                <Link to={ROUTES.warehouseList} title="Close" className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-text">
                  <X size={16} />
                </Link>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 px-4 py-3 border-b border-border">
              <HeaderStatTile label="Total Products" value={String(data.totalProductsCount)} />
              <HeaderStatTile label="Different Products" value={String(data.differentProductsCount)} />
              <HeaderStatTile label="Input Stock Value" value={formatMoney(data.inputStockValue)} />
              <HeaderStatTile label="Latest Movement" value={data.latestMovement || 'None'} />
            </div>

            <div className="border-t border-border px-3 py-2.5">
              <div className="flex items-center gap-1 bg-surface rounded-full p-1 w-fit">
                {TABS.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTab(key)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                      tab === key ? 'bg-brand text-white shadow-sm shadow-brand/25' : 'text-text-muted hover:text-text hover:bg-surface-hover'
                    }`}
                  >
                    <Icon size={14} className="shrink-0" /> {label}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden -mx-6 px-6 py-4 space-y-4 no-scrollbar">
        {tab === 'warehouse' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="!h-auto">
                <InfoRow label="Environment" value={data.environment} />
                {data.parentWarehouseName && (
                  <InfoRow
                    label="Parent warehouse"
                    value={
                      <a href={stripBackendPrefix(data.parentWarehouseUrl)} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                        {data.parentWarehouseName}
                      </a>
                    }
                  />
                )}
                <InfoRow label="Description" value={data.description} />
                <InfoRow label="Number of different products" value={String(data.differentProductsCount)} />
                <InfoRow label="Total number of products" value={String(data.totalProductsCount)} />
              </Card>
              <Card className="!h-auto">
                <InfoRow label="Input stock value" value={formatMoney(data.inputStockValue)} />
                <InfoRow label="Latest movement" value={data.latestMovement || 'None'} />
                <InfoRow label="Tags/categories" value={data.tags.length > 0 ? data.tags.join(', ') : ''} />
              </Card>
            </div>

            <Card className="!h-auto !p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <h3 className="font-semibold text-text!">Products in this warehouse</h3>
              </div>
              <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-border">
                <label className="text-sm text-text-faint">Product Search :</label>
                <select
                  value={productSearchId}
                  onChange={(e) => setProductSearchId(e.target.value)}
                  className="min-w-[240px] rounded-md border border-input-border bg-input-bg px-2 py-1.5 text-sm text-text"
                >
                  <option value="">Select Predefined Product/services</option>
                  {(allProducts ?? data.products.map((p) => ({ id: String(p.id), ref: p.ref, name: p.label }))).map((p) => (
                    <option key={p.id} value={p.id}>{p.ref} — {p.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setAppliedProductSearchId(productSearchId)}
                  className="px-4 py-1.5 rounded-md text-sm font-medium bg-brand text-white hover:bg-brand-hover"
                >
                  Search
                </button>
                {appliedProductSearchId && (
                  <button
                    type="button"
                    onClick={() => { setProductSearchId(''); setAppliedProductSearchId('') }}
                    className="text-sm text-text-faint hover:text-text"
                  >
                    Clear
                  </button>
                )}
              </div>
              <WarehouseProductsTable
                products={appliedProductSearchId ? data.products.filter((p) => String(p.id) === appliedProductSearchId) : data.products}
                emptyMessage={appliedProductSearchId ? 'No matching product found in this warehouse.' : 'No products in this warehouse.'}
              />
            </Card>
          </>
        )}

        {tab === 'movements' && <WarehouseMovementsTab warehouseId={data.id} />}
        {tab === 'events' && <WarehouseEventsTab warehouseId={data.id} warehouseRef={data.ref} />}
      </div>

      {showEditModal && <WarehouseEditModal id={String(data.id)} warehouseRef={data.ref} onClose={() => setShowEditModal(false)} />}
    </div>
  )
}

// The real card.php table has none of this (no search box, no per-page
// selector, no sortable headers, no export, no scroll cap) — it just prints
// every stocked product in one static table. Added here as a real, client-
// side-only enhancement over the already-real `data.products` rows (same
// convention as every other list table in this app: fetch once, then
// search/sort/paginate/export in the browser) so a warehouse with a large
// catalog doesn't render an unbounded page-height table with no way to find
// a specific row.
const PRODUCT_TABLE_PAGE_SIZES = [10, 15, 25, 50, 100]
type ProductSortKey = 'product' | 'units' | 'weightedAvgPrice' | 'inputStockValue' | 'sellingUnitPrice' | 'valueForSell'

const PRODUCT_COLUMNS: { label: string; key: ProductSortKey; align?: 'right' }[] = [
  { label: 'Product', key: 'product' },
  { label: 'Units', key: 'units', align: 'right' },
  { label: 'Weighted Avg. Price', key: 'weightedAvgPrice', align: 'right' },
  { label: 'Input Stock Value', key: 'inputStockValue', align: 'right' },
  { label: 'Selling Unit Price', key: 'sellingUnitPrice', align: 'right' },
  { label: 'Value For Sell', key: 'valueForSell', align: 'right' },
]

function productSortValue(row: WarehouseProductRow, key: ProductSortKey): string | number {
  switch (key) {
    case 'product':
      return row.label
    case 'units':
      return row.units
    case 'weightedAvgPrice':
      return row.weightedAvgPrice
    case 'inputStockValue':
      return row.inputStockValue
    case 'sellingUnitPrice':
      return row.sellingUnitPrice
    case 'valueForSell':
      return row.valueForSell
  }
}

function WarehouseProductsTable({ products, emptyMessage }: { products: WarehouseProductRow[]; emptyMessage: string }) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)

  const filtered = products.filter((p) => {
    const q = search.trim().toLowerCase()
    return !q || p.label.toLowerCase().includes(q) || p.ref.toLowerCase().includes(q)
  })
  const { sorted, sort, toggleSort } = useSortableRows<WarehouseProductRow, ProductSortKey>(filtered, productSortValue)

  const total = sorted.length
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const currentPage = Math.min(page, totalPages)
  const pageRows = sorted.slice((currentPage - 1) * perPage, currentPage * perPage)
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * perPage + 1
  const rangeEnd = Math.min(currentPage * perPage, total)

  function getExportData() {
    return {
      headers: ['#', 'Product', 'Ref', ...PRODUCT_COLUMNS.slice(1).map((c) => c.label), 'Stock Movement', 'Stock Correction'],
      rows: sorted.map((p, i) => [
        String(i + 1),
        p.label,
        p.ref,
        String(p.units),
        formatMoney(p.weightedAvgPrice),
        formatMoney(p.inputStockValue),
        formatMoney(p.sellingUnitPrice),
        formatMoney(p.valueForSell),
        p.transferUrl ? 'Yes' : '',
        p.correctionUrl ? 'Yes' : '',
      ]),
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-border">
        <select
          value={perPage}
          onChange={(e) => {
            setPerPage(Number(e.target.value))
            setPage(1)
          }}
          className="h-9 px-2 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30"
        >
          {PRODUCT_TABLE_PAGE_SIZES.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <TableExportButtons title="Products In Warehouse" getExportData={getExportData} />
        <div className="relative flex-1 min-w-[200px] max-w-80 sm:ml-auto">
          <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Search product…"
            className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text pl-8 pr-3 py-1.5 outline-none focus:ring-2 focus:ring-brand/30"
          />
        </div>
      </div>

      <div className="max-h-[28rem] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <TheadRow>
              <Th>#</Th>
              {PRODUCT_COLUMNS.map((col) => (
                <Th key={col.key} sortKey={col.key} sort={sort} onSort={toggleSort} align={col.align}>
                  {col.label}
                </Th>
              ))}
              <Th>Stock Movement</Th>
              <Th>Stock Correction</Th>
            </TheadRow>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-sm text-text-faint italic text-center">
                  {search ? 'No matching product found.' : emptyMessage}
                </td>
              </tr>
            ) : (
              pageRows.map((p, i) => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                  <td className="px-4 py-2 text-text-faint">{(currentPage - 1) * perPage + i + 1}</td>
                  <td className="px-4 py-2">
                    <Link to={ROUTES.productDetail.replace(':id', String(p.id))} className="font-medium text-brand hover:underline">
                      {p.label}
                    </Link>
                    <p className="text-xs text-text-faint">Ref: {p.ref}</p>
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-text-muted">{p.units}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-text-muted">{formatMoney(p.weightedAvgPrice)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-text-muted">{formatMoney(p.inputStockValue)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-text-muted">{formatMoney(p.sellingUnitPrice)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-text!">{formatMoney(p.valueForSell)}</td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {p.transferUrl && (
                      <a href={stripBackendPrefix(p.transferUrl)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand hover:underline">
                        <ArrowLeftRight size={13} /> Stock Movement
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {p.correctionUrl && (
                      <a href={stripBackendPrefix(p.correctionUrl)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand hover:underline">
                        <FilePenLine size={13} /> Stock Correction
                      </a>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-border text-sm text-text-faint">
          <span>
            Showing {rangeStart} to {rangeEnd} of {total} entries
          </span>
          <div className="flex items-center gap-1">
            <button type="button" disabled={currentPage <= 1} onClick={() => setPage(1)} className="p-1.5 rounded-md hover:bg-surface-hover disabled:opacity-40" title="First page">
              <ChevronsLeft size={16} />
            </button>
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-md hover:bg-surface-hover disabled:opacity-40"
              title="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
            {getPageNumbers(currentPage, totalPages).map((p, i) =>
              p === '…' ? (
                <span key={`ellipsis-${i}`} className="px-2 text-text-faint select-none">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={`min-w-[2rem] px-2 py-1 rounded-md text-sm ${p === currentPage ? 'bg-brand text-white font-semibold' : 'text-text hover:bg-surface-hover'}`}
                >
                  {p}
                </button>
              ),
            )}
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-md hover:bg-surface-hover disabled:opacity-40"
              title="Next page"
            >
              <ChevronRight size={16} />
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage(totalPages)}
              className="p-1.5 rounded-md hover:bg-surface-hover disabled:opacity-40"
              title="Last page"
            >
              <ChevronsRight size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}

// Matches the real "twobox" stat cards on movement_list.php's own JS
// (movement_list_app.js's renderStats()) — Total (+unit) on the left,
// Today + a tone icon on the right. Same icon-per-stat mapping as the real
// page (fa-dolly/fa-cart-arrow-down/fa-truck-loading/fa-tags/fa-rotate).
function StatTile({ icon: Icon, tone = 'brand', title, total, totalUnit, today }: { icon: LucideIcon; tone?: 'brand' | 'orange'; title: string; total: string; totalUnit?: string; today: string }) {
  return (
    <Card className="!h-auto !p-0 overflow-hidden">
      <div className="px-3 py-2 text-[11px] font-semibold text-text-faint uppercase tracking-wide border-b border-border">{title}</div>
      <div className="flex items-stretch divide-x divide-border">
        <div className="flex-1 px-3 py-2.5">
          <p className="text-xl font-bold text-text! tabular-nums">
            {total}
            {totalUnit && <span className="ml-1 text-xs font-normal text-text-faint">{totalUnit}</span>}
          </p>
          <p className="text-[11px] text-text-faint mt-0.5">Total</p>
        </div>
        <div className="flex-1 px-3 py-2.5 flex items-center justify-between gap-2">
          <div>
            <p className="text-xl font-bold text-text! tabular-nums">{today}</p>
            <p className="text-[11px] text-text-faint mt-0.5">Today</p>
          </div>
          <Icon size={18} className={tone === 'orange' ? 'text-warning-fg' : 'text-brand'} />
        </div>
      </div>
    </Card>
  )
}

// Native <input type="date"> gives yyyy-mm-dd; the legacy API's
// `newdatepicker` filter expects "MM/DD/YYYY-MM/DD/YYYY" (see
// movement_list_app.js's own buildApiParams/updateUrl).
function toLegacyDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-')
  return `${m}/${d}/${y}`
}

// Client-side equivalents of movement_list_app.js's own printTable()/
// exportExcel() (verified by reading that file directly) — both purely
// operate on the already-rendered table, no backend call either way.
function printMovementsTable(table: HTMLTableElement | null) {
  if (!table) return
  const printWindow = window.open('', '_blank')
  if (!printWindow) return
  printWindow.document.title = 'Stock Movements'
  const style = printWindow.document.createElement('style')
  style.textContent = 'table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f8f9fa}'
  printWindow.document.head.appendChild(style)
  printWindow.document.body.appendChild(table.cloneNode(true))
  printWindow.focus()
  setTimeout(() => printWindow.print(), 500)
}

function exportMovementsExcel(table: HTMLTableElement | null) {
  if (!table) return
  const blob = new Blob(['﻿', table.outerHTML], { type: 'application/vnd.ms-excel' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'stock_movements.xls'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

interface MovementFilterDraft {
  productId: string
  batch: string
  inventoryCode: string
  startDate: string
  endDate: string
}
const emptyMovementFilterDraft: MovementFilterDraft = { productId: '', batch: '', inventoryCode: '', startDate: '', endDate: '' }

function WarehouseMovementsTab({ warehouseId }: { warehouseId: number }) {
  // Draft/applied split matches the real page's own Filters panel — typing a
  // date or picking a dropdown value there doesn't refetch until "Search" is
  // clicked (confirmed live), rather than firing a request per keystroke.
  const [draft, setDraft] = useState<MovementFilterDraft>(emptyMovementFilterDraft)
  const [applied, setApplied] = useState<MovementFilterDraft>(emptyMovementFilterDraft)
  const [page, setPage] = useState(0)
  const tableRef = useRef<HTMLTableElement>(null)
  // A single-sided pick (only From, or only To) used to be silently dropped
  // entirely — the real newdatepicker param always needs both bounds, so an
  // open end here is filled with a far-past/far-future date rather than
  // requiring the user to fill in both fields for a simple "since X" filter.
  const dateRange =
    applied.startDate || applied.endDate
      ? `${applied.startDate ? toLegacyDate(applied.startDate) : '01/01/1970'}-${applied.endDate ? toLegacyDate(applied.endDate) : '12/31/2099'}`
      : undefined
  const filters: WarehouseMovementFilters = { productId: applied.productId, batch: applied.batch, inventoryCode: applied.inventoryCode, page, dateRange }
  const { data, isLoading, isError, error, refetch } = useWarehouseMovements(String(warehouseId), filters)
  const hasAppliedFilters = applied.startDate || applied.endDate || applied.productId || applied.batch || applied.inventoryCode
  const hasDraftChanges = JSON.stringify(draft) !== JSON.stringify(emptyMovementFilterDraft)

  function handleSearch() {
    setApplied(draft)
    setPage(0)
  }
  function handleReset() {
    setDraft(emptyMovementFilterDraft)
    setApplied(emptyMovementFilterDraft)
    setPage(0)
  }

  if (isLoading) return <LegacyLoadingCard label="Loading stock movements…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load stock movements" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  const from = data.movements.length === 0 ? 0 : data.page * data.limit + 1
  const to = data.page * data.limit + data.movements.length

  return (
    <>
      {/* Matches movement_list_app.js's own renderTitleBar() — a section of
          its own above the stat cards, not attached to the table card
          below (confirmed by reading movement_list.php's static container
          order: titlebar, then stats, then filters, then table). */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-text!">
          <Warehouse size={14} className="text-brand" /> Warehouse Movements
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-faint">{data.totalRecords} Stock Movements | Page {data.page + 1}</span>
          <div className="flex items-center gap-1">
            <button type="button" title="Print" onClick={() => printMovementsTable(tableRef.current)} className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-text">
              <Printer size={14} />
            </button>
            <button type="button" title="Excel" onClick={() => exportMovementsExcel(tableRef.current)} className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-text">
              <FileSpreadsheet size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className={`grid grid-cols-2 sm:grid-cols-3 ${data.batchTrackingEnabled ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-3`}>
        <StatTile icon={PackageOpen} title="Product Use For Sale" total={data.stats.saleUseQty} totalUnit="Qty" today={data.stats.saleUseToday} />
        <StatTile icon={ShoppingCart} title="Total Product Sold" total={data.stats.soldQty} totalUnit="Qty" today={data.stats.soldToday} />
        <StatTile icon={Truck} title="Total Purchase Done" total={data.stats.purchaseQty} totalUnit="Qty" today={data.stats.purchaseToday} />
        {/* Real per-install flag (see warehouseHtmlParser.ts's batchTrackingEnabled
            comment) — the reference page itself drops this tile when lot/batch
            tracking isn't active, confirmed live (only 4 tiles shown there). */}
        {data.batchTrackingEnabled && <StatTile icon={Tag} tone="orange" title="Total Lot Used" total={data.stats.lotUsedCount} totalUnit="Lots" today={data.stats.lotUsedToday} />}
        <StatTile icon={RotateCw} title="Stock Correction" total={data.stats.correctionCount} today={data.stats.correctionToday} />
      </div>

      <Card className="!h-auto">
        <div className="flex items-center gap-2 text-sm font-semibold text-text! mb-3">
          <Filter size={14} className="text-brand" /> Filters
        </div>
        <div className="flex flex-wrap items-end gap-4">
          {/* Grouped as one control (shared border, arrow between) so the
              two ends of a single date range read as one field, not two
              unrelated ones — `max`/`min` cross-constrain each other so the
              native calendar can't pick an end before its own start. */}
          <div>
            <label className="flex items-center gap-1 text-xs text-text-faint mb-1">
              <Calendar size={12} /> Movement Date Range
            </label>
            <div className="flex items-center gap-1.5 rounded-md border border-input-border bg-input-bg px-1.5 py-1">
              <input
                type="date"
                value={draft.startDate}
                max={draft.endDate || undefined}
                onChange={(e) => setDraft((d) => ({ ...d, startDate: e.target.value }))}
                className="w-[130px] bg-transparent px-1 py-0.5 text-sm text-text outline-none"
              />
              <span className="text-text-faint">→</span>
              <input
                type="date"
                value={draft.endDate}
                min={draft.startDate || undefined}
                onChange={(e) => setDraft((d) => ({ ...d, endDate: e.target.value }))}
                className="w-[130px] bg-transparent px-1 py-0.5 text-sm text-text outline-none"
              />
            </div>
          </div>
          <div className="min-w-[180px]">
            <label className="flex items-center gap-1 text-xs text-text-faint mb-1">
              <Package size={12} /> Product
            </label>
            <select
              value={draft.productId}
              onChange={(e) => setDraft((d) => ({ ...d, productId: e.target.value }))}
              className="w-full rounded-md border border-input-border bg-input-bg px-2 py-1.5 text-sm text-text"
            >
              <option value="">Search a product</option>
              {data.products.map((p) => (
                <option key={p.id} value={p.id}>{p.ref} — {p.label}</option>
              ))}
            </select>
          </div>
          <div className="min-w-[140px]">
            <label className="flex items-center gap-1 text-xs text-text-faint mb-1">
              <Tag size={12} /> Lot/Serial
            </label>
            <select
              value={draft.batch}
              onChange={(e) => setDraft((d) => ({ ...d, batch: e.target.value }))}
              className="w-full rounded-md border border-input-border bg-input-bg px-2 py-1.5 text-sm text-text"
            >
              <option value="">Select a Lot</option>
              {data.batches.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          <div className="min-w-[160px]">
            <label className="flex items-center gap-1 text-xs text-text-faint mb-1">
              <Barcode size={12} /> Inv./Mov. Code
            </label>
            <select
              value={draft.inventoryCode}
              onChange={(e) => setDraft((d) => ({ ...d, inventoryCode: e.target.value }))}
              className="w-full rounded-md border border-input-border bg-input-bg px-2 py-1.5 text-sm text-text"
            >
              <option value="">Select a Inv/Code</option>
              {data.inventoryCodes.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSearch}
              disabled={!hasDraftChanges && !hasAppliedFilters}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium bg-brand text-white hover:bg-brand-hover disabled:opacity-50"
            >
              <SearchIcon size={13} /> Search
            </button>
            {(hasAppliedFilters || hasDraftChanges) && (
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-text-faint border border-border hover:bg-surface-hover"
              >
                <RotateCcw size={13} /> Reset
              </button>
            )}
          </div>
        </div>
      </Card>

      <Card className="!h-auto !p-0 overflow-hidden">
        {/* Fixed height + its own scroll + sticky header — a warehouse with
            months of movements would otherwise stretch this table to an
            unbounded page height with no way to see the filters/stat tiles
            above it at the same time (same fix as the Warehouse tab's own
            product table). */}
        <div className="max-h-[28rem] overflow-auto">
          <table ref={tableRef} className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-surface-alt">
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                <th className="font-medium px-4 py-2">Ref.</th>
                <th className="font-medium px-4 py-2">Date</th>
                <th className="font-medium px-4 py-2">Product Ref.</th>
                <th className="font-medium px-4 py-2">Product Label</th>
                {data.batchTrackingEnabled && <th className="font-medium px-4 py-2">Lot/Serial</th>}
                <th className="font-medium px-4 py-2">Inv./Mov. Code</th>
                <th className="font-medium px-4 py-2">Label Of Movement</th>
                <th className="font-medium px-4 py-2">Type</th>
                <th className="font-medium px-4 py-2">Origin</th>
                <th className="font-medium px-4 py-2 text-right">Cost Price</th>
                <th className="font-medium px-4 py-2 text-right">Qty</th>
                {data.zraEnabled && <th className="font-medium px-4 py-2">ZRA Status</th>}
              </tr>
            </thead>
            <tbody>
              {data.movements.length === 0 ? (
                <tr>
                  <td colSpan={10 + (data.batchTrackingEnabled ? 1 : 0) + (data.zraEnabled ? 1 : 0)} className="px-4 py-6 text-sm text-text-faint italic text-center">
                    No stock movements found.
                  </td>
                </tr>
              ) : (
                data.movements.map((m) => (
                  <tr key={m.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 text-text-muted">{m.id}</td>
                    <td className="px-4 py-2 text-text-muted whitespace-nowrap">{m.dateFormatted}</td>
                    <td className="px-4 py-2 text-text-muted">{m.productRef}</td>
                    <td className="px-4 py-2 text-text!">{m.productLabel}</td>
                    {data.batchTrackingEnabled && <td className="px-4 py-2 text-text-muted">{m.batch || '—'}</td>}
                    <td className="px-4 py-2 text-text-muted">{m.inventoryCode || '—'}</td>
                    <td className="px-4 py-2 text-text-muted">{m.label}</td>
                    <td className="px-4 py-2 text-text-muted">{m.typeLabel}</td>
                    <td className="px-4 py-2 text-text-muted">
                      {m.originUrl ? (
                        <a href={stripBackendPrefix(m.originUrl)} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                          {m.originText}
                        </a>
                      ) : (
                        m.originText || '—'
                      )}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-text-muted">{m.costPrice || '—'}</td>
                    <td className={`px-4 py-2 text-right tabular-nums font-medium ${m.qtyDisplay.startsWith('+') ? 'text-success-fg' : 'text-danger-fg'}`}>{m.qtyDisplay}</td>
                    {data.zraEnabled && <td className="px-4 py-2 text-text-muted">{m.zraStatusLabel || '—'}</td>}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-border text-xs text-text-faint">
          <span>{data.totalRecords === 0 ? 'Showing 0 of 0 movements' : `Showing ${from} to ${to} of ${data.totalRecords} movements`}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={data.page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="px-2 py-1 rounded-md border border-border disabled:opacity-40"
            >
              Prev
            </button>
            <button
              type="button"
              disabled={to >= data.totalRecords}
              onClick={() => setPage((p) => p + 1)}
              className="px-2 py-1 rounded-md border border-border disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </Card>
    </>
  )
}

function WarehouseEventsTab({ warehouseId, warehouseRef }: { warehouseId: number; warehouseRef: string }) {
  const { data, isLoading, isError, error, refetch } = useWarehouseEvents(String(warehouseId))
  const generateDoc = useGenerateWarehouseDoc(String(warehouseId))
  const [model, setModel] = useState('')
  const [langId, setLangId] = useState('')
  const [showAddEvent, setShowAddEvent] = useState(false)

  useEffect(() => {
    if (!data) return
    setModel(data.docGen.modelOptions[0]?.value ?? '')
    setLangId(data.docGen.defaultLang)
  }, [data])

  if (isLoading) return <LegacyLoadingCard label="Loading events…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load events" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  function handleGenerate() {
    if (!data || !model) return
    generateDoc.mutate({ token: data.docGen.token, model, langId })
  }

  return (
    <div className="space-y-4">
      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Paperclip size={14} className="text-brand" />
          <h3 className="font-semibold text-text!">Linked files</h3>
        </div>
        <div className="p-4 space-y-4">
          {data.docGen.modelOptions.length > 0 && (
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-text-faint">Doc template</span>
                <select value={model} onChange={(e) => setModel(e.target.value)} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5">
                  {data.docGen.modelOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-text-faint">Language</span>
                <select value={langId} onChange={(e) => setLangId(e.target.value)} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5 max-w-40">
                  {data.docGen.langOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                disabled={generateDoc.isPending || !model}
                onClick={handleGenerate}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-brand text-white hover:bg-brand-hover disabled:opacity-60"
              >
                {generateDoc.isPending ? <LoaderCircle size={13} className="animate-spin" /> : <FileCog size={13} />} Generate
              </button>
            </div>
          )}
          {generateDoc.isError && <p className="text-xs text-danger">Could not generate the document — please try again.</p>}

          {data.linkedFiles.length === 0 ? (
            <p className="text-sm text-text-faint italic">None</p>
          ) : (
            <ul className="space-y-1.5">
              {data.linkedFiles.map((f, i) => (
                <li key={i}>
                  {f.url ? (
                    <a href={stripBackendPrefix(f.url)} target="_blank" rel="noreferrer" className="text-sm text-brand hover:underline">
                      {f.name}
                    </a>
                  ) : (
                    <span className="text-sm text-text!">{f.name}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarClock size={14} className="text-brand" />
            <h3 className="font-semibold text-text!">Latest 10 linked events</h3>
          </div>
          {/* Real link is /comm/action/card.php?action=create&origin=stock&originid=X
              (a raw legacy page). Routed instead through the same real
              AddEventModal every other detail page (Customer/Contract/
              Invoice/Order/Quotation/PurchaseOrder/Contact) already reuses
              for this — elementtype="stock" matches Entrepot::$element,
              confirmed by the real link's own origin=stock param, so the
              created event stays genuinely linked to this warehouse
              server-side via elementtype/fk_element, same as the reference. */}
          {data.addEventUrl && (
            <button type="button" onClick={() => setShowAddEvent(true)} title="Add event" className="flex items-center justify-center w-6 h-6 rounded-md bg-brand text-white hover:bg-brand-hover">
              <Plus size={14} />
            </button>
          )}
        </div>
        {showAddEvent && (
          <AddEventModal
            elementtype="stock"
            fkElement={warehouseId}
            linkedObjectLabel={warehouseRef}
            linkedObjectPath={ROUTES.warehouseDetail.replace(':id', String(warehouseId))}
            onClose={() => setShowAddEvent(false)}
            onCreated={() => {
              setShowAddEvent(false)
              refetch()
            }}
          />
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                <th className="font-medium px-4 py-2">Ref.</th>
                <th className="font-medium px-4 py-2">Date</th>
                <th className="font-medium px-4 py-2">By</th>
                <th className="font-medium px-4 py-2">Type</th>
                <th className="font-medium px-4 py-2">Title</th>
              </tr>
            </thead>
            <tbody>
              {data.events.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-sm text-text-faint italic text-center">None</td>
                </tr>
              ) : (
                data.events.map((e, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 text-text-muted">{e.ref}</td>
                    <td className="px-4 py-2 text-text-muted whitespace-nowrap">{e.date}</td>
                    <td className="px-4 py-2 text-text-muted">{e.by}</td>
                    <td className="px-4 py-2 text-text-muted">{e.type}</td>
                    <td className="px-4 py-2 text-text!">{e.title}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="!h-auto">
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <span>Created by</span>
          {data.createdByName && <Avatar name={data.createdByName} size={22} />}
          {data.createdById ? (
            <Link to={ROUTES.userDetail.replace(':id', String(data.createdById))} className="text-brand hover:underline">
              {data.createdByName}
            </Link>
          ) : (
            <span className="text-text!">{data.createdByName}</span>
          )}
        </div>
        {data.creationDate && <p className="text-xs text-text-faint mt-1">Creation date: {data.creationDate}</p>}
        {data.lastModificationDate && <p className="text-xs text-text-faint mt-0.5">Latest modification date: {data.lastModificationDate}</p>}
      </Card>
    </div>
  )
}
