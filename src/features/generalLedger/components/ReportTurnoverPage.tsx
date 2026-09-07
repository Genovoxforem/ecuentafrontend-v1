import { TrendingUp, Info } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'

// compta/stats/index.php — turnover statistics, server-rendered PNG charts
// (same DolGraph/viewimage.php pattern as Statistics-Salaries), no JSON API.
export function ReportTurnoverPage() {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <TrendingUp size={20} className="text-brand" /> Report Turnover
      </h2>
      <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
        <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
        <p className="text-xs text-info-fg">
          Backend page: <code className="font-mono">compta/stats/index.php</code> — renders server-side PNG turnover charts, not a JSON API, so no
          interactive chart is reproduced here.
        </p>
      </Card>
    </div>
  )
}
