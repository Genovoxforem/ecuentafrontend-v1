import { PackageCheck } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'

const COLUMNS = ['Ref.Id', 'Order Status', 'Order Date', 'Created By', 'Action']

// No purchase-order-to-reception pipeline exists on this backend (no
// /api/receptions/ — confirmed alongside the other warehouse endpoints),
// so this is honestly always empty, matching the reference app's own
// "Waiting For Reception" list here.
export function ReceptionCreatePage() {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <PackageCheck size={20} className="text-brand" /> Waiting For Reception
      </h2>
      <Card className="!p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
              {COLUMNS.map((c) => (
                <th key={c} className="font-medium px-4 py-2.5">
                  {c}
                </th>
              ))}
            </tr>
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
