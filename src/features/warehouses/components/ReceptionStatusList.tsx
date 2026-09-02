import { PackageCheck } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Th, TheadRow } from '../../../shared/components/table/SortableTh'

const COLUMNS = ['Ref.', 'Ref. Vendor', 'Third-Party', 'City', 'Zip Code', 'Planned Date Of Delivery', 'Status', 'Billed']

export function ReceptionStatusList() {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <PackageCheck size={20} className="text-brand" /> List Of Receptions
      </h2>
      <Card className="!p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
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
