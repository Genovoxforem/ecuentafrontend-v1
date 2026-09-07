import { LayoutDashboard, Info } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'

// accountancy/index.php — a getting-started wizard (links to Setup/Binding/
// Bookkeeping) plus a configurable Dolibarr "boxes" widget area. No table,
// no meaningful data of its own to reproduce — real value is in the pages
// it links to, which this module builds directly (Setup, Ledger, Journals,
// Binding, etc.) rather than through this landing page.
export function AccountingAreaPage() {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <LayoutDashboard size={20} className="text-brand" /> Accounting Area
      </h2>
      <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
        <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
        <p className="text-xs text-info-fg">
          Backend page: <code className="font-mono">accountancy/index.php</code> — a getting-started wizard linking into Setup, Binding, and Bookkeeping,
          plus a configurable widget area. Use the sidebar's own Setup, Ledger, Journals, and Binding entries — each is built directly elsewhere in this
          module.
        </p>
      </Card>
    </div>
  )
}
