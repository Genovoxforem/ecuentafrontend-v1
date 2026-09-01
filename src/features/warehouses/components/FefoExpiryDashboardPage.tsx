import { useMemo, useState } from 'react'
import { ScanBarcode, XCircle, AlertTriangle, HelpCircle, Filter, Info, Lock, Search } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { useProductStocksByLotReport } from '../../products/products.queries'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import type { StockByLotRow } from '../../products/productLegacyParsers'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const selectCls = inputCls + ' appearance-none'

type FefoStatus = 'Expired' | 'Expiring Soon' | 'No Date' | 'OK'

interface FefoRow extends StockByLotRow {
  eatByParsed: Date | null
  daysLeft: number | null
  status: FefoStatus
}

// Legacy Dolibarr dates render as MM/DD/YYYY, which the JS Date constructor
// parses correctly as-is — no manual format juggling needed.
function parseLegacyDate(value: string): Date | null {
  if (!value || value === '-') return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function computeStatus(eatBy: Date | null, warnDays: number): { status: FefoStatus; daysLeft: number | null } {
  if (!eatBy) return { status: 'No Date', daysLeft: null }
  const daysLeft = Math.ceil((eatBy.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (daysLeft < 0) return { status: 'Expired', daysLeft }
  if (daysLeft <= warnDays) return { status: 'Expiring Soon', daysLeft }
  return { status: 'OK', daysLeft }
}

function StatCard({ label, value, caption, icon: Icon, tone }: { label: string; value: string; caption: string; icon: typeof XCircle; tone: 'danger' | 'warning' | 'info' | 'neutral' }) {
  const toneCls = {
    danger: 'bg-danger-bg text-danger-fg',
    warning: 'bg-warning-bg text-warning-fg',
    info: 'bg-info-bg text-info-fg',
    neutral: 'bg-surface-hover text-text-muted',
  }[tone]
  return (
    <Card className="!p-3 !flex-row items-center justify-between gap-3">
      <div>
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-text! mt-1">{value}</p>
        <p className="text-xs text-text-faint mt-0.5">{caption}</p>
      </div>
      <span className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${toneCls}`}>
        <Icon size={18} />
      </span>
    </Card>
  )
}

const STATUS_CLS: Record<FefoStatus, string> = {
  Expired: 'bg-danger-bg text-danger-fg',
  'Expiring Soon': 'bg-warning-bg text-warning-fg',
  'No Date': 'bg-surface-hover text-text-muted',
  OK: 'bg-success-bg text-success-fg',
}

type SortKey = 'product' | 'lot' | 'warehouse' | 'qty' | 'eatBy' | 'sellBy' | 'daysLeft' | 'status'

// Only columns backed by a real field (or a real field run through this
// component's own date-parsing/status logic) get a sortKey — Mfg Date and
// Shelf Life aren't returned by the legacy scrape (see the comment below),
// so those two stay plain/non-sortable rather than sorting on a fabricated
// "-", and "#"/"Action" are row-position/decorative, not real data.
const COLUMNS: { label: string; key?: SortKey; align?: 'right' }[] = [
  { label: 'Product', key: 'product' },
  { label: 'Batch/Lot', key: 'lot' },
  { label: 'Warehouse', key: 'warehouse' },
  { label: 'Qty', key: 'qty', align: 'right' },
  { label: 'Mfg Date' },
  { label: 'Eat-By', key: 'eatBy' },
  { label: 'Sell-By', key: 'sellBy' },
  { label: 'Shelf Life' },
  { label: 'Days Left', key: 'daysLeft' },
  { label: 'Status', key: 'status' },
  { label: 'Action' },
]
const COLUMN_LABELS = ['#', ...COLUMNS.map((c) => c.label)]
const EXPORT_COLUMNS = COLUMNS.filter((c) => c.key).map((c) => c.label)
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

function matchesSearch(r: FefoRow, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [r.ref, r.label, r.lotSerial, r.warehouse].some((field) => field.toLowerCase().includes(q))
}

function sortValue(r: FefoRow, key: SortKey): string | number {
  switch (key) {
    case 'product':
      return r.label
    case 'lot':
      return r.lotSerial
    case 'warehouse':
      return r.warehouse
    case 'qty':
      return r.physicalStock
    case 'eatBy':
      return r.eatByParsed ? r.eatByParsed.getTime() : Number.POSITIVE_INFINITY
    case 'sellBy':
      return parseLegacyDate(r.sellByDate)?.getTime() ?? Number.POSITIVE_INFINITY
    case 'daysLeft':
      return r.daysLeft ?? Number.POSITIVE_INFINITY
    case 'status':
      return r.status
  }
}

// Real data — First Expired First Out lot tracking, sourced from the same
// legacy scrape (product/reassortlot.php) ProductStocksByLotPage.tsx uses
// (see useProductStocksByLotReport / productLegacyParsers.ts). The legacy
// FEFO dashboard itself pulls eat-by/sell-by from the same underlying
// llx_product_lot table, so this is genuinely equivalent data — just
// computed into FEFO order/status client-side instead of server-side.
// Mfg Date and Shelf Life aren't returned by this scrape (no source page
// exposes them), so those two columns are honestly shown as "-" rather
// than guessed. Write-off has no real backend action, so it's disabled.
export function FefoExpiryDashboardPage() {
  const { data: rows, isLoading, isError, error, refetch } = useProductStocksByLotReport()
  const [warehouseFilter, setWarehouseFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<'' | FefoStatus>('')
  const [warnDays, setWarnDays] = useState(30)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)

  const warehouseOptions = useMemo(() => Array.from(new Set((rows ?? []).map((r) => r.warehouse).filter(Boolean))).sort(), [rows])

  const fefoRows = useMemo<FefoRow[]>(() => {
    return (rows ?? [])
      .filter((r) => r.lotSerial)
      .map((r) => {
        const eatByParsed = parseLegacyDate(r.eatByDate)
        const { status, daysLeft } = computeStatus(eatByParsed, warnDays)
        return { ...r, eatByParsed, daysLeft, status }
      })
      .sort((a, b) => {
        if (!a.eatByParsed && !b.eatByParsed) return 0
        if (!a.eatByParsed) return 1
        if (!b.eatByParsed) return -1
        return a.eatByParsed.getTime() - b.eatByParsed.getTime()
      })
  }, [rows, warnDays])

  const filtered = useMemo(
    () => fefoRows.filter((r) => (!warehouseFilter || r.warehouse === warehouseFilter) && (!statusFilter || r.status === statusFilter) && matchesSearch(r, search)),
    [fefoRows, warehouseFilter, statusFilter, search],
  )
  const { sorted, sort, toggleSort } = useSortableRows<FefoRow, SortKey>(filtered, sortValue)
  const pageRows = sorted.slice((page - 1) * perPage, page * perPage)

  const expiredLots = fefoRows.filter((r) => r.status === 'Expired')
  const expiringSoon = fefoRows.filter((r) => r.status === 'Expiring Soon')
  const noDate = fefoRows.filter((r) => r.status === 'No Date')
  const expiredUnits = expiredLots.reduce((sum, r) => sum + r.physicalStock, 0)
  const expiringUnits = expiringSoon.reduce((sum, r) => sum + r.physicalStock, 0)

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handlePerPageChange(value: number) {
    setPerPage(value)
    setPage(1)
  }

  function getExportData() {
    const exportRows = sorted.map((r) => [
      r.label,
      r.lotSerial,
      r.warehouse,
      r.physicalStock.toFixed(2),
      r.eatByDate || '-',
      r.sellByDate || '-',
      String(r.daysLeft ?? '-'),
      r.status,
    ])
    return { headers: EXPORT_COLUMNS, rows: exportRows }
  }

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
            <ScanBarcode size={20} className="text-brand" /> FEFO Expiry Dashboard
          </h2>
          <p className="text-xs text-text-faint">First Expired First Out — lot tracking, expiry alerts, and write-off</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
        {isError && <LegacyErrorCard title="Couldn't load lot expiry data" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}
        {isLoading && <LegacyLoadingCard label="Loading real lot/expiry data from the accounting backend…" />}

        {rows && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <StatCard label="Expired Lots" value={String(expiredLots.length)} caption={`${expiredUnits.toFixed(2)} units`} icon={XCircle} tone="danger" />
              <StatCard label="Expiring Soon" value={String(expiringSoon.length)} caption={`within ${warnDays} days`} icon={AlertTriangle} tone="warning" />
              <StatCard label="Expiring Units" value={expiringUnits.toFixed(2)} caption="need priority pick" icon={ScanBarcode} tone="info" />
              <StatCard label="No Expiry Date" value={String(noDate.length)} caption="lots missing expiry" icon={HelpCircle} tone="neutral" />
            </div>

            <Card className="!h-auto">
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-xs text-text-faint mb-1">Warehouse</label>
                  <select value={warehouseFilter} onChange={(e) => { setWarehouseFilter(e.target.value); setPage(1) }} className={selectCls}>
                    <option value="">All Warehouses</option>
                    {warehouseOptions.map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-faint mb-1">Status</label>
                  <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as '' | FefoStatus); setPage(1) }} className={selectCls}>
                    <option value="">All</option>
                    <option value="Expired">Expired</option>
                    <option value="Expiring Soon">Expiring Soon</option>
                    <option value="No Date">No Date</option>
                    <option value="OK">OK</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-faint mb-1">Warn Days</label>
                  <input type="number" min={1} value={warnDays} onChange={(e) => setWarnDays(Number(e.target.value) || 30)} className={inputCls + ' w-24'} />
                </div>
                <button type="button" className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover">
                  <Filter size={14} /> Filter
                </button>
              </div>
            </Card>

            <Card className="!p-0 overflow-hidden flex-1 min-h-0">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
                <p className="font-semibold text-text!">Lot Expiry List — FEFO Order</p>
                <span className="text-xs px-2 py-1 rounded-full bg-surface-hover text-text-muted">
                  {filtered.length} lot{filtered.length === 1 ? '' : 's'} · sorted earliest expiry first
                </span>
              </div>
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
                <div className="relative w-56">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Search product, lot, warehouse…"
                    className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text pl-8 pr-3 py-1.5"
                  />
                </div>
                <TableExportButtons title="FEFO Expiry Dashboard" getExportData={getExportData} />
              </div>
              <div className="flex-1 min-h-0 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <TheadRow>
                      <Th>#</Th>
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
                        <td colSpan={COLUMN_LABELS.length} className="px-3 py-4 text-text-faint italic">
                          No lots match these filters.
                        </td>
                      </tr>
                    ) : (
                      pageRows.map((r, i) => (
                        <tr key={`${r.ref}-${r.lotSerial}-${i}`} className="border-b border-border hover:bg-surface-hover">
                          <td className="px-3 py-2 text-text-faint">{(page - 1) * perPage + i + 1}</td>
                          <td className="px-3 py-2 text-brand font-medium whitespace-nowrap">{r.label}</td>
                          <td className="px-3 py-2 text-text! font-medium whitespace-nowrap">{r.lotSerial}</td>
                          <td className="px-3 py-2 text-text-muted whitespace-nowrap">{r.warehouse}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-text!">{r.physicalStock.toFixed(2)}</td>
                          <td className="px-3 py-2 text-text-faint">-</td>
                          <td className="px-3 py-2 text-text-muted whitespace-nowrap">{r.eatByDate || '-'}</td>
                          <td className="px-3 py-2 text-text-muted whitespace-nowrap">{r.sellByDate || '-'}</td>
                          <td className="px-3 py-2 text-text-faint">-</td>
                          <td className="px-3 py-2 text-text-muted">{r.daysLeft ?? '-'}</td>
                          <td className="px-3 py-2">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${STATUS_CLS[r.status]}`}>
                              {r.status === 'No Date' ? 'NO DATE' : r.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <button type="button" disabled title="Not built yet — no real write-off endpoint" className="p-1.5 rounded-md text-text-faint cursor-not-allowed">
                              <Lock size={13} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            <div className="flex items-start gap-2 rounded-lg bg-info-bg text-info-fg px-4 py-3 text-sm">
              <Info size={16} className="shrink-0 mt-0.5" />
              <p>
                <span className="font-semibold">FEFO Pick Enforcement:</span> when picking stock against a Sales Order, always pick the lot with the earliest expiry date first. The table above is sorted in FEFO
                order by default — click a column to re-sort. Expired lots should be written off immediately.
              </p>
            </div>
          </>
        )}
      </div>
      {rows && <ListPagination page={page} perPage={perPage} total={filtered.length} onPageChange={setPage} edgeToEdge />}
    </div>
  )
}
