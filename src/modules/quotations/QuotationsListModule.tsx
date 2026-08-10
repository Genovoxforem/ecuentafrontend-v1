import { useQuotationsSummary } from '../../features/quotations/quotations.queries'
import { QuotationsList } from '../../features/quotations/components/QuotationsList'

export function QuotationsListModule() {
  const { data: summary, isError } = useQuotationsSummary()

  return (
    <>
      {isError && <p className="text-sm text-danger">Could not load the quotations list.</p>}
      {!summary && !isError && <p className="text-sm text-text-muted">Loading…</p>}
      {summary && <QuotationsList summary={summary} />}
    </>
  )
}
