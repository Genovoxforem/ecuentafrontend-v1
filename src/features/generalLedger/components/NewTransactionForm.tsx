import { ExternalLink, FilePlus } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'

// accountancy/bookkeeping/card.php?action=add — confirmed real (creates a
// llx_accounting_bookkeeping journal entry) but classic form-POST only, no
// JSON create endpoint anywhere in this module.
export function NewTransactionForm() {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <FilePlus size={20} className="text-brand" /> New Transaction
      </h2>
      <Card className="!h-auto space-y-2">
        <p className="text-sm text-text-muted">
          Real page: <code className="font-mono text-xs">accountancy/bookkeeping/card.php?action=add</code> — manual journal entry create. Classic form-POST, no JSON API.
        </p>
        <a href="/accountancy/bookkeeping/card.php?action=create" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-brand hover:underline">
          <ExternalLink size={13} /> Create in the legacy system
        </a>
      </Card>
    </div>
  )
}
