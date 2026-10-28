import { PiggyBank } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'

// llx_menu's "Budget" top-level icon (mainmenu='budget') points to
// /budget/listbudget.php, and no budget/ directory exists on this backend's
// filesystem — a dead link even in the legacy PHP itself, so there's no
// page to redesign against or link out to.
export function BudgetPlaceholder() {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <PiggyBank size={20} className="text-brand" /> Budget
      </h2>
      <Card className="!h-auto space-y-2">
        <p className="text-sm text-text-muted">
          The real menu entry for this module points to <code className="font-mono text-xs">/budget/listbudget.php</code> — but no <code className="font-mono text-xs">budget/</code>{' '}
          directory exists anywhere on this backend. This isn't a missing-API situation like most other modules; the legacy page itself was never built, so there's nothing to redesign
          against and no real link to route to.
        </p>
      </Card>
    </div>
  )
}
