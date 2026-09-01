import { RotateCcw } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Th, TheadRow } from '../../../shared/components/table/SortableTh'

const COLUMNS = ['Sl.No', 'Ref.Id', 'Order Status', 'Created Date', 'Action']

export function CreditNoteOrderListPage() {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <RotateCcw size={20} className="text-brand" /> Return List
      </h2>
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
