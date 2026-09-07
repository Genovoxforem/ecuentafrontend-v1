import { HeartHandshake, Info } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'

// don/index.php — a getting-started/links dashboard for donations (List and
// New Donation live elsewhere in this module), no table of its own, no JSON.
export function DonationsAreaPage() {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <HeartHandshake size={20} className="text-brand" /> Donations Area
      </h2>
      <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
        <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
        <p className="text-xs text-info-fg">
          Backend page: <code className="font-mono">don/index.php</code> — a links dashboard into the donations list and create form, no JSON API of its
          own. Use List / New Donation in the sidebar for the real pages it links to.
        </p>
      </Card>
    </div>
  )
}
