import { useState, type ComponentType } from 'react'
import { RefreshCw } from 'lucide-react'
import { Card } from './DashboardKit'
import { inputClasses } from '../forms/FormField'
import { formatMoney } from '../../../utils/format'

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2]

// No stats endpoint exists on this app's backend for orders or quotations
// (same gap as the plain list — see salesOrders.queries.ts / quotations.queries.ts),
// so every number here stays an honest zero rather than invented monthly
// figures — same choice the list pages make. The filter controls and year
// picker are real/interactive; there's just nothing behind them yet.
function ChartCard({ title }: { title: string }) {
  return (
    <Card>
      <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">{title}</h3>
      <div className="h-48 flex items-center justify-center">
        <p className="text-sm text-text-faint">Not enough data...</p>
      </div>
    </Card>
  )
}

export function SalesStatsPage({
  icon: Icon,
  title,
  entityLabel,
}: {
  icon: ComponentType<{ size?: number; className?: string }>
  title: string
  entityLabel: string
}) {
  const [year, setYear] = useState(String(CURRENT_YEAR))

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
            {['Third-Party', 'Third-Party Type', 'Tag/Category Customer', 'Created By', 'Status'].map((label) => (
              <label key={label} className="flex flex-col gap-1">
                <span className="text-sm text-text">{label}</span>
                <select defaultValue="" className={inputClasses}>
                  <option value="" disabled>
                    Select...
                  </option>
                </select>
              </label>
            ))}
            <label className="flex flex-col gap-1">
              <span className="text-sm text-text">Year</span>
              <select value={year} onChange={(e) => setYear(e.target.value)} className={inputClasses}>
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="w-full rounded-md bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover flex items-center justify-center gap-1.5">
              <RefreshCw size={14} /> Refresh
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
                <td className="py-2 pr-2 text-text-muted">{year}</td>
                <td className="py-2 pr-2 text-text-muted">0</td>
                <td className="py-2 pr-2 text-text-muted">{formatMoney(0)}</td>
                <td className="py-2 text-text-muted">{formatMoney(0)}</td>
              </tr>
            </tbody>
          </table>
        </Card>

        <div className="space-y-4">
          <ChartCard title={`Number Of ${entityLabel} By Month`} />
          <ChartCard title={`Amount Of ${entityLabel} By Month (Excl. Tax)`} />
          <ChartCard title="Average Amount" />
        </div>
      </div>
    </div>
  )
}
