import { useServicesSummary } from '../../features/products/products.queries'
import { ServicesList } from '../../features/products/components/ServicesList'

export function ServicesListModule() {
  const { data: summary, isError } = useServicesSummary()

  return (
    <div>
      {isError && <p className="text-sm text-danger">Could not load the service list.</p>}
      {!summary && !isError && <p className="text-sm text-text-muted">Loading…</p>}
      {summary && <ServicesList summary={summary} />}
    </div>
  )
}
