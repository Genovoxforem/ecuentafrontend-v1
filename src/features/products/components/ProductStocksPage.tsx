import { useMemo, useState } from 'react'
import { Warehouse, ArrowLeftRight, ExternalLink, Search } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { resolveBackendAsset } from '../../../api/backends'
import { useProductStocksReport } from '../products.queries'
import { LegacyLoadingCard, LegacyErrorCard, SaleStatusBadge } from './LegacyReportStates'
import { ProductAvatar } from './ProductAvatar'
import type { StockLocationRow } from '../productLegacyParsers'

const COLUMNS = ['Product', 'Stock Limit for Alert', 'Desired Stock', 'Physical Stock', 'Virtual Stock', 'For Sale', 'For Purchase', '']

function matchesSearch(row: StockLocationRow, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [row.ref, row.label].some((field) => field.toLowerCase().includes(q))
}

// Real data scraped from product/reassort.php (no REST equivalent) — see
// productLegacyParsers.ts / useProductStocksReport.
export function ProductStocksPage() {
  const { data: rows, isLoading, isError, error, refetch } = useProductStocksReport()
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => (rows ?? []).filter((r) => matchesSearch(r, search)), [rows, search])

  return (
    <div className="space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Warehouse size={20} className="text-brand" /> Stocks and Location of Products
      </h2>

      {isError && <LegacyErrorCard title="Couldn't load stock levels" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}
      {isLoading && <LegacyLoadingCard label="Loading real stock levels from the legacy backend…" />}

      {rows && (
        <Card className="!p-0 !h-auto overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 p-3 border-b border-border">
            <div className="relative w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ref or label…"
                className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text pl-8 pr-3 py-1.5"
              />
            </div>
          </div>
          <div className="overflow-auto max-h-[70vh]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                  {COLUMNS.map((col, i) => (
                    <th key={col || i} className="font-medium px-3 py-2.5 whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td className="px-3 py-4 text-text-faint italic" colSpan={COLUMNS.length}>
                      No products with stock tracking found.
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td className="px-3 py-4 text-text-faint italic" colSpan={COLUMNS.length}>
                      No rows match "{search}".
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <tr key={row.ref} className="border-b border-border hover:bg-surface-hover">
                      <td className="px-3 py-2.5">
                        <span className="flex items-center gap-2">
                          <ProductAvatar bg={row.avatarBg} color={row.avatarColor} />
                          <span>
                            {row.cardUrl ? (
                              <a href={resolveBackendAsset(row.cardUrl)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-brand hover:underline font-medium">
                                {row.label}
                                <ExternalLink size={10} className="text-text-faint" />
                              </a>
                            ) : (
                              <span className="text-text! font-medium">{row.label}</span>
                            )}
                            <span className="block text-xs text-text-faint">Ref: {row.ref}</span>
                          </span>
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-text-muted text-right tabular-nums">{row.stockLimitForAlert}</td>
                      <td className="px-3 py-2.5 text-text-muted text-right tabular-nums">{row.desiredStock}</td>
                      <td className={`px-3 py-2.5 text-right tabular-nums font-medium ${row.physicalStock > 0 ? 'text-success' : 'text-warning-fg'}`}>{row.physicalStock}</td>
                      <td className="px-3 py-2.5 text-text-muted text-right tabular-nums">{row.virtualStock}</td>
                      <td className="px-3 py-2.5">
                        <SaleStatusBadge value={row.forSale} />
                      </td>
                      <td className="px-3 py-2.5">
                        <SaleStatusBadge value={row.forPurchase} />
                      </td>
                      <td className="px-3 py-2.5">
                        {row.movementsUrl && (
                          <a href={resolveBackendAsset(row.movementsUrl)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-brand hover:underline whitespace-nowrap">
                            <ArrowLeftRight size={12} /> Movements
                          </a>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
