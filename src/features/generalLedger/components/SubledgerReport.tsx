import { ExternalLink, ListTree } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'

// accountancy/bookkeeping/listbysubaccount.php — confirmed real (llx_
// accounting_bookkeeping data grouped by subledger/third-party account) but
// no JSON API. The one real JSON endpoint this module does have
// (listbyaccount_ajax_api.php, now powering the Ledger Dashboard) supports
// subledger_account filter keys in its internal query-builder, but no
// request parameter anywhere in that file actually populates them — so
// there is no reachable way to drive a real subledger-grouped view through
// it today, despite the underlying capability existing in the code.
export function SubledgerReport() {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <ListTree size={20} className="text-brand" /> Subledger
      </h2>
      <Card className="!h-auto space-y-2">
        <p className="text-sm text-text-muted">
          Real report: <code className="font-mono text-xs">accountancy/bookkeeping/listbysubaccount.php</code> — transactions grouped by subledger/third-party account. No JSON API exists for
          it, and the one real JSON endpoint this module does have (which now powers Ledger Dashboard) has no reachable parameter for subledger grouping despite supporting it internally.
        </p>
        <a
          href="/accountancy/bookkeeping/listbysubaccount.php"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-brand hover:underline"
        >
          <ExternalLink size={13} /> Open in the legacy system
        </a>
      </Card>
    </div>
  )
}
