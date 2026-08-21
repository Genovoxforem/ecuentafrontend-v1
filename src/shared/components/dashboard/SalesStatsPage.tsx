import type { ComponentType } from 'react'
import { RefreshCw } from 'lucide-react'
import { Card } from './DashboardKit'
import { inputClasses } from '../forms/FormField'
import { SearchableSelect, type SearchableSelectOption } from '../forms/SearchableSelect'
import { formatMoney } from '../../../utils/format'
import type { MonthlyStats } from '../../../features/salesOrders/orderStats.queries'

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2]
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function BarChartCard({ title, values, format }: { title: string; values: number[]; format: (v: number) => string }) {
  const max = Math.max(1, ...values)
  return (
    <Card>
      <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">{title}</h3>
      <div className="flex items-end gap-2 h-40 border-l border-b border-border pl-2 pb-1">
        {MONTHS.map((m, i) => {
          const v = values[i] ?? 0
          return (
            <div key={m} className="flex-1 flex flex-col items-center justify-end h-full" title={`${m}: ${format(v)}`}>
              <span className="text-[10px] text-text-muted mb-0.5">{v > 0 ? format(v) : ''}</span>
              <div className="w-full bg-brand rounded-t-sm" style={{ height: v === 0 ? 0 : `${Math.max(4, (v / max) * 100)}%` }} />
              <span className="text-[10px] text-text-faint mt-1">{m}</span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// Real filter data + state, supplied by a caller whose backend endpoint actually accepts
// these (currently just OrderStatistics — api/orders/stats/index.php's socid/userid/
// typent_id/categ_id/status params). Optional so PurchaseOrderStatistics/QuotationStatistics
// keep the previous disabled-placeholder rendering until/unless their own stats endpoints
// grow the same real filtering.
export interface SalesStatsFilters {
  thirdParty: { value: string; onChange: (v: string) => void; options: SearchableSelectOption[] }
  thirdPartyType: { value: string; onChange: (v: string) => void; options: SearchableSelectOption[] }
  category: { value: string; onChange: (v: string) => void; options: SearchableSelectOption[] }
  createdBy: { value: string; onChange: (v: string) => void; options: SearchableSelectOption[] }
  status: { value: string; onChange: (v: string) => void; options: SearchableSelectOption[] }
}

export function SalesStatsPage({
  icon: Icon,
  title,
  entityLabel,
  stats,
  isLoading,
  year,
  onYearChange,
  filters,
  onRefresh,
}: {
  icon: ComponentType<{ size?: number; className?: string }>
  title: string
  entityLabel: string
  stats: MonthlyStats | undefined
  isLoading: boolean
  year: string
  onYearChange: (year: string) => void
  filters?: SalesStatsFilters
  onRefresh?: () => void
}) {
  const counts = stats?.countByMonth?.[year] ?? Array(12).fill(0)
  const amounts = stats?.amountByMonth?.[year] ?? Array(12).fill(0)
  const averages = counts.map((c, i) => (c > 0 ? amounts[i] / c : 0))
  const summary = stats?.summary ?? { count: 0, totalAmount: 0, averageAmount: 0 }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Icon size={20} className="text-brand" /> {title}
      </h2>

      <span className="inline-block rounded-md bg-brand px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white">By Month/Year</span>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 items-start">
        <Card className="gap-3">
          <h3 className="font-semibold text-text!">Filter</h3>
          <div className="space-y-3">
            {filters ? (
              <>
                <label className="flex flex-col gap-1">
                  <span className="text-sm text-text">Third-Party</span>
                  <SearchableSelect value={filters.thirdParty.value} onChange={filters.thirdParty.onChange} options={filters.thirdParty.options} placeholder="Select…" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm text-text">Third-Party Type</span>
                  <select value={filters.thirdPartyType.value} onChange={(e) => filters.thirdPartyType.onChange(e.target.value)} className={inputClasses}>
                    <option value="">Select...</option>
                    {filters.thirdPartyType.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm text-text">Tag/Category Customer</span>
                  <select value={filters.category.value} onChange={(e) => filters.category.onChange(e.target.value)} className={inputClasses}>
                    <option value="">Select...</option>
                    {filters.category.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm text-text">Created By</span>
                  <select value={filters.createdBy.value} onChange={(e) => filters.createdBy.onChange(e.target.value)} className={inputClasses}>
                    <option value="">Select...</option>
                    {filters.createdBy.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm text-text">Status</span>
                  <select value={filters.status.value} onChange={(e) => filters.status.onChange(e.target.value)} className={inputClasses}>
                    <option value="">Select...</option>
                    {filters.status.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : (
              // No filtering endpoint exists yet for this entity's stats — stays decorative
              // until/unless its own backend grows the same real params OrderStatistics has.
              ['Third-Party', 'Third-Party Type', 'Tag/Category Customer', 'Created By', 'Status'].map((label) => (
                <label key={label} className="flex flex-col gap-1">
                  <span className="text-sm text-text">{label}</span>
                  <select defaultValue="" className={inputClasses} disabled>
                    <option value="" disabled>
                      Select...
                    </option>
                  </select>
                </label>
              ))
            )}
            <label className="flex flex-col gap-1">
              <span className="text-sm text-text">Year</span>
              <select value={year} onChange={(e) => onYearChange(e.target.value)} className={inputClasses}>
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              className="w-full rounded-md bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>

          <table className="w-full text-sm mt-2">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                <th className="font-medium py-1.5 pr-2">Year</th>
                <th className="font-medium py-1.5 pr-2">Number Of {entityLabel}</th>
                <th className="font-medium py-1.5 pr-2">Total Amount</th>
                <th className="font-medium py-1.5">Average Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-2 pr-2 text-brand font-medium">{year}</td>
                <td className="py-2 pr-2 text-text! tabular-nums">{summary.count}</td>
                <td className="py-2 pr-2 text-text! tabular-nums">{formatMoney(summary.totalAmount)}</td>
                <td className="py-2 text-text! tabular-nums">{formatMoney(summary.averageAmount)}</td>
              </tr>
            </tbody>
          </table>
        </Card>

        <div className="space-y-4">
          <BarChartCard title={`Number Of ${entityLabel} By Month`} values={counts} format={(v) => String(v)} />
          <BarChartCard title={`Amount Of ${entityLabel} By Month (Excl. Tax)`} values={amounts} format={formatMoney} />
          <BarChartCard title="Average Amount" values={averages} format={formatMoney} />
        </div>
      </div>
    </div>
  )
}
