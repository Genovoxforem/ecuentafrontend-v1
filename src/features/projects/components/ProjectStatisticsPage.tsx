import { useState } from 'react'
import { BarChart3 } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useProjectStats } from '../projectStats.queries'
import { StatsBarChart } from './StatsBarChart'

const selectCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 appearance-none'

export function ProjectStatisticsPage() {
  const [year, setYear] = useState<string | undefined>(undefined)
  const { data, isLoading, isError, error } = useProjectStats(year)

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <BarChart3 size={20} className="text-brand" /> Statistics on projects or leads
      </h2>

      {isError && (
        <Card className="!h-auto !bg-danger-bg border-danger/40 text-danger-fg text-sm font-medium">{error instanceof Error ? error.message : 'Failed to load statistics.'}</Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="!h-auto space-y-3">
          <p className="text-sm font-semibold text-text!">Filter</p>
          <div>
            <label className="block text-xs font-medium text-text-faint mb-1">Year</label>
            <select value={year ?? ''} onChange={(e) => setYear(e.target.value || undefined)} className={selectCls} disabled={isLoading}>
              {(data?.yearOptions.length ? data.yearOptions : [{ value: '', label: String(new Date().getFullYear()) }]).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                  {(data?.table?.headers ?? ['Year', 'Number of projects', 'Lead amount', 'Average lead amount', 'Weighted lead amount']).map((h) => (
                    <th key={h} className="font-medium py-2 pr-4">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td className="py-3 text-text-faint italic">Loading…</td>
                  </tr>
                ) : !data?.table || data.table.rows.length === 0 ? (
                  <tr>
                    <td className="py-3 text-text-faint italic">No data.</td>
                  </tr>
                ) : (
                  data.table.rows.map((row, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      {row.map((cell, j) => (
                        <td key={j} className="py-2 pr-4 text-text-muted">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-4">
          {(data?.charts ?? []).map((chart) => (
            <Card key={chart.title} className="!h-auto">
              <StatsBarChart chart={chart} />
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
