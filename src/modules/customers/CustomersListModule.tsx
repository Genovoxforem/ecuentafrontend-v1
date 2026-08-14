import { useCustomersSummary } from '../../features/customers/customers.queries'
import { CustomersList } from '../../features/customers/components/CustomersList'

export function CustomersListModule() {
  const { data: summary, isError } = useCustomersSummary()

  return (
    <>
      {isError && <p className="text-sm text-danger">Could not load the customer list.</p>}
      {!summary && !isError && <p className="text-sm text-text-muted">Loading…</p>}
      {summary && <CustomersList summary={summary} />}
    </>
  )
}
