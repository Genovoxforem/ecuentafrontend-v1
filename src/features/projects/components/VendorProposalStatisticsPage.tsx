import { useState } from 'react'
import { BarChart3, RefreshCw } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useVendorOptions } from '../../customers/customerOptions'
import { useThirdPartyFormOptions } from '../../customers/thirdPartyOptions.queries'
import { useAgendaFilterOptions } from '../../agenda/calendarApi.queries'
import { useVendorProposalStats } from '../vendorProposalStats.queries'
import { StatsBarChart } from './StatsBarChart'

const selectCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 appearance-none w-full'

export function VendorProposalStatisticsPage() {
  const [year, setYear] = useState<string | undefined>(undefined)
  const [socid, setSocid] = useState('')
  const [typentId, setTypentId] = useState('')
  const [categId, setCategId] = useState('')
  const [userid, setUserid] = useState('')
  const { data, isLoading, isError, error, refetch } = useVendorProposalStats({ year, socid, typentId, categId, userid })

  const { data: vendors } = useVendorOptions()
  const { data: formOptions } = useThirdPartyFormOptions()
  const { data: agendaFilters } = useAgendaFilterOptions()

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <BarChart3 size={20} className="text-brand" /> Vendor proposals statistics
      </h2>

      <div className="border-b border-border">
        <span className="inline-block px-1 pb-2 text-sm font-semibold text-brand border-b-2 border-brand">By Month/Year</span>
      </div>

      {isError && (
        <Card className="!h-auto !bg-danger-bg border-danger/40 text-danger-fg text-sm font-medium">{error instanceof Error ? error.message : 'Failed to load statistics.'}</Card>
      )}

      <Card className="!h-auto space-y-3">
        <p className="text-sm font-semibold text-text!">Filter</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-text-faint mb-1">Third-party</label>
            <select value={socid} onChange={(e) => setSocid(e.target.value)} className={selectCls}>
              <option value="">-- All --</option>
              {vendors?.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-faint mb-1">Third-party type</label>
            <select value={typentId} onChange={(e) => setTypentId(e.target.value)} className={selectCls}>
              <option value="">-- All --</option>
              {(formOptions?.thirdPartyTypes ?? []).map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-faint mb-1">Tag/category vendor</label>
            <select value={categId} onChange={(e) => setCategId(e.target.value)} className={selectCls}>
              <option value="">-- All --</option>
              {(formOptions?.vendorCategories ?? []).map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-faint mb-1">Created by</label>
            <select value={userid} onChange={(e) => setUserid(e.target.value)} className={selectCls}>
              <option value="">-- All --</option>
              {agendaFilters?.users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-faint mb-1">Status</label>
            <select disabled title="No confirmed status option set for this backend" className={selectCls + ' text-text-faint cursor-not-allowed'}>
              <option value="">-- All --</option>
            </select>
          </div>
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
        </div>
        <div className="flex justify-start">
          <button type="button" onClick={() => refetch()} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </Card>

      <Card className="!h-auto">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                {(data?.table?.headers ?? ['Year', 'Number of Quotations', '%', 'Total amount', '%', 'Average amount', '%']).map((h, i) => (
                  <th key={`${h}-${i}`} className="font-medium py-2 pr-6 whitespace-nowrap">
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
