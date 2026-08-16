import { useState } from 'react'
import { PackageCheck } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { useCustomersSummary } from '../../customers/customers.queries'
import { useUsersSummary } from '../../users/users.queries'

const selectCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none appearance-none'
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Same "By month/year" statistics template the reference app reuses across
// its expedition/reception modules — no reception-stats screenshot was
// captured, but this mirrors Statistics Shipment's real layout (confirmed
// against a screenshot) rather than inventing a different shape.
export function ReceptionStatisticsPage() {
  const { data: customersSummary } = useCustomersSummary()
  const { data: usersSummary } = useUsersSummary()
  const [thirdParty, setThirdParty] = useState('')
  const [createdBy, setCreatedBy] = useState('')
  const [year, setYear] = useState(String(new Date().getFullYear()))

  const customerOptions = (customersSummary?.customers ?? []).map((c) => ({ value: c.name, label: c.name }))
  const userOptions = (usersSummary?.users ?? []).map((u) => ({ value: String(u.id), label: u.name }))
  const years = Array.from({ length: 3 }, (_, i) => String(new Date().getFullYear() - i))

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <PackageCheck size={20} className="text-brand" /> Statistics for receptions
      </h2>

      <div className="inline-block rounded-md bg-brand/10 text-brand text-sm font-semibold px-4 py-2">By month/year</div>

      <Card className="!h-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-6">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-text!">Filter</h3>
            <div>
              <label className="block text-xs text-text-faint mb-1">Third-Party</label>
              <SearchableSelect value={thirdParty} onChange={setThirdParty} options={customerOptions} placeholder="Select…" />
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
            <h3 className="text-sm font-semibold text-brand mb-3">Number of receptions by month</h3>
            <div className="flex items-end gap-2 h-40 border-l border-b border-border pl-2 pb-1">
              {MONTHS.map((m) => (
                <div key={m} className="flex-1 flex flex-col items-center justify-end h-full">
                  <div className="w-full bg-surface-alt border-t border-border" style={{ height: '2px' }} />
                  <span className="text-[10px] text-text-faint mt-1">{m}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <table className="w-full text-sm mt-4">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
              <th className="font-medium py-2">Year</th>
              <th className="font-medium py-2 text-right">Number Of Receptions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={2} className="py-3 text-text-faint italic">
                No data.
              </td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  )
}
