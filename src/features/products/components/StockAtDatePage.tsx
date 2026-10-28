import { useDeferredValue, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CalendarClock, Info, Search, X } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { useWarehousePickerOptions } from '../../warehouses/warehouseExtras.queries'
import { formatMoney, formatNumber } from '../../../utils/format'
import { ROUTES } from '../../../routes'
import { useStockAtDate } from '../productTools.queries'
import { LegacyLoadingCard, LegacyErrorCard } from './LegacyReportStates'

const inputCls = 'text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5'

// Stock at a date — product/stock/fapi/stock_at_date.php (the classic
// product/stock/stockatdate.php has no JSON).
// mode=past walks today's stock back by undoing every movement after the day;
// mode=future is the business layer's theoretical (virtual) stock limited to the
// day. The two are computed differently, so the response's `basis` is shown.
// ?productid= (from a product's Stock tab) narrows it to one product.
export function StockAtDatePage() {
  const [params, setParams] = useSearchParams()
  const mode: 'past' | 'future' = params.get('mode') === 'future' ? 'future' : 'past'
  const productId = Number(params.get('productid')) || undefined
  // Today in local time (en-CA formats as YYYY-MM-DD).
  const [date, setDate] = useState(() => new Date().toLocaleDateString('en-CA'))
  const [warehouses, setWarehouses] = useState<number[]>([])
  const [ref, setRef] = useState('')
  const [label, setLabel] = useState('')
  const [page, setPage] = useState(1)
  const limit = 50
  const deferredRef = useDeferredValue(ref)
  const deferredLabel = useDeferredValue(label)
  const { data: warehouseOptions } = useWarehousePickerOptions()

  const query = date
    ? {
        date,
        mode,
        product: productId,
        warehouse: warehouses.length ? warehouses.join(',') : undefined,
        ref: deferredRef.trim() || undefined,
        label: deferredLabel.trim() || undefined,
        page,
        limit,
      }
    : null
  const { data, isLoading, isError, error, refetch, isFetching } = useStockAtDate(query)
  const future = mode === 'future'

  function setMode(next: 'past' | 'future') {
    const p = new URLSearchParams(params)
    if (next === 'future') p.set('mode', 'future')
    else p.delete('mode')
    setParams(p, { replace: true })
    setPage(1)
  }

  function clearProduct() {
    const p = new URLSearchParams(params)
    p.delete('productid')
    setParams(p, { replace: true })
    setPage(1)
  }

  function toggleWarehouse(id: number) {
    setWarehouses((list) => (list.includes(id) ? list.filter((w) => w !== id) : [...list, id]))
    setPage(1)
  }

  const productLabel = productId && data?.items[0] && data.items[0].id === productId ? `${data.items[0].ref} — ${data.items[0].label}` : `Product #${productId}`

  return (
    <div className="space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <CalendarClock size={20} className="text-brand" /> {future ? 'Virtual Stock At Date' : 'Stock At Date'}
      </h2>

      <Card className="!h-auto">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex rounded-md border border-input-border overflow-hidden text-sm">
            {(
              [
                ['past', 'Stock at date'],
                ['future', 'Virtual stock at a future date'],
              ] as const
            ).map(([key, text]) => (
              <button key={key} type="button" onClick={() => setMode(key)} className={`px-3 py-1.5 ${mode === key ? 'bg-brand text-white' : 'bg-input-bg text-text hover:bg-surface-hover'}`}>
                {text}
              </button>
            ))}
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-faint">
              Date <span className="text-danger">*</span>
            </span>
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value)
                setPage(1)
              }}
              className={inputCls}
              required
            />
          </label>
          <details className="relative">
            <summary className={`${inputCls} cursor-pointer list-none min-w-44`}>{warehouses.length ? `${warehouses.length} warehouse${warehouses.length > 1 ? 's' : ''}` : 'All warehouses'}</summary>
            <div className="absolute z-20 mt-1 max-h-64 w-64 overflow-auto rounded-md border border-border bg-surface-alt p-2 shadow-lg">
              {(warehouseOptions ?? []).map((w) => (
                <label key={w.id} className="flex items-center gap-2 px-1 py-1 text-sm text-text">
                  <input type="checkbox" checked={warehouses.includes(w.id)} onChange={() => toggleWarehouse(w.id)} />
                  {w.ref}
                  {w.label && w.label !== w.ref ? <span className="text-text-faint">— {w.label}</span> : null}
                </label>
              ))}
            </div>
          </details>
          {!productId && (
            <>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
                <input
                  value={ref}
                  onChange={(e) => {
                    setRef(e.target.value)
                    setPage(1)
                  }}
                  placeholder="Ref"
                  className={`${inputCls} pl-8 w-36`}
                />
              </div>
              <input
                value={label}
                onChange={(e) => {
                  setLabel(e.target.value)
                  setPage(1)
                }}
                placeholder="Label"
                className={`${inputCls} w-48`}
              />
            </>
          )}
          {productId && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-sm text-brand">
              {productLabel}
              <button type="button" onClick={clearProduct} aria-label="Show every product" className="hover:text-brand-hover">
                <X size={13} />
              </button>
            </span>
          )}
          {isFetching && <span className="text-xs text-text-faint">Refreshing…</span>}
        </div>
      </Card>

      {!date && <p className="text-sm text-text-faint">Pick a date to see the stock on that day.</p>}
      {isError && <LegacyErrorCard title="Couldn't load the stock at this date" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}
      {isLoading && <LegacyLoadingCard label="Calculating the stock at this date…" />}

      {data && (
        <>
          <div className="flex items-start gap-2 text-xs text-text-faint">
            <Info size={13} className="mt-0.5 shrink-0" />
            <p>
              {future ? 'Projected' : 'Computed'} for {data.date}: {data.basis}.
            </p>
          </div>
          <Card className="!p-0 !h-auto overflow-hidden">
            <div className="overflow-auto max-h-[70vh]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                    <th className="font-medium px-3 py-2.5">Product</th>
                    <th className="font-medium px-3 py-2.5 text-right whitespace-nowrap">Desired Stock</th>
                    <th className="font-medium px-3 py-2.5 text-right whitespace-nowrap">Stock Limit</th>
                    <th className="font-medium px-3 py-2.5 text-right whitespace-nowrap">{future ? 'Virtual Stock At Date' : 'Stock At Date'}</th>
                    <th className="font-medium px-3 py-2.5 text-right whitespace-nowrap">Value At PMP</th>
                    <th className="font-medium px-3 py-2.5 text-right whitespace-nowrap">Current Stock</th>
                    <th className="font-medium px-3 py-2.5 text-right whitespace-nowrap">Current Value</th>
                    <th className="font-medium px-3 py-2.5 text-right whitespace-nowrap">{future ? 'Virtual Stock (no limit)' : 'Movements Since'}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.length === 0 ? (
                    <tr>
                      <td className="px-3 py-4 text-text-faint italic" colSpan={8}>
                        No product matches these filters.
                      </td>
                    </tr>
                  ) : (
                    data.items.map((row) => (
                      <tr key={row.id} className="border-b border-border hover:bg-surface-hover">
                        <td className="px-3 py-2.5">
                          <Link to={ROUTES.productDetail.replace(':id', String(row.id))} className="text-brand hover:underline font-medium">
                            {row.label}
                          </Link>
                          <span className="block text-xs text-text-faint">Ref: {row.ref}</span>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-text-muted">{formatNumber(row.desired_stock)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-text-muted">{formatNumber(row.stock_limit)}</td>
                        <td className={`px-3 py-2.5 text-right tabular-nums font-semibold ${row.stock_at_date < 0 ? 'text-danger' : 'text-text!'}`}>{formatNumber(row.stock_at_date)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-text-muted">{formatMoney(row.value_at_pmp)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-text-muted">{formatNumber(row.current_stock)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-text-muted">{formatMoney(row.current_value)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-text-muted">
                          {future ? (row.virtual_stock === null ? '—' : formatNumber(row.virtual_stock)) : row.movements_since === null ? '—' : formatNumber(row.movements_since)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {data.items.length > 0 && (
                  <tfoot>
                    <tr className="bg-surface-alt text-sm font-medium text-text!">
                      <td className="px-3 py-2.5">Total (this page)</td>
                      <td colSpan={2} />
                      <td className="px-3 py-2.5 text-right tabular-nums">{formatNumber(data.totals.page_stock_at_date)}</td>
                      <td />
                      <td className="px-3 py-2.5 text-right tabular-nums">{formatNumber(data.totals.page_current_stock)}</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </Card>
          <ListPagination page={page} perPage={limit} total={data.pagination.total} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}
