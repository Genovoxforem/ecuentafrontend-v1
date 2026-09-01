import { useState } from 'react'
import { Truck } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Th, TheadRow } from '../../../shared/components/table/SortableTh'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { useCustomersSummary } from '../../customers/customers.queries'
import { useUsersSummary } from '../../users/users.queries'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'

const COLUMNS = ['Ref.Id', 'Customer Name', 'Order Status', 'Order Price', 'Order Date', 'Action']

// No shipment endpoint exists on this backend (no /api/shipments/,
// /api/expeditions/ — confirmed) — the search filters below use real data
// (customers, users), but there's no shipment/sales-order-to-shipment
// pipeline to search over, so results are honestly always empty.
export function ShipmentSearchPage() {
  const { data: customersSummary } = useCustomersSummary()
  const { data: usersSummary } = useUsersSummary()
  const [tab, setTab] = useState<'pending' | 'created'>('pending')
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date()
    const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const end = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, '0')}`
    return `${start} - ${end}`
  })
  const [customer, setCustomer] = useState('')
  const [createdBy, setCreatedBy] = useState('')

  const customerOptions = (customersSummary?.customers ?? []).map((c) => ({ value: c.name, label: c.name }))
  const userOptions = (usersSummary?.users ?? []).map((u) => ({ value: String(u.id), label: u.name }))

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Truck size={20} className="text-brand" /> Shipment
      </h2>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setTab('pending')}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium ${tab === 'pending' ? 'bg-brand text-white' : 'border border-input-border text-text-muted hover:bg-surface-hover'}`}
        >
          Yet To Create Shipment
        </button>
        <button
          type="button"
          onClick={() => setTab('created')}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium ${tab === 'created' ? 'bg-brand text-white' : 'border border-input-border text-text-muted hover:bg-surface-hover'}`}
        >
          Shipment Created List
        </button>
      </div>

      <Card className="!h-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs text-text-faint mb-1">Order Created On:</label>
            <input value={dateRange} onChange={(e) => setDateRange(e.target.value)} className={inputCls + ' w-full'} />
          </div>
          <div>
            <label className="block text-xs text-text-faint mb-1">Customer Details</label>
            <SearchableSelect value={customer} onChange={setCustomer} options={customerOptions} placeholder="Select…" />
          </div>
          <div>
            <label className="block text-xs text-text-faint mb-1">Created By</label>
            <SearchableSelect value={createdBy} onChange={setCreatedBy} options={userOptions} placeholder="Select a users" />
          </div>
        </div>
        <button type="button" className="mt-3 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          Search
        </button>
      </Card>

      <Card className="!p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <TheadRow>
              {COLUMNS.map((c) => (
                <Th key={c}>{c}</Th>
              ))}
            </TheadRow>
          </thead>
          <tbody>
            <tr>
              <td colSpan={COLUMNS.length} className="px-4 py-4 text-text-faint italic">
                No Data Available In Table
              </td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  )
}
