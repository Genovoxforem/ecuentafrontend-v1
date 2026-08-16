import { PackageCheck } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'

export function ReceptionsAreaPage() {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <PackageCheck size={20} className="text-brand" /> Receptions area
      </h2>
      <Card className="!p-0 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border text-sm font-semibold text-text!">Receptions To Validate</div>
        <div className="px-4 py-3 text-sm text-text-muted">None</div>
      </Card>
    </div>
  )
}
