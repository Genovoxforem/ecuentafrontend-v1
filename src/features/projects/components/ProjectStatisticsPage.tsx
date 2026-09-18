import { useState } from 'react'
import { BarChart3, RefreshCw } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { useCustomerOptions } from '../../customers/customerOptions'
import { useProjectStats } from '../projectStats.queries'
import { StatsBarChart } from './StatsBarChart'

const selectCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 appearance-none w-full'

export function ProjectStatisticsPage() {
  const [year, setYear] = useState<string | undefined>(undefined)
  const [socid, setSocid] = useState('')
  const { data, isLoading, isError, error, refetch } = useProjectStats(year, socid || undefined)
  const { data: customers } = useCustomerOptions()
  const customerOptions = (customers ?? []).map((c) => ({ value: c.id, label: c.name }))

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <BarChart3 size={20} className="text-brand" /> Statistics on projects or leads
      </h2>

      <div className="border-b border-border">
        <span className="inline-block px-1 pb-2 text-sm font-semibold text-brand border-b-2 border-brand">By Month/Year</span>
      </div>

      {isError && (
        <Card className="!h-auto !bg-danger-bg border-danger/40 text-danger-fg text-sm font-medium">{error instanceof Error ? error.message : 'Failed to load statistics.'}</Card>
      )}

      <Card className="!h-auto space-y-3">
        <p className="text-sm font-semibold text-text!">Filter</p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <label className="block text-xs font-medium text-text-faint mb-1">Third-party</label>
            <SearchableSelect value={socid} onChange={setSocid} options={customerOptions} placeholder="-- Select Third-party --" />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-medium text-text-faint mb-1">Year</label>
            <select value={year ?? ''} onChange={(e) => setYear(e.target.value || undefined)} className={selectCls} disabled={isLoading}>
              {(data?.yearOptions.length ? data.yearOptions : [{ value: '', label: String(new Date().getFullYear()) }]).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <button type="button" onClick={() => refetch()} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover shrink-0">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </Card>

      <Card className="!h-auto">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                {(data?.table?.headers ?? ['Year', 'Number of projects', 'Lead amount', 'Average lead amount', 'Weighted lead amount']).map((h) => (
                  <th key={h} className="font-medium py-2 pr-6 whitespace-nowrap">
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
                      <td key={j} className="py-2 pr-6 text-text-muted whitespace-nowrap">
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

      {(data?.charts ?? []).map((chart) => (
        <Card key={chart.title} className="!h-auto">
          <StatsBarChart chart={chart} />
        </Card>
      ))}
    </div>
  )
}
