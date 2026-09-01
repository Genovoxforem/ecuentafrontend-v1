import { Link } from 'react-router-dom'
import { Truck, Plus, Filter } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Th, TheadRow } from '../../../shared/components/table/SortableTh'
import { ROUTES } from '../../../routes'

const COLUMNS = ['Ref.', 'Ref. Customer', 'Third-Party', 'City', 'Zip Code', 'Planned Date Of Delivery', 'Tracking Number', 'Ref Delivery', 'Date Delivery Received', 'Status']

// Same no-shipment-endpoint gap as ShipmentSearchPage — this table is
// honestly always empty, reused for the List/Draft/Validated/Processed
// nav items, which are really the same real page's status filter
// (viewstatut=0/1/2) in the reference app.
export function ShipmentStatusList({ title }: { title: string }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Truck size={20} className="text-brand" /> {title}
        </h2>
        <div className="flex items-center gap-2">
          <Link to={ROUTES.shipmentList} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
            <Plus size={14} /> New Shipment
          </Link>
          <button type="button" className="p-2 rounded-lg border border-input-border text-text-muted hover:bg-surface-hover">
            <Filter size={16} />
          </button>
        </div>
      </div>

      <Card className="!p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <TheadRow>
              {COLUMNS.map((c) => (
                <Th key={c} className="whitespace-nowrap">{c}</Th>
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
