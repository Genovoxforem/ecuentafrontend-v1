import { useQuery } from '@tanstack/react-query'
import { fapiGet } from '../../api/fapiEnvelope'
import { PO_BASE, type PurchaseOrderFormOptions } from '../purchaseOrders/purchaseOrderFapi'

// fourn/commande/fapi/form_options.php (no supplier): the option lists of the purchase forms (payment modes and terms,
// warehouses, bank accounts). It is the same query, key and request as usePurchaseOrderFormOptions(), so every hook on a
// page that needs one of these lists shares a single request.
export function usePurchaseFormOptions<T>(select: (options: PurchaseOrderFormOptions) => T) {
  return useQuery({
    queryKey: ['purchaseOrders', 'formOptions', ''],
    queryFn: () => fapiGet<PurchaseOrderFormOptions>(`${PO_BASE}/form_options.php`),
    staleTime: 1000 * 60 * 5,
    retry: false,
    select,
  })
}
