import { Link } from 'react-router-dom'
import { Truck, Info, X } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { StickyFormShell } from '../../../shared/components/layout/StickyFormShell'

// The backend has no single "save a landed cost" request to send. Its create page
// (expensereport/landedcostbilled.php) writes rows the moment a purchase invoice, a landed
// cost invoice or an expense is picked, each through its own endpoint (landedajax.php),
// and its allocation step is what fills in the amounts. That multi-step flow has not been
// reproduced or tested here, and this page used to fake it by keeping a record in the
// browser tab only — so it no longer pretends to create anything.
export function LandedCostCreateForm() {
  return (
    <StickyFormShell
      header={
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Truck size={20} className="text-brand" /> Create Landed Cost
        </h2>
      }
      footerLeft={
        <Link to={ROUTES.landedCostList} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
          <X size={14} /> Back
        </Link>
      }
      footerRight={null}
    >
      <Card className="!h-auto">
        <div className="flex items-start gap-2 text-sm text-text-muted">
          <Info size={16} className="shrink-0 mt-0.5 text-brand" />
          <div className="space-y-2">
            <p className="font-medium text-text!">Creating a landed cost isn't available in this app yet.</p>
            <p>
              The backend builds a landed cost step by step: choosing a purchase invoice, a landed cost invoice or an expense writes records immediately, and a separate allocation step sets the amounts.
              There is no single save to send, and that flow hasn't been reproduced or tested here, so this page no longer keeps a fake record in your browser.
            </p>
            <p>
              Existing landed costs are listed under{' '}
              <Link to={ROUTES.landedCostList} className="text-brand hover:underline">
                List Landed Cost
              </Link>
              .
            </p>
          </div>
        </div>
      </Card>
    </StickyFormShell>
  )
}
