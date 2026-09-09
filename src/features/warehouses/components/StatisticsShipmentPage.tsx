import { useState } from 'react'
import { Truck } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { useCustomerOptions } from '../../customers/customerOptions'
import { useUsersSummary } from '../../users/users.queries'
import { useShipmentStats } from '../shipmentStats.queries'

const selectCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none appearance-none'
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const SERIES_COLORS = ['bg-slate-400', 'bg-brand']

// Real data from expedition/stats/index.php's own embedded Chart.js config
// (see shipmentStats.queries.ts's header comment for exactly how/why —
// there's no JSON endpoint, but the chart data is inline in the page's own
// script, not guessed). Third-Party/Created By/Year use real ids/values so
// they actually narrow the same query the reference page runs, not just
// cosmetic — applied only on "Refresh", matching the reference page's own
// full-reload-on-filter behavior instead of firing a request per keystroke.
export function StatisticsShipmentPage() {
  const { data: customers, isLoading: customersLoading } = useCustomerOptions()
  const { data: usersSummary } = useUsersSummary()
  const currentYear = new Date().getFullYear()

  const [thirdPartyDraft, setThirdPartyDraft] = useState('')
  const [createdByDraft, setCreatedByDraft] = useState('')
  const [yearDraft, setYearDraft] = useState(String(currentYear))
  const [applied, setApplied] = useState({ thirdParty: '', createdBy: '', year: currentYear })

  const { data: stats, isLoading: statsLoading, isError, error } = useShipmentStats(applied.year, applied.thirdParty, applied.createdBy)

  const customerOptions = (customers ?? []).map((c) => ({ value: String(c.id), label: c.name }))
  const userOptions = (usersSummary?.users ?? []).map((u) => ({ value: String(u.id), label: u.name }))
  const years = Array.from({ length: 3 }, (_, i) => String(currentYear - i))
  const datasets = stats?.datasets ?? []
  const maxCount = Math.max(1, ...datasets.flatMap((d) => d.data))

  function handleRefresh() {
    setApplied({ thirdParty: thirdPartyDraft, createdBy: createdByDraft, year: Number(yearDraft) })
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Truck size={20} className="text-brand" /> Statistics for shipments
      </h2>

      <div className="inline-block rounded-md bg-brand/10 text-brand text-sm font-semibold px-4 py-2">By month/year</div>

      <Card className="!h-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-6">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-text!">Filter</h3>
            <div>
              <label className="block text-xs text-text-faint mb-1">Third-Party</label>
              <SearchableSelect value={thirdPartyDraft} onChange={setThirdPartyDraft} options={customerOptions} placeholder={customersLoading ? 'Loading…' : 'Select…'} />
            </div>
            <div>
              <label className="block text-xs text-text-faint mb-1">Created By</label>
              <SearchableSelect value={createdByDraft} onChange={setCreatedByDraft} options={userOptions} placeholder="Select a users" />
            </div>
            <div>
              <label className="block text-xs text-text-faint mb-1">Year</label>
              <select value={yearDraft} onChange={(e) => setYearDraft(e.target.value)} className={selectCls + ' w-full'}>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <button type="button" onClick={handleRefresh} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
              Refresh
            </button>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-brand mb-3">Number of shipments by month</h3>
            {isError ? (
              <p className="text-xs text-danger py-6 text-center">{error instanceof Error ? error.message : 'Failed to load shipment statistics.'}</p>
            ) : statsLoading ? (
              <p className="text-xs text-text-faint py-6 text-center">Loading…</p>
            ) : (
              <>
                <div className="flex items-center gap-4 mb-2">
                  {datasets.map((d, i) => (
                    <span key={d.year} className="flex items-center gap-1.5 text-xs text-text-muted">
                      <span className={`inline-block w-2.5 h-2.5 rounded-sm ${SERIES_COLORS[i % SERIES_COLORS.length]}`} />
                      {d.year}
                    </span>
                  ))}
                </div>
                <div className="flex items-end gap-2 h-40 border-l border-b border-border pl-2 pb-1">
                  {MONTHS.map((m, monthIdx) => (
                    <div key={m} className="flex-1 flex flex-col items-center justify-end h-full">
                      <div className="flex items-end gap-0.5 w-full h-full justify-center">
                        {datasets.map((d, i) => {
                          const count = d.data[monthIdx] ?? 0
                          const heightPct = count === 0 ? 0 : Math.max(4, (count / maxCount) * 100)
                          return (
                            <div
                              key={d.year}
                              title={`${d.year} ${m}: ${count}`}
                              className={`flex-1 max-w-[10px] rounded-t-sm ${SERIES_COLORS[i % SERIES_COLORS.length]}`}
                              style={{ height: `${heightPct}%` }}
                            />
                          )
                        })}
                      </div>
                      <span className="text-[10px] text-text-faint mt-1">{m}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <p className="text-xs text-text-faint mt-3">Statistics conducted on shipments only validated. Date used is date of validation of shipment (planed delivery date is not always known).</p>
      </Card>
    </div>
  )
}
