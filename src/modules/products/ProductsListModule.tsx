import { useAllProductsRich, useProductsSummary, useZraEnabled } from '../../features/products/products.queries'
import { useProductFormOptions } from '../../features/products/productFormOptions.queries'
import { ProductsList } from '../../features/products/components/ProductsList'

export function ProductsListModule() {
  const { data: summary, isError } = useProductsSummary()
  // The list needs these too, and ProductsList only mounts once the summary has arrived. Asking for them here (same query
  // keys, so the list reads the cached answers) sends the calls together instead of one after the other.
  const { data: richRows } = useAllProductsRich(0)
  useProductFormOptions()
  useZraEnabled(summary?.products[0]?.id ?? richRows?.[0]?.id)

  return (
    <>
      {isError && <p className="text-sm text-danger">Could not load the product list.</p>}
      {!summary && !isError && <p className="text-sm text-text-muted">Loading…</p>}
      {summary && <ProductsList summary={summary} />}
    </>
  )
}
