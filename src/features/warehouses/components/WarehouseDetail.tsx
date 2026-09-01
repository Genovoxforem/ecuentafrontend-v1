import { useState, useRef, useEffect, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ChevronLeft,
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
  Boxes,
  Layers,
  Banknote,
  Clock,
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
  type LucideIcon,
} from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Avatar } from '../../../shared/components/Avatar'
import { ROUTES } from '../../../routes'
import { formatMoney } from '../../../utils/format'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useAllProductsRich } from '../../products/products.queries'
import { useWarehouseDetail, useWarehouseMovements, useWarehouseEvents, useGenerateWarehouseDoc, type WarehouseMovementFilters } from '../warehouseExtras.queries'
import { stripBackendPrefix } from '../../customers/customerDetailTabs.queries'
import { WarehouseEditModal } from './WarehouseEditModal'

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

const TABS: { key: WarehouseTab; label: string }[] = [
  { key: 'warehouse', label: 'Warehouse' },
  { key: 'movements', label: 'Stock Movements' },
  { key: 'events', label: 'Events' },
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
function MetaItem({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-text-faint">
      <Icon size={13} className="text-text-faint" />
      {label}: <strong className="font-semibold text-text!">{value}</strong>
    </span>
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

      <div className="sticky top-0 z-10 -mx-6 pt-4 pb-2 bg-white dark:bg-gray-950">
        <div className="px-6">
          <Card className="!h-auto">
            <div className="flex flex-wrap items-start justify-between gap-4 p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-11 h-10 rounded-xl bg-brand/10 text-brand shrink-0">
                  <Warehouse size={20} />
                </span>
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-text!">{data.ref}</h2>
                  {data.description && <p className="text-xs text-text-faint">{data.description}</p>}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <MetaItem icon={Boxes} label="Total number of products" value={String(data.totalProductsCount)} />
                    <MetaItem icon={Layers} label="Number of different products" value={String(data.differentProductsCount)} />
                    <MetaItem icon={Banknote} label="Input stock value" value={formatMoney(data.inputStockValue)} />
                    <MetaItem icon={Clock} label="Latest movement" value={data.latestMovement || 'None'} />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {/* Transfer stock/Correct stock/Update to ZRA: the real
                    card.php reuses movement_list.php's header markup for
                    these three buttons, but never loads
                    movement_list_app.js (which defines window.EcMovementApp,
                    confirmed by reading card.php's own source) — so on the
                    real Warehouse tab these are silently dead JS calls. They
                    only work on the Stock Movements tab, which does load
                    that script, so these route there instead of replicating
                    the real page's broken buttons. Native Stock Movements
                    page (real via movement_list_api.php, read-only — the
                    correct/transfer/ZRA actions themselves are mutations and
                    aren't wired here) — see stockMovements.queries.ts. */}
                <Link
                  to={`${ROUTES.stockMovements}?id=${data.id}`}
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-brand/40 px-2.5 py-1.5 text-xs font-medium text-brand hover:bg-brand/5"
                >
                  <ArrowLeftRight size={13} /> Transfer stock
                </Link>
                <Link
                  to={`${ROUTES.stockMovements}?id=${data.id}`}
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-brand/40 px-2.5 py-1.5 text-xs font-medium text-brand hover:bg-brand/5"
                >
                  <FilePenLine size={13} /> Correct stock
                </Link>
                <Link
                  to={`${ROUTES.stockMovements}?id=${data.id}`}
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-brand/40 px-2.5 py-1.5 text-xs font-medium text-brand hover:bg-brand/5"
                >
                  <UploadCloud size={13} /> Update to ZRA
                </Link>
              </div>
            </div>
          </Card>
        </div>

        {/* Real card.php's own "identity card" (name/location on the left,
            status + Edit/Delete/Close grouped on the right) — a genuinely
            separate block from the ec-movement-product-card banner above
            it, confirmed live: the banner itself never carries a status
            badge or edit/delete/close controls at all. */}
        <div className="px-6">
          <Card className="!h-auto">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-text!">{data.ref}</h3>
                <p className="text-xs text-text-faint mt-0.5">Short name location :</p>
                {data.locationSummary && (
                  <p className="flex items-center gap-1 text-xs text-text-muted mt-0.5">
                    <MapPin size={12} /> {data.locationSummary}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${data.statusLabel === 'Open' ? 'bg-success-bg text-success-fg' : 'bg-neutral-bg text-neutral-fg'}`}>
                  {data.statusLabel}
                </span>
                <div className="flex items-center gap-1">
                  {data.editUrl && (
                    <button
                      type="button"
                      onClick={() => setShowEditModal(true)}
                      title="Edit"
                      className="p-1.5 rounded-md text-text-faint hover:bg-surface-hover hover:text-text"
                    >
                      <Pencil size={16} />
                    </button>
                  )}
                  {data.deleteUrl ? (
                    <a
                      href={stripBackendPrefix(data.deleteUrl)}
                      target="_blank"
                      rel="noreferrer"
                      title="Delete"
                      className="p-1.5 rounded-md text-text-faint hover:bg-danger-bg hover:text-danger-fg"
                    >
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
            </div>
          </Card>
        </div>

        <div className="px-6">
          <div className="flex items-center gap-1 border-b border-border">
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wide border-b-2 -mb-px ${
                  tab === key ? 'border-brand text-brand' : 'border-transparent text-text-faint hover:text-text'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
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
              <div className="p-4 overflow-x-auto">
                {(() => {
                  const visibleProducts = appliedProductSearchId
                    ? data.products.filter((p) => String(p.id) === appliedProductSearchId)
                    : data.products
                  return (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                        <th className="font-medium py-2 pr-3">Product</th>
                        <th className="font-medium py-2 pr-3 text-right">Units</th>
                        <th className="font-medium py-2 pr-3 text-right">Weighted Avg. Price</th>
                        <th className="font-medium py-2 pr-3 text-right">Input Stock Value</th>
                        <th className="font-medium py-2 pr-3 text-right">Selling Unit Price</th>
                        <th className="font-medium py-2 pr-3 text-right">Value For Sell</th>
                        <th className="font-medium py-2 pr-3"></th>
                        <th className="font-medium py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleProducts.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-6 text-sm text-text-faint italic text-center">
                            {appliedProductSearchId ? 'No matching product found in this warehouse.' : 'No products in this warehouse.'}
                          </td>
                        </tr>
                      ) : (
                        visibleProducts.map((p) => (
                          <tr key={p.id} className="border-b border-border last:border-0">
                            <td className="py-2 pr-3">
                              <Link to={ROUTES.productDetail.replace(':id', String(p.id))} className="font-medium text-brand hover:underline">
                                {p.label}
                              </Link>
                              <p className="text-xs text-text-faint">Ref: {p.ref}</p>
                            </td>
                            <td className="py-2 pr-3 text-right tabular-nums text-text-muted">{p.units}</td>
                            <td className="py-2 pr-3 text-right tabular-nums text-text-muted">{formatMoney(p.weightedAvgPrice)}</td>
                            <td className="py-2 pr-3 text-right tabular-nums text-text-muted">{formatMoney(p.inputStockValue)}</td>
                            <td className="py-2 pr-3 text-right tabular-nums text-text-muted">{formatMoney(p.sellingUnitPrice)}</td>
                            <td className="py-2 pr-3 text-right tabular-nums text-text!">{formatMoney(p.valueForSell)}</td>
                            <td className="py-2 pr-3 whitespace-nowrap">
                              {p.transferUrl && (
                                <a
                                  href={stripBackendPrefix(p.transferUrl)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-brand hover:underline"
                                >
                                  <ArrowLeftRight size={13} /> Stock Movement
                                </a>
                              )}
                            </td>
                            <td className="py-2 whitespace-nowrap">
                              {p.correctionUrl && (
                                <a
                                  href={stripBackendPrefix(p.correctionUrl)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-brand hover:underline"
                                >
                                  <FilePenLine size={13} /> Stock Correction
                                </a>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  )
                })()}
              </div>
            </Card>
          </>
        )}

        {tab === 'movements' && <WarehouseMovementsTab warehouseId={data.id} />}
        {tab === 'events' && <WarehouseEventsTab warehouseId={data.id} />}
      </div>

      {showEditModal && <WarehouseEditModal id={String(data.id)} warehouseRef={data.ref} onClose={() => setShowEditModal(false)} />}
    </div>
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

function WarehouseMovementsTab({ warehouseId }: { warehouseId: number }) {
  const [productId, setProductId] = useState('')
  const [batch, setBatch] = useState('')
  const [inventoryCode, setInventoryCode] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(0)
  const tableRef = useRef<HTMLTableElement>(null)
  const dateRange = startDate && endDate ? `${toLegacyDate(startDate)}-${toLegacyDate(endDate)}` : undefined
  const filters: WarehouseMovementFilters = { productId, batch, inventoryCode, page, dateRange }
  const { data, isLoading, isError, error, refetch } = useWarehouseMovements(String(warehouseId), filters)

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

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatTile icon={PackageOpen} title="Product Use For Sale" total={data.stats.saleUseQty} totalUnit="Qty" today={data.stats.saleUseToday} />
        <StatTile icon={ShoppingCart} title="Total Product Sold" total={data.stats.soldQty} totalUnit="Qty" today={data.stats.soldToday} />
        <StatTile icon={Truck} title="Total Purchase Done" total={data.stats.purchaseQty} totalUnit="Qty" today={data.stats.purchaseToday} />
        <StatTile icon={Tag} tone="orange" title="Total Lot Used" total={data.stats.lotUsedCount} totalUnit="Lots" today={data.stats.lotUsedToday} />
        <StatTile icon={RotateCw} title="Stock Correction" total={data.stats.correctionCount} today={data.stats.correctionToday} />
      </div>

      <Card className="!h-auto">
        <div className="flex items-center gap-2 text-sm font-semibold text-text! mb-3">
          <Filter size={14} className="text-brand" /> Filters
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[130px]">
            <label className="flex items-center gap-1 text-xs text-text-faint mb-1">
              <Calendar size={12} /> Movement Date (From)
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(0) }}
              className="w-full rounded-md border border-input-border bg-input-bg px-2 py-1.5 text-sm text-text"
            />
          </div>
          <div className="min-w-[130px]">
            <label className="flex items-center gap-1 text-xs text-text-faint mb-1">
              <Calendar size={12} /> Movement Date (To)
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(0) }}
              className="w-full rounded-md border border-input-border bg-input-bg px-2 py-1.5 text-sm text-text"
            />
          </div>
          <div className="min-w-[180px]">
            <label className="flex items-center gap-1 text-xs text-text-faint mb-1">
              <Package size={12} /> Product
            </label>
            <select
              value={productId}
              onChange={(e) => { setProductId(e.target.value); setPage(0) }}
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
              value={batch}
              onChange={(e) => { setBatch(e.target.value); setPage(0) }}
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
              value={inventoryCode}
              onChange={(e) => { setInventoryCode(e.target.value); setPage(0) }}
              className="w-full rounded-md border border-input-border bg-input-bg px-2 py-1.5 text-sm text-text"
            >
              <option value="">Select a Inv/Code</option>
              {data.inventoryCodes.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          {(startDate || endDate || productId || batch || inventoryCode) && (
            <button
              type="button"
              onClick={() => { setStartDate(''); setEndDate(''); setProductId(''); setBatch(''); setInventoryCode(''); setPage(0) }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-text-faint border border-border hover:bg-surface-hover"
            >
              <RotateCcw size={13} /> Reset
            </button>
          )}
        </div>
      </Card>

      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table ref={tableRef} className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                <th className="font-medium px-4 py-2">Ref.</th>
                <th className="font-medium px-4 py-2">Date</th>
                <th className="font-medium px-4 py-2">Product Ref.</th>
                <th className="font-medium px-4 py-2">Product Label</th>
                <th className="font-medium px-4 py-2">Lot/Serial</th>
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
                  <td colSpan={data.zraEnabled ? 12 : 11} className="px-4 py-6 text-sm text-text-faint italic text-center">
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
                    <td className="px-4 py-2 text-text-muted">{m.batch || '—'}</td>
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

function WarehouseEventsTab({ warehouseId }: { warehouseId: number }) {
  const { data, isLoading, isError, error, refetch } = useWarehouseEvents(String(warehouseId))
  const generateDoc = useGenerateWarehouseDoc(String(warehouseId))
  const [model, setModel] = useState('')
  const [langId, setLangId] = useState('')

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
          {data.addEventUrl && (
            <a
              href={stripBackendPrefix(data.addEventUrl)}
              target="_blank"
              rel="noreferrer"
              title="Add event"
              className="flex items-center justify-center w-6 h-6 rounded-md bg-brand text-white hover:bg-brand-hover"
            >
              <Plus size={14} />
            </a>
          )}
        </div>
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
          {data.createdByUrl ? (
            <a href={stripBackendPrefix(data.createdByUrl)} target="_blank" rel="noreferrer" className="text-brand hover:underline">
              {data.createdByName}
            </a>
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
