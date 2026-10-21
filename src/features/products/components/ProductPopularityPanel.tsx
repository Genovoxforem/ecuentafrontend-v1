import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Info } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { getProductPopularity, type PopularityMode } from '../../../api/products'
import { useCategories } from '../../customers/categories.queries'
import { formatMoney, formatNumber } from '../../../utils/format'
import { LegacyErrorCard, LegacyLoadingCard } from './LegacyReportStates'

const selectCls = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand/30'
const MODES: [PopularityMode, string][] = [
  ['facture', 'Customer invoices'],
  ['commande', 'Customer orders'],
  ['propal', 'Customer proposals'],
  ['all', 'All three together'],
]

// Products or services ranked by how often they appear in invoices, orders or proposals
// (product/fapi/popularity.php). Three counts, not one: units, document lines and distinct
// documents, so a product that appeared once in a large quantity doesn't outrank a steady seller.
export function ProductPopularityPanel({ type: initialType }: { type: 0 | 1 }) {
  const currentYear = new Date().getFullYear()
  const [mode, setMode] = useState<PopularityMode>('facture')
  const [type, setType] = useState<0 | 1>(initialType)
  const [categ, setCateg] = useState(0)
  const [year, setYear] = useState(0)
  const [page, setPage] = useState(1)
  const { data: categories } = useCategories(0)
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['products', 'popularity', mode, type, categ, year, page],
    queryFn: () => getProductPopularity({ mode, type, year: year || undefined, categ: categ || undefined, page, limit: 25 }),
    placeholderData: (prev) => prev,
  })
  const reset = (fn: () => void) => () => {
    fn()
    setPage(1)
  }

  return (
    <div className="space-y-3">
      <Card className="!h-auto">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-faint">Count in</span>
            <select value={mode} onChange={(e) => { setMode(e.target.value as PopularityMode); setPage(1) }} className={selectCls}>
              {MODES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-faint">Products and Services</span>
            <select value={type} onChange={(e) => { setType(Number(e.target.value) as 0 | 1); setPage(1) }} className={selectCls}>
              <option value={0}>Product</option>
              <option value={1}>Service</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-faint">Tags/categories</span>
            <select value={categ} onChange={(e) => reset(() => setCateg(Number(e.target.value)))()} className={selectCls}>
              <option value={0}>All</option>
              <option value={-2}>No tag</option>
              {(categories?.items ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullLabel}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-faint">Year</span>
            <select value={year} onChange={(e) => reset(() => setYear(Number(e.target.value)))()} className={selectCls}>
              <option value={0}>All years</option>
              {Array.from({ length: 11 }, (_, i) => currentYear - i).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      {isError && <LegacyErrorCard title="Couldn't load the ranking" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}
      {isLoading && <LegacyLoadingCard label="Loading the ranking…" />}

      {data && (
        <Card className="!h-auto !p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                  <th className="font-medium px-4 py-2.5 w-14">Rank</th>
                  <th className="font-medium px-4 py-2.5">Ref</th>
                  <th className="font-medium px-4 py-2.5">Label</th>
                  <th className="font-medium px-4 py-2.5 text-right">Qty</th>
                  <th className="font-medium px-4 py-2.5 text-right">Lines</th>
                  <th className="font-medium px-4 py-2.5 text-right">Documents</th>
                  <th className="font-medium px-4 py-2.5 text-right">Amount (excl. tax)</th>
                  {mode === 'all' && <th className="font-medium px-4 py-2.5">By document</th>}
                </tr>
              </thead>
              <tbody>
                {data.items.length === 0 ? (
                  <tr>
                    <td colSpan={mode === 'all' ? 8 : 7} className="px-4 py-6 text-center text-text-faint italic">
                      Nothing was sold or quoted for this selection.
                    </td>
                  </tr>
                ) : (
                  data.items.map((p) => (
                    <tr key={p.product_id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2 font-semibold text-text!">{p.rank}</td>
                      <td className="px-4 py-2 text-text-muted">{p.ref}</td>
                      <td className="px-4 py-2 text-text!">{p.label}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{formatNumber(p.qty)}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-text-muted">{formatNumber(p.lines)}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-text-muted">{formatNumber(p.documents)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{formatMoney(p.amount_ht)}</td>
                      {mode === 'all' && (
                        <td className="px-4 py-2 text-xs text-text-muted">
                          {Object.entries(p.by_mode ?? {})
                            .map(([k, v]) => `${MODES.find(([m]) => m === k)?.[1] ?? k}: ${formatNumber(v.qty)}`)
                            .join(' · ')}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-2 text-xs text-text-faint">
            <span className="flex items-center gap-1.5">
              <Info size={13} /> {formatNumber(data.totals.products_ranked)} ranked · Qty is units, Lines the document lines, Documents the distinct documents.
            </span>
            {data.pagination.pages > 1 && (
              <span className="flex items-center gap-2">
                <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded border border-border px-2 py-1 disabled:opacity-50">
                  Previous
                </button>
                Page {data.pagination.page} of {data.pagination.pages}
                <button type="button" disabled={page >= data.pagination.pages} onClick={() => setPage(page + 1)} className="rounded border border-border px-2 py-1 disabled:opacity-50">
                  Next
                </button>
              </span>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
