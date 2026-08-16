import { PackageCheck } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'

const COLUMNS = ['Ref.', 'Ref. Vendor', 'Third-Party', 'City', 'Zip Code', 'Planned Date Of Delivery', 'Status', 'Billed']

export function ReceptionStatusList() {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <PackageCheck size={20} className="text-brand" /> List Of Receptions
      </h2>
      <Card className="!p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
              {COLUMNS.map((c) => (
                <th key={c} className="font-medium px-4 py-2.5 whitespace-nowrap">
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
