import { useInvoicesSummary } from '../../features/invoices/invoices.queries'
import { InvoicesList } from '../../features/invoices/components/InvoicesList'

// The classic list.php?search_status=3 page: the Sales Invoices list narrowed to
// Dolibarr status 3 (abandoned).
const ABANDONED = 3

export function AbandonedInvoicesModule() {
  const { data: summary, isError, error } = useInvoicesSummary()

  return (
    <>
      {isError && <p className="text-sm text-danger">Could not load the invoices list. {error instanceof Error ? error.message : ''}</p>}
      {!summary && !isError && <p className="text-sm text-text-muted">Loading…</p>}
      {summary && <InvoicesList summary={summary} statusFilter={ABANDONED} />}
    </>
  )
}
