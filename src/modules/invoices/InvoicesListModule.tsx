import { useInvoicesSummary } from '../../features/invoices/invoices.queries'
import { InvoicesList } from '../../features/invoices/components/InvoicesList'

export function InvoicesListModule() {
  const { data: summary, isError } = useInvoicesSummary()

  return (
    <>
      {isError && <p className="text-sm text-danger">Could not load the invoices list.</p>}
      {!summary && !isError && <p className="text-sm text-text-muted">Loading…</p>}
      {summary && <InvoicesList summary={summary} />}
    </>
  )
}
