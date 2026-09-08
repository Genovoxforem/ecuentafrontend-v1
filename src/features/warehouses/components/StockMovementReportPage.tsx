import { useState } from 'react'
import { ListChecks, Loader2, AlertTriangle, Search } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Th, TheadRow } from '../../../shared/components/table/SortableTh'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { useProductOptions } from '../../products/products.queries'
import { useBoxBreakWarehouses } from '../boxBreak.queries'
import { useStockMovementReport } from '../stockMovementReport.queries'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'

function defaultDateRange() {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 90)
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  return { dateStart: iso(start), dateEnd: iso(end) }
}

const COLUMNS = ['Date', 'Particulars', 'Invoice/Order No.', 'Stock In', 'Stock Out', 'Closing Stock']

export function StockMovementReportPage() {
  const { data: products } = useProductOptions()
  const { data: warehouses } = useBoxBreakWarehouses()
  const [productId, setProductId] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [{ dateStart, dateEnd }, setDateRange] = useState(defaultDateRange)
  const [draft, setDraft] = useState(defaultDateRange())

  const { data: report, isLoading, isFetching, isError, error } = useStockMovementReport({
    productId: productId ? Number(productId) : undefined,
    warehouseId: warehouseId ? Number(warehouseId) : undefined,
    dateStart,
    dateEnd,
  })

  const productOptions = (products ?? []).map((p) => ({ value: p.id, label: `${p.ref} — ${p.label}`, keywords: p.ref }))
  const warehouseOptions = [{ value: '', label: 'All Warehouses' }, ...(warehouses ?? []).map((w) => ({ value: String(w.id), label: w.description ? `${w.ref} — ${w.description}` : w.ref }))]

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <ListChecks size={20} className="text-brand" /> Stock Movement Report
      </h2>
      <p className="text-sm text-text-faint -mt-2">A stock card for one product — opening balance, every movement in the range, and a running closing balance.</p>

      <Card className="!h-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 items-end">
          <div className="xl:col-span-2">
            <label className="block text-xs text-text-faint mb-1">Product*</label>
            <SearchableSelect value={productId} onChange={setProductId} options={productOptions} placeholder="Search product…" />
          </div>
          <div>
            <label className="block text-xs text-text-faint mb-1">Warehouse</label>
            <SearchableSelect value={warehouseId} onChange={setWarehouseId} options={warehouseOptions} placeholder="All Warehouses" />
          </div>
          <div>
            <label className="block text-xs text-text-faint mb-1">From</label>
            <input type="date" value={draft.dateStart} onChange={(e) => setDraft((d) => ({ ...d, dateStart: e.target.value }))} className={inputCls + ' w-full'} />
          </div>
          <div>
            <label className="block text-xs text-text-faint mb-1">To</label>
            <input type="date" value={draft.dateEnd} onChange={(e) => setDraft((d) => ({ ...d, dateEnd: e.target.value }))} className={inputCls + ' w-full'} />
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDateRange(draft)}
          disabled={!productId}
          className="mt-3 flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
        >
          {isFetching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />} Run Report
        </button>
      </Card>

      {!productId && (
        <Card className="!h-auto flex items-center justify-center py-10 text-sm text-text-faint italic">Select a product to run the report.</Card>
      )}

      {isError && productId && (
        <Card className="!bg-danger-bg border-danger/40 flex items-start gap-3">
          <AlertTriangle size={18} className="text-danger-fg shrink-0 mt-0.5" />
          <p className="text-sm text-danger-fg">{error instanceof Error ? error.message : 'Failed to load the report.'}</p>
        </Card>
      )}

      {productId && (
        <Card className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <TheadRow>
                  {COLUMNS.map((c, i) => (
                    <Th key={c} className="whitespace-nowrap" align={i >= 3 ? 'right' : undefined}>
                      {c}
                    </Th>
                  ))}
                </TheadRow>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={COLUMNS.length} className="px-4 py-6 text-center text-text-faint">
                      <Loader2 size={16} className="inline animate-spin mr-2" /> Loading…
                    </td>
                  </tr>
                ) : (
                  (report?.rows ?? []).map((r, i) => (
                    <tr key={i} className={`border-b border-border hover:bg-surface-hover ${r.particulars === 'OPENING' ? 'bg-surface-hover font-medium' : ''}`}>
                      <td className="px-3 py-2 text-text-muted whitespace-nowrap">{r.date}</td>
                      <td className="px-3 py-2 text-text!">{r.particulars}</td>
                      <td className="px-3 py-2 text-text-muted">{r.invoiceNo || '-'}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-success-fg">{r.stockIn !== '' ? r.stockIn : '-'}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-danger-fg">{r.stockOut !== '' ? r.stockOut : '-'}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-text! font-semibold">{r.closingStock}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {report && (
                <tfoot>
                  <tr className="bg-brand/10 font-semibold">
                    <td colSpan={3} className="px-3 py-2 text-right text-text!">
                      Totals
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-success-fg">{report.totals.totalIn}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-danger-fg">{report.totals.totalOut}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-text!">{report.totals.closingStock}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
