import { LineChart, Info } from 'lucide-react'
import { Card } from '../../../../shared/components/dashboard/DashboardKit'

// salaries/stats/index.php — renders 2 server-side PNG charts (DolGraph via
// viewimage.php), not a chart.js/JSON API — no data to reproduce as an
// interactive chart here.
export function SalaryStatisticsPage() {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <LineChart size={20} className="text-brand" /> Statistics - Salaries
      </h2>
      <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
        <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
        <p className="text-xs text-info-fg">
          Backend page: <code className="font-mono">salaries/stats/index.php</code> — renders server-side PNG chart images (count/amount by month), not a
          JSON API, so no interactive chart is reproduced here.
        </p>
      </Card>
    </div>
  )
}
