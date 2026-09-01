import { useState } from 'react'
import { Truck } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Th, TheadRow } from '../../../shared/components/table/SortableTh'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { useCustomerOptions } from '../../customers/customerOptions'
import { useUsersSummary } from '../../users/users.queries'
import { useShipmentStats } from '../shipmentStats.queries'
import { BackendUnavailableInline, isBackendUnavailable } from '../../../shared/components/BackendUnavailable'

const selectCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none appearance-none'
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Real GET /api/shipments/stats/ data (see shipmentStats.queries.ts) —
// mirrors expedition/stats/index.php's own validated-shipments-only,
// grouped-by-date_valid query. Third-Party/Created By filters use real
// customer/user ids so they actually narrow the SQL, not just cosmetic.
export function StatisticsShipmentPage() {
  const { data: customers, isLoading: customersLoading } = useCustomerOptions()
  const { data: usersSummary } = useUsersSummary()
  const [thirdParty, setThirdParty] = useState('')
  const [createdBy, setCreatedBy] = useState('')
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const { data: stats, isLoading: statsLoading, error: statsError } = useShipmentStats(Number(year), thirdParty, createdBy)

  const customerOptions = (customers ?? []).map((c) => ({ value: c.id, label: c.name }))
  const userOptions = (usersSummary?.users ?? []).map((u) => ({ value: String(u.id), label: u.name }))
  const years = Array.from({ length: 3 }, (_, i) => String(new Date().getFullYear() - i))
  const byMonth = stats?.byMonth ?? Array(12).fill(0)
  const maxCount = Math.max(1, ...byMonth)

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
              <SearchableSelect value={thirdParty} onChange={setThirdParty} options={customerOptions} placeholder={customersLoading ? 'Loading…' : 'Select…'} />
            </div>
            <div>
              <label className="block text-xs text-text-faint mb-1">Created By</label>
              <SearchableSelect value={createdBy} onChange={setCreatedBy} options={userOptions} placeholder="Select a users" />
            </div>
            <div>
              <label className="block text-xs text-text-faint mb-1">Year</label>
              <select value={year} onChange={(e) => setYear(e.target.value)} className={selectCls + ' w-full'}>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <button type="button" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
              Refresh
            </button>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-brand mb-3">Number of shipments by month</h3>
            {/* api/shipments/stats/ doesn't exist on the current backend (see
                BackendUnavailable.tsx) — this is a small dashboard tile, not a whole page, so
                it gets the inline variant rather than a full Card-shaped empty state. */}
            {isBackendUnavailable(statsError) ? (
              <BackendUnavailableInline feature="Shipment Statistics" />
            ) : (
              <div className="flex items-end gap-2 h-40 border-l border-b border-border pl-2 pb-1">
                {MONTHS.map((m, i) => {
                  const count = byMonth[i] ?? 0
                  const heightPct = count === 0 ? 0 : Math.max(4, (count / maxCount) * 100)
                  return (
                    <div key={m} className="flex-1 flex flex-col items-center justify-end h-full" title={`${m}: ${count}`}>
                      <span className="text-[10px] text-text-muted mb-0.5">{count > 0 ? count : ''}</span>
                      <div className="w-full bg-brand rounded-t-sm" style={{ height: `${heightPct}%` }} />
                      <span className="text-[10px] text-text-faint mt-1">{m}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {!isBackendUnavailable(statsError) && (
          <table className="w-full text-sm mt-4">
            <thead className="sticky top-0 z-10">
              <TheadRow>
                <Th className="!px-0">Year</Th>
                <Th className="!px-0" align="right">Number Of Shipments</Th>
              </TheadRow>
            </thead>
            <tbody>
              {statsLoading ? (
                <tr>
                  <td colSpan={2} className="py-3 text-text-faint italic">
                    Loading…
                  </td>
                </tr>
              ) : !stats?.byYear.length ? (
                <tr>
                  <td colSpan={2} className="py-3 text-text-faint italic">
                    No data.
                  </td>
                </tr>
              ) : (
                stats.byYear.map((y) => (
                  <tr key={y.year} className="border-b border-border last:border-0">
                    <td className="py-2 text-brand font-medium">{y.year}</td>
                    <td className="py-2 text-right tabular-nums text-text!">{y.count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        <p className="text-xs text-text-faint mt-3">Statistics conducted on shipments only validated. Date used is date of validation of shipment (planed delivery date is not always known).</p>
      </Card>
    </div>
  )
}
