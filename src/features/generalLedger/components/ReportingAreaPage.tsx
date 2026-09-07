import { LayoutDashboard, Info } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'

// compta/resultat/index.php — a getting-started/links dashboard for the
// income/outcome reports (By Predefined/Personalized Groups live elsewhere
// in this module), no table of its own, no JSON.
export function ReportingAreaPage() {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <LayoutDashboard size={20} className="text-brand" /> Reporting
      </h2>
      <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
        <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
        <p className="text-xs text-info-fg">
          Backend page: <code className="font-mono">compta/resultat/index.php</code> — a links dashboard into the income/outcome reports, no JSON API of its
          own. Use By Predefined Groups / By Personalized Groups in the sidebar for the real reports it links to.
        </p>
      </Card>
    </div>
  )
}
