import { useQuery } from '@tanstack/react-query'
import { fapiGet } from '../../api/fapiEnvelope'

// commande/fapi/list.php answers every call with its pagination block, so a one-row page is enough to count the sales orders
// (entity isolation and the sales-rep restriction are applied by the backend, as on the Sales Orders list itself). The dashboards
// used to read this count from GET /api/dashboard/; on newecuenta (6 Nov 2026, no orders) both answered 0, so a difference between
// the two on real orders has not been checked.
export async function fetchSalesOrdersTotal(): Promise<number> {
  const d = await fapiGet<{ pagination: { total: number } }>('/commande/fapi/list.php', { limit: 1 })
  return Number(d.pagination.total) || 0
}

export function useSalesOrdersTotal() {
  return useQuery({ queryKey: ['salesOrders', 'total'], queryFn: fetchSalesOrdersTotal, staleTime: 1000 * 60 })
}
