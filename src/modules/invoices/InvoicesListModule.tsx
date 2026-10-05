import { useInvoicesSummary } from '../../features/invoices/invoices.queries'
import { InvoicesList } from '../../features/invoices/components/InvoicesList'

export function InvoicesListModule() {
  const { data: summary, isError, error } = useInvoicesSummary()

  return (
    <>
      {isError && <p className="text-sm text-danger">Could not load the invoices list. {error instanceof Error ? error.message : ''}</p>}
      {!summary && !isError && <p className="text-sm text-text-muted">Loading…</p>}
      {summary && <InvoicesList summary={summary} />}
    </>
  )
}
