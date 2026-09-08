import { PackageCheck, Info } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'

// reception/ has no json_encode endpoint anywhere on this backend (grepped
// the whole directory) — "Receptions To Validate" is left honestly empty
// with an explanation instead of a bare, unexplained "None".
export function ReceptionsAreaPage() {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <PackageCheck size={20} className="text-brand" /> Receptions area
      </h2>
      <Card className="!p-0 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border text-sm font-semibold text-text!">Receptions To Validate</div>
        <div className="px-4 py-3 flex items-start gap-2 text-sm text-text-muted">
          <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
          None — no reception JSON API is confirmed on this backend, so this can't be populated yet.
        </div>
      </Card>
    </div>
  )
}
