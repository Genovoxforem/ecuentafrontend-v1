import { Info } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'

// A Reports Center entry whose data has no JSON endpoint yet. It used to open as a blank page with an empty note; this says what is missing
// and which classic page the report is, instead of leaving the screen empty.
export function ReportNotAvailable({ title, phpPath, note }: { title: string; phpPath: string; note?: string }) {
  return (
    <Card className="!h-auto gap-2" >
      <div className="flex items-start gap-3">
        <Info size={18} className="mt-0.5 shrink-0 text-info-fg" />
        <div className="space-y-1 text-sm">
          <p className="font-semibold text-text!">{title}</p>
          <p className="text-text-muted">
            This report is not available here yet: it has no JSON API to read its data from. The classic report is <code className="rounded bg-surface-hover px-1">{phpPath}</code>.
          </p>
          {note && <p className="text-text-muted">{note}</p>}
        </div>
      </div>
    </Card>
  )
}
