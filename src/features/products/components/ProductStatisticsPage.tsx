import { useState } from 'react'
import { Info, RefreshCw } from 'lucide-react'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useCategories } from '../../customers/categories.queries'
import { useProductStatistics, type ProductStatsFilters } from '../productTools.queries'
import type { ProductStatSeries } from '../productTypes'
import { LegacyLoadingCard, LegacyErrorCard } from './LegacyReportStates'
import { ProductPopularityPanel } from './ProductPopularityPanel'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const selectCls = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand/30'

// labels: one per point (e.g. "Nov 25" for a rolling twelve months); without
// them the points are read as January–December.
export function StatMiniChart({ series, color, labels }: { series: ProductStatSeries; color: string; labels?: string[] | null }) {
  const data = series.monthly.map((v, i) => ({ month: labels?.[i] ?? MONTHS[i] ?? String(i + 1), value: v }))
  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-text!">{series.label}</h3>
        <span className="text-xs font-medium rounded-md bg-brand/10 text-brand px-2 py-0.5">{series.total}</span>
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <XAxis dataKey="month" stroke="var(--color-text-faint)" fontSize={10.5} tickLine={false} axisLine={false} interval={0} />
          <Tooltip
            cursor={{ fill: 'var(--color-surface-hover)' }}
            contentStyle={{ fontSize: 12.6, background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '6px 8px' }}
          />
          <Bar dataKey="value" fill={color} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}

// Usage per document type (proposals, orders, invoices, vendor documents,
// contracts, manufacturing) month by month, over every product or service —
// product/fapi/global_stats.php, with the classic page's filters: type, tag,
// year (or the twelve months ending this one) and the measure (units on the
// lines, or number of documents). A series whose module is off or not readable
// is left out and named, so an empty chart is never read as zero. An older
// backend falls back to scraping product/stats/card.php. "By popularity"
// "By popularity" is product/fapi/popularity.php (see ProductPopularityPanel.tsx).
export function ProductStatisticsPage({ type: initialType }: { type: 0 | 1; title?: string }) {
  const currentYear = new Date().getFullYear()
  const [tab, setTab] = useState<'chart' | 'popularity'>('chart')
  const [type, setType] = useState<0 | 1>(initialType)
  const [draft, setDraft] = useState<{ categoryId: number; year: number }>({ categoryId: 0, year: 0 })
  const [filters, setFilters] = useState<ProductStatsFilters>({ mode: 'byunit', year: 0, categoryId: 0 })
  const { data, isLoading, isError, error, refetch, isFetching } = useProductStatistics(type, filters)
  const { data: categories } = useCategories(0)
  const years = Array.from({ length: 11 }, (_, i) => currentYear - i)
  const series = data?.series

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1 border-b border-border">
        {(
          [
            ['chart', 'Chart'],
            ['popularity', 'Products/Services by popularity'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-3 py-2 text-sm -mb-px border-b-2 ${tab === key ? 'border-brand text-brand font-medium' : 'border-transparent text-text-muted hover:text-text'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'popularity' ? (
        <ProductPopularityPanel type={type} />
      ) : (
        <>
          <Card className="!h-auto">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-text-faint">Products and Services</span>
                <select value={type} onChange={(e) => setType(Number(e.target.value) as 0 | 1)} className={selectCls}>
                  <option value={0}>Product</option>
                  <option value={1}>Service</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-text-faint">Tags/categories</span>
                <select value={draft.categoryId} onChange={(e) => setDraft({ ...draft, categoryId: Number(e.target.value) })} className={selectCls}>
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
                <select value={draft.year} onChange={(e) => setDraft({ ...draft, year: Number(e.target.value) })} className={selectCls}>
                  <option value={0}>Last 12 months</option>
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button
              type="button"
              onClick={() => setFilters({ ...filters, year: draft.year, categoryId: draft.categoryId })}
              className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-hover"
            >
              <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} /> Refresh
            </button>
          </Card>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            {(
              [
                ['byunit', 'Statistics for sum of qty of products/services'],
                ['bynumber', 'Statistics in number of referring entities (no. of invoice, or order…)'],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => setFilters({ ...filters, mode })}
                className={filters.mode === mode ? 'font-medium text-text!' : 'text-brand hover:underline'}
              >
                {label}
              </button>
            ))}
          </div>

          {isError && <LegacyErrorCard title="Couldn't load statistics" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}
          {isLoading && <LegacyLoadingCard label="Loading statistics…" />}

          {data && (
            <p className="flex items-center gap-1.5 text-xs text-text-faint">
              <Info size={13} className="shrink-0" />
              Period: {data.periodLabel}
              {data.covers !== null && ` · covers ${data.covers} ${type === 1 ? 'service' : 'product'}${data.covers === 1 ? '' : 's'}`}
            </p>
          )}
          {data && data.skipped.length > 0 && (
            <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning-bg px-3 py-2 text-sm text-warning-fg">
              <Info size={15} className="mt-0.5 shrink-0" />
              <p>Not shown (module off or no permission — not a zero): {data.skipped.join(', ')}.</p>
            </div>
          )}

          {series &&
            (series.length === 0 ? (
              <Card className="items-center justify-center py-10 text-center">
                <p className="text-sm text-text-faint">No usage data for this selection.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {series.map((s, i) => (
                  <StatMiniChart key={s.label} series={s} labels={data?.labels} color={`var(--color-chart-${(i % 8) + 1})`} />
                ))}
              </div>
            ))}
        </>
      )}
    </div>
  )
}
