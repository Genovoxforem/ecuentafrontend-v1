import { Navigate, useSearchParams } from 'react-router-dom'
import { ROUTES } from '../../routes'
import { StockMovementsView } from '../../features/stockMovements/components/StockMovementsView'

// This card is the movements of one product (?idproduct=) or one warehouse (?id=), reached from their pages. Without either, the
// classic movement list shows every movement, which is the full list page (checked 5 Nov 2026: the bare route used to show only a heading).
export function StockMovementsModule() {
  const [params] = useSearchParams()
  const warehouseId = params.get('id') ? Number(params.get('id')) : undefined
  const productId = params.get('idproduct') ? Number(params.get('idproduct')) : undefined
  if (!warehouseId && !productId) return <Navigate to={ROUTES.stockMovementsList} replace />
  return <StockMovementsView warehouseId={warehouseId} productId={productId} />
}
