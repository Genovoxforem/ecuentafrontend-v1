import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, X, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { formatMoney } from '../../../utils/format'
import { useSalesOrdersSummary } from '../salesOrders.queries'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'

// Native replacement for the legacy page's own "click the search box, a
// 'List Details' side panel slides in with every order" quick-switcher —
// reuses useSalesOrdersSummary(), the SAME real DataTables-backed data
// source (commande/salesoredr_ajax_list.php) OrdersList.tsx already fetches
// (see salesOrders.queries.ts), rather than scraping this page's own
// data — no new backend integration, just a second consumer of an
// already-verified real source.

const STATUS_TONE: Record<string, string> = {
  Draft: 'text-info-fg',
  Validated: 'text-warning-fg',
  Closed: 'text-success-fg',
  Cancelled: 'text-text-faint',
}

const PAGE_SIZE = 25

export function OrderQuickSearchPanel({ onClose }: { onClose: () => void }) {
  const { data, isLoading, isError, error, refetch } = useSalesOrdersSummary()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    const all = data?.orders ?? []
    const q = search.trim().toLowerCase()
    if (!q) return all
    return all.filter((o) => o.ref.toLowerCase().includes(q) || o.thirdParty.toLowerCase().includes(q) || o.refCustomer.toLowerCase().includes(q))
  }, [data, search])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const clampedPage = Math.min(page, pageCount - 1)
  const pageRows = filtered.slice(clampedPage * PAGE_SIZE, clampedPage * PAGE_SIZE + PAGE_SIZE)

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div className="w-full max-w-sm h-full bg-surface border-l border-border shadow-xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-text!">List Details</h3>
          <button type="button" onClick={onClose} className="p-1 rounded-md text-text-faint hover:bg-surface-hover hover:text-text">
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Link
            to={ROUTES.orderCreate}
            title="New sales order"
            className="flex items-center justify-center w-8 h-8 rounded-md bg-brand text-white hover:bg-brand-hover shrink-0"
          >
            <Plus size={16} />
          </Link>
          <div className="relative flex-1">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint" />
            <input
              autoFocus
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(0)
              }}
              placeholder="Search"
              className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text pl-8 pr-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {isLoading ? (
            <LegacyLoadingCard label="Loading orders…" />
          ) : isError || !data ? (
            <LegacyErrorCard title="Couldn't load orders" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
          ) : pageRows.length === 0 ? (
            <p className="text-sm text-text-faint italic text-center py-8">No orders found.</p>
          ) : (
            pageRows.map((o) => (
              <Link
                key={o.id}
                to={ROUTES.orderDetail.replace(':id', String(o.id))}
                onClick={onClose}
                className="flex items-start justify-between gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-surface-hover"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text! truncate">{o.thirdParty || '—'}</p>
                  <p className="text-xs text-text-faint truncate">{o.ref}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-text!">{formatMoney(o.amountExclTax)}</p>
                  <p className={`text-xs ${STATUS_TONE[o.status] ?? 'text-text-faint'}`}>{o.status}</p>
                  <p className="text-[11px] text-text-faint">{o.orderDate}</p>
                </div>
              </Link>
            ))
          )}
        </div>

        {!isLoading && !isError && filtered.length > 0 && (
          <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-t border-border text-xs text-text-faint">
            <span>
              Showing {clampedPage * PAGE_SIZE + 1} to {Math.min((clampedPage + 1) * PAGE_SIZE, filtered.length)} of {filtered.length} entries
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={clampedPage === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="p-1 rounded-md hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                disabled={clampedPage >= pageCount - 1}
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                className="p-1 rounded-md hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
