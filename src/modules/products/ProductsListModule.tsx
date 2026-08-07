import { useProductsSummary } from '../../features/products/products.queries'
import { ProductsList } from '../../features/products/components/ProductsList'

export function ProductsListModule() {
  const { data: summary, isError } = useProductsSummary()

  return (
    <div>
      {isError && <p className="text-sm text-danger">Could not load the product list.</p>}
      {!summary && !isError && <p className="text-sm text-text-muted">Loading…</p>}
      {summary && <ProductsList summary={summary} />}
    </div>
  )
}
