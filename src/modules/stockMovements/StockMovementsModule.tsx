import { useSearchParams } from 'react-router-dom'
import { StockMovementsView } from '../../features/stockMovements/components/StockMovementsView'

export function StockMovementsModule() {
  const [params] = useSearchParams()
  const warehouseId = params.get('id') ? Number(params.get('id')) : undefined
  const productId = params.get('idproduct') ? Number(params.get('idproduct')) : undefined
  return <StockMovementsView warehouseId={warehouseId} productId={productId} />
}
