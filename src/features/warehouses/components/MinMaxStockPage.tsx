import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  SlidersHorizontal,
  Search,
  RotateCcw,
  LoaderCircle,
  AlertTriangle,
  Wand2,
  Upload,
  Save,
  ArrowLeft,
  X,
  Boxes,
  ArrowDownToLine,
  ArrowUpFromLine,
  PieChart,
  CircleSlash,
} from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons, type ExportTableData } from '../../../shared/components/TableExportButtons'
import { formatMoney } from '../../../utils/format'
import { ROUTES } from '../../../routes'
import {
  useMinMaxStockPage,
  useBulkUpdateMinMaxStock,
  useApplySuggestedLevels,
  useImportMinMaxCsv,
  type MinMaxStockRow,
  type MinMaxStatusKey,
} from '../minmaxStock.queries'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const selectCls = inputCls + ' appearance-none'
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

function StatTile({ label, value, sub, icon: Icon }: { label: string; value: string; sub: string; icon: typeof Boxes }) {
  return (
    <Card className="!p-3 !flex-row items-center justify-between gap-3">
      <div>
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-text! mt-1">{value}</p>
        <p className="text-xs text-text-faint mt-0.5">{sub}</p>
      </div>
      <span className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-brand/10 text-brand">
        <Icon size={18} />
      </span>
    </Card>
  )
}

const STATUS_DOT: Record<MinMaxStatusKey, string> = {
  ok: 'bg-success',
  out_of_stock: 'bg-danger',
  below_min: 'bg-warning',
  above_max: 'bg-purple-500',
}
const STATUS_TEXT: Record<MinMaxStatusKey, string> = {
  ok: 'OK',
  out_of_stock: 'Out of Stock',
  below_min: 'Below Min',
  above_max: 'Above Max',
}
const STATUS_BADGE: Record<MinMaxStatusKey, string> = {
  ok: 'bg-success-bg text-success-fg',
  out_of_stock: 'bg-danger-bg text-danger-fg',
  below_min: 'bg-warning-bg text-warning-fg',
  above_max: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
}
const STOCK_STATUS_ORDER: MinMaxStatusKey[] = ['ok', 'out_of_stock', 'below_min', 'above_max']

interface PendingEdit {
  minStock: number
  maxStock: number
}

// Real reference page: product/stock/uom/minmax_stock.php ("Min/Max Stock
// Level Management"). See minmaxStock.queries.ts's header comment: genuinely
// classic Dolibarr (no JSON, no companion SPA) — every KPI tile, the Stock
// Status breakdown, and every row here is real, live-verified data. The
// entire product table is one real <form id="bulkForm">; there is no
// per-row save button in the reference app, only the one "Save All Changes"
// bar, reproduced here the same way. Selling Price is shown read-only
// because the real bulkupdate/update handlers never persist edits to it —
// see the queries file for the exact reasoning.
export function MinMaxStockPage() {
  const [searchDraft, setSearchDraft] = useState('')
  const [statusDraft, setStatusDraft] = useState<'' | 'no_min' | 'has_min'>('')
  const [applied, setApplied] = useState<{ search?: string; filterStatus?: 'no_min' | 'has_min' | '' }>({})
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)
  const [pendingEdits, setPendingEdits] = useState<Map<number, PendingEdit>>(new Map())
  const [showImportModal, setShowImportModal] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data, isLoading, isError, error } = useMinMaxStockPage(applied)
  const bulkSave = useBulkUpdateMinMaxStock()
  const applySuggested = useApplySuggestedLevels()
  const importCsv = useImportMinMaxCsv()

  const rows = data?.rows ?? []
  const stats = data?.stats

  function editedValues(row: MinMaxStockRow): PendingEdit {
    const edit = pendingEdits.get(row.id)
    return edit ?? { minStock: row.minStock, maxStock: row.maxStock }
  }

  function setEdit(id: number, patch: Partial<PendingEdit>, row: MinMaxStockRow) {
    setPendingEdits((prev) => {
      const next = new Map(prev)
      const current = next.get(id) ?? { minStock: row.minStock, maxStock: row.maxStock }
      next.set(id, { ...current, ...patch })
      return next
    })
  }

  const pageRows = useMemo(() => (data?.rows ?? []).slice((page - 1) * perPage, page * perPage), [data, page, perPage])

  function handleSearch() {
    setApplied({ search: searchDraft || undefined, filterStatus: statusDraft || undefined })
    setPage(1)
  }
  function handleClear() {
    setSearchDraft('')
    setStatusDraft('')
    setApplied({})
    setPage(1)
  }

  function handleSaveAll() {
    const entries = Array.from(pendingEdits.entries()).map(([productId, v]) => ({ productId, minStock: v.minStock, maxStock: v.maxStock }))
    if (entries.length === 0) return
    bulkSave.mutate(entries, { onSuccess: () => setPendingEdits(new Map()) })
  }

  function handleApplySuggested() {
    if (!window.confirm('Apply suggested min/max levels to all products without levels set?')) return
    applySuggested.mutate()
  }

  function handleImportSubmit() {
    if (!importFile) return
    importCsv.mutate(importFile, {
      onSuccess: () => {
        setShowImportModal(false)
        setImportFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
      },
    })
  }

  function getExportData(): ExportTableData {
    return {
      headers: ['Product Ref', 'Product Label', 'Barcode', 'Status', 'Current Stock', 'Min Stock', 'Max Stock', 'Suggested Min', 'Suggested Max', 'Daily Usage', 'Lead Time (days)', 'Selling Price', 'Stock Value'],
      rows: rows.map((r) => [
        r.ref,
        r.label,
        r.barcode ?? '',
        r.statusLabel,
        String(r.currentStock),
        String(r.minStock),
        String(r.maxStock),
        String(r.suggestedMin),
        String(r.suggestedMax),
        String(r.avgDailyUsage),
        String(r.leadTimeDays),
        String(r.sellingPrice),
        String(r.stockValue),
      ]),
    }
  }

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <div>
          <p className="text-xs text-text-faint">Stock Movement</p>
          <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
            <SlidersHorizontal size={20} className="text-brand" /> Min/Max Stock Level Management
          </h2>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
        {isError && (
          <Card className="!bg-danger-bg border-danger/40 flex items-start gap-3">
            <AlertTriangle size={18} className="text-danger-fg shrink-0 mt-0.5" />
            <p className="text-sm text-danger-fg">{error instanceof Error ? error.message : 'Failed to load min/max stock levels.'}</p>
          </Card>
        )}
        {(bulkSave.isError || applySuggested.isError || importCsv.isError) && (
          <Card className="!bg-danger-bg border-danger/40 flex items-start gap-3">
            <AlertTriangle size={18} className="text-danger-fg shrink-0 mt-0.5" />
            <p className="text-sm text-danger-fg">
              {(bulkSave.error ?? applySuggested.error ?? importCsv.error) instanceof Error
                ? ((bulkSave.error ?? applySuggested.error ?? importCsv.error) as Error).message
                : 'The legacy backend rejected this action.'}
            </p>
          </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          <StatTile label="Total Products" value={String(stats?.totalProducts ?? 0)} sub="items tracked" icon={Boxes} />
          <StatTile label="With Min Level" value={String(stats?.withMin ?? 0)} sub="minimum set" icon={ArrowDownToLine} />
          <StatTile label="With Max Level" value={String(stats?.withMax ?? 0)} sub="maximum set" icon={ArrowUpFromLine} />
          <StatTile label="Coverage" value={`${stats?.coveragePct ?? 0}%`} sub="of products configured" icon={PieChart} />
          <StatTile label="No Levels Set" value={String(stats?.withNone ?? 0)} sub="need configuration" icon={CircleSlash} />
        </div>

        <Card className="!h-auto flex-row flex-wrap items-center gap-4">
          <span className="flex items-center gap-2 text-sm font-semibold text-text!">Stock Status:</span>
          {STOCK_STATUS_ORDER.map((key) => (
            <span key={key} className="inline-flex items-center gap-2 text-sm">
              <span className={`w-3 h-3 rounded-full ${STATUS_DOT[key]}`} />
              {STATUS_TEXT[key]}: <b className="text-text!">{stats?.statusCounts[key] ?? 0}</b>
            </span>
          ))}
          <button
            type="button"
            onClick={handleApplySuggested}
            disabled={applySuggested.isPending}
            className="ml-auto flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
          >
            {applySuggested.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Wand2 size={14} />} Apply Suggested Levels
          </button>
        </Card>

        <Card className="!h-auto">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-2 text-sm font-semibold text-text! shrink-0">Filters:</span>
            <input
              type="text"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search product..."
              className={inputCls + ' w-56'}
            />
            <select value={statusDraft} onChange={(e) => setStatusDraft(e.target.value as typeof statusDraft)} className={selectCls + ' w-52'}>
              <option value="">All Products</option>
              <option value="no_min">No Min Level Set</option>
              <option value="has_min">Has Min Level</option>
            </select>
            <button type="button" onClick={handleSearch} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
              <Search size={14} /> Search
            </button>
            <button type="button" onClick={handleClear} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-muted hover:bg-surface-hover">
              <RotateCcw size={14} /> Clear
            </button>
            <div className="ml-auto flex items-center gap-2">
              <TableExportButtons title="Min-Max Stock Levels" getExportData={getExportData} />
              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-info-bg text-info-fg hover:brightness-95"
              >
                <Upload size={14} /> Import CSV
              </button>
            </div>
          </div>
          <p className="text-xs text-text-faint mt-2">Showing {rows.length} products</p>
        </Card>

        {pendingEdits.size > 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-info/40 bg-info-bg px-4 py-2.5">
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={bulkSave.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
            >
              {bulkSave.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />} Save All Changes
            </button>
            <span className="text-sm text-info-fg">
              {pendingEdits.size} row{pendingEdits.size === 1 ? '' : 's'} edited — click Save to apply
            </span>
            <button type="button" onClick={() => setPendingEdits(new Map())} className="ml-auto text-xs text-info-fg hover:underline">
              Discard changes
            </button>
          </div>
        )}

        <Card className="!p-0 overflow-hidden flex-1 min-h-0">
          <div className="flex items-center gap-3 p-4 border-b border-border">
            <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1) }} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5">
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-surface-alt">
                <tr className="text-left text-xs font-semibold text-text-muted uppercase tracking-wide">
                  <th className="px-4 py-2.5 whitespace-nowrap">Product</th>
                  <th className="px-4 py-2.5 text-center whitespace-nowrap">Status</th>
                  <th className="px-4 py-2.5 text-right whitespace-nowrap">Current Stock</th>
                  <th className="px-4 py-2.5 text-right whitespace-nowrap">Min (Reorder Point)</th>
                  <th className="px-4 py-2.5 text-right whitespace-nowrap">Max (Desired Stock)</th>
                  <th className="px-4 py-2.5 text-right whitespace-nowrap">Suggested Min</th>
                  <th className="px-4 py-2.5 text-right whitespace-nowrap">Suggested Max</th>
                  <th className="px-4 py-2.5 text-right whitespace-nowrap">Daily Usage</th>
                  <th className="px-4 py-2.5 text-right whitespace-nowrap">Lead Time</th>
                  <th className="px-4 py-2.5 text-right whitespace-nowrap">Selling Price</th>
                  <th className="px-4 py-2.5 text-right whitespace-nowrap">Stock Value</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-6 text-center text-text-faint">
                      <LoaderCircle size={16} className="inline animate-spin mr-2" /> Loading products…
                    </td>
                  </tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-4 text-text-faint italic">
                      No Data Available In Table
                    </td>
                  </tr>
                ) : (
                  pageRows.map((r) => {
                    const edit = editedValues(r)
                    const rowTint =
                      r.status === 'out_of_stock' ? 'bg-danger-bg/40' : r.status === 'below_min' ? 'bg-warning-bg/40' : r.status === 'above_max' ? 'bg-surface-hover' : ''
                    return (
                      <tr key={r.id} className={`border-b border-border hover:bg-surface-hover ${rowTint}`}>
                        <td className="px-4 py-2.5">
                          <Link to={ROUTES.productDetail.replace(':id', String(r.id))} className="font-semibold text-brand hover:underline">
                            {r.ref}
                          </Link>
                          <p className="text-xs text-text-muted">{r.label}</p>
                          {r.barcode && <p className="text-xs text-text-faint">Barcode: {r.barcode}</p>}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[r.status]}`}>{r.statusLabel}</span>
                        </td>
                        <td className={`px-4 py-2.5 text-right font-semibold tabular-nums ${r.currentStock <= 0 ? 'text-danger' : r.currentStock <= r.minStock ? 'text-warning' : 'text-text!'}`}>
                          {r.currentStock.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={edit.minStock || ''}
                            onChange={(e) => setEdit(r.id, { minStock: Number(e.target.value) || 0 }, r)}
                            placeholder="0"
                            className="w-20 h-8 px-2 rounded-md border border-input-border bg-input-bg text-text text-sm text-right outline-none focus:ring-2 focus:ring-brand/30"
                          />
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={edit.maxStock || ''}
                            onChange={(e) => setEdit(r.id, { maxStock: Number(e.target.value) || 0 }, r)}
                            placeholder="0"
                            className="w-20 h-8 px-2 rounded-md border border-input-border bg-input-bg text-text text-sm text-right outline-none focus:ring-2 focus:ring-brand/30"
                          />
                        </td>
                        <td className="px-4 py-2.5 text-right text-xs text-success">
                          {r.suggestedMin > 0 ? (
                            <span className="inline-flex items-center gap-1">
                              {r.suggestedMin}
                              {edit.minStock === 0 && (
                                <button type="button" title="Apply suggested" onClick={() => setEdit(r.id, { minStock: r.suggestedMin }, r)} className="text-success hover:opacity-70">
                                  <ArrowLeft size={12} />
                                </button>
                              )}
                            </span>
                          ) : (
                            <span className="text-text-faint">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right text-xs text-purple-600 dark:text-purple-400">
                          {r.suggestedMax > 0 ? (
                            <span className="inline-flex items-center gap-1">
                              {r.suggestedMax}
                              {edit.maxStock === 0 && (
                                <button
                                  type="button"
                                  title="Apply suggested"
                                  onClick={() => setEdit(r.id, { maxStock: r.suggestedMax }, r)}
                                  className="text-purple-600 dark:text-purple-400 hover:opacity-70"
                                >
                                  <ArrowLeft size={12} />
                                </button>
                              )}
                            </span>
                          ) : (
                            <span className="text-text-faint">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right text-xs text-text-muted whitespace-nowrap">{r.avgDailyUsage > 0 ? `${r.avgDailyUsage.toFixed(2)}/d` : '—'}</td>
                        <td className="px-4 py-2.5 text-right text-xs text-text-muted whitespace-nowrap">{r.leadTimeDays}d</td>
                        <td className="px-4 py-2.5 text-right text-xs text-text-muted whitespace-nowrap" title="Read-only — the reference app's own bulk save never persists edits to this field.">
                          {r.sellingPrice > 0 ? formatMoney(r.sellingPrice) : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right text-xs text-text-muted whitespace-nowrap">{formatMoney(r.stockValue)}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      <ListPagination page={page} perPage={perPage} total={rows.length} onPageChange={setPage} edgeToEdge />

      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-surface-alt border border-border shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="flex items-center gap-2 font-semibold text-text!">
                <Upload size={16} className="text-brand" /> Import Min/Max Levels from CSV
              </h3>
              <button type="button" onClick={() => setShowImportModal(false)} className="text-text-faint hover:text-text">
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="rounded-lg bg-info-bg text-info-fg text-xs p-3">
                <p className="font-semibold mb-1">Required CSV format:</p>
                <code className="block text-xs">product_ref, min_stock, max_stock, selling_price</code>
                <p className="mt-2">Only product_ref is required. Leave a value blank to keep the existing setting.</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-text file:mr-3 file:rounded-md file:border-0 file:bg-brand/10 file:text-brand file:px-3 file:py-1.5"
              />
              <div className="rounded-lg bg-warning-bg text-warning-fg text-xs p-3">
                This overwrites existing min/max values for matched products. Products not in the CSV are unchanged.
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border">
              <button type="button" onClick={() => setShowImportModal(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-muted hover:bg-surface-hover">
                Cancel
              </button>
              <button
                type="button"
                disabled={!importFile || importCsv.isPending}
                onClick={handleImportSubmit}
                className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
              >
                {importCsv.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Upload size={14} />} Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
