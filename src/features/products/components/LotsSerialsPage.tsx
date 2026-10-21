import { useDeferredValue, useState } from 'react'
import { Link } from 'react-router-dom'
import { Columns3, Hash, Plus, Search } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { formatNumber } from '../../../utils/format'
import { ROUTES } from '../../../routes'
import { InBanner } from '../../../shared/components/layout/bannerSlot'
import { useLotList } from '../productTools.queries'
import { LegacyLoadingCard, LegacyErrorCard } from './LegacyReportStates'

const COLUMNS = ['Lot/Serial', 'Product', 'Sell-by Date', 'Eat-by Date', 'Creation Date', 'Stock', '']

// Lots and serial numbers — product/stock/fapi/lots.php (server-side filters and
// paging, with the create / update / delete the classic card never wired up; see
// LotSerialDetailPage). An older backend falls back to scraping
// product/stock/productlot_list.php, read-only.
export function LotsSerialsPage() {
  const [batch, setBatch] = useState('')
  const deferredBatch = useDeferredValue(batch)
  const [expired, setExpired] = useState(false)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(25)
  const { data, isLoading, isError, error, refetch, isFetching } = useLotList({ batch: deferredBatch, expired, page, limit })

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Hash size={20} className="text-brand" /> Lots/Serials
        </h2>
        <InBanner>
          <span className="text-lg font-semibold text-text!">{data ? data.total : ''}</span>
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value))
              setPage(1)
            }}
            className="rounded-md border border-input-border bg-input-bg px-2 py-2 text-sm text-text"
            aria-label="Rows per page"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          {data?.canCreate && (
            <Link to={ROUTES.productLotSerialDetail.replace(':id', 'new')} aria-label="New lot/serial" title="New lot/serial" className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover">
              <Plus size={16} /> New
            </Link>
          )}
        </InBanner>
      </div>

      {isError && <LegacyErrorCard title="Couldn't load lots/serials" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}
      {isLoading && <LegacyLoadingCard label="Loading lot/serial records…" />}

      {data && (
        <>
          <Card className="!p-0 !h-auto overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 p-3 border-b border-border">
              <div className="relative w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
                <input
                  type="text"
                  value={batch}
                  onChange={(e) => {
                    setBatch(e.target.value)
                    setPage(1)
                  }}
                  placeholder="Search lot/serial…"
                  className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text pl-8 pr-3 py-1.5"
                />
              </div>
              <button type="button" disabled title="Column chooser" className="rounded-md border border-input-border bg-input-bg px-2.5 py-1.5 text-text-muted">
                <Columns3 size={15} />
              </button>
              <label className="flex items-center gap-2 text-sm text-text">
                <input
                  type="checkbox"
                  checked={expired}
                  onChange={(e) => {
                    setExpired(e.target.checked)
                    setPage(1)
                  }}
                />
                Expired only
              </label>
              {isFetching && <span className="text-xs text-text-faint">Refreshing…</span>}
            </div>
            <div className="overflow-auto max-h-[70vh]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                    {COLUMNS.map((col, i) => (
                      <th key={col || i} className={`font-medium px-3 py-2.5 whitespace-nowrap ${col === 'Stock' ? 'text-right' : ''}`}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.length === 0 ? (
                    <tr>
                      <td className="px-3 py-4 text-text-faint italic" colSpan={COLUMNS.length}>
                        {batch || expired ? 'No lot/serial matches these filters.' : 'No Record Found'}
                      </td>
                    </tr>
                  ) : (
                    data.rows.map((row, i) => (
                      <tr key={row.id ?? `${row.batch}-${i}`} className="border-b border-border hover:bg-surface-hover">
                        <td className="px-3 py-2.5">
                          {row.id ? (
                            <Link to={ROUTES.productLotSerialDetail.replace(':id', row.id)} className="text-brand hover:underline font-medium">
                              {row.batch}
                            </Link>
                          ) : (
                            row.batch
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          {row.productId ? (
                            <Link to={ROUTES.productDetail.replace(':id', row.productId)} className="text-brand hover:underline">
                              {row.productLabel || row.productRef || `#${row.productId}`}
                            </Link>
                          ) : (
                            <span className="text-text!">{row.productLabel}</span>
                          )}
                          {row.productRef && <span className="block text-xs text-text-faint">Ref: {row.productRef}</span>}
                        </td>
                        <td className="px-3 py-2.5 text-text-muted whitespace-nowrap">{row.sellBy || '-'}</td>
                        <td className="px-3 py-2.5 text-text-muted whitespace-nowrap">{row.eatBy || '-'}</td>
                        <td className="px-3 py-2.5 text-text-muted whitespace-nowrap">{row.created || '-'}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-text-muted">{row.stockQty === null ? '—' : formatNumber(row.stockQty)}</td>
                        <td className="px-3 py-2.5">
                          {row.expired && <span className="inline-block rounded bg-danger-bg px-2 py-0.5 text-xs font-medium text-danger-fg">Expired</span>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {data.totals && data.rows.length > 0 && (
                  <tfoot>
                    <tr className="bg-surface-alt text-sm font-medium text-text!">
                      <td className="px-3 py-2.5" colSpan={5}>
                        Total (this page)
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{formatNumber(data.totals.stockQty)}</td>
                      <td className="px-3 py-2.5 text-xs font-normal text-text-faint">{data.totals.expired} expired</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </Card>
          <ListPagination page={page} perPage={limit} total={data.total} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}
