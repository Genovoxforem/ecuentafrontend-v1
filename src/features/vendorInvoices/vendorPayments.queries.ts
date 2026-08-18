import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/axios'

export interface PurchasePaymentRow {
  id: number
  ref: string
  paymentReference: string | null
  thirdPartyName: string | null
  paymentDate: string
  paymentTypeLabel: string | null
  accountLabel: string | null
  amount: number
  statusCode: number
  statusLabel: 'Validated' | 'Draft'
}

interface WebEnvelope<T> {
  success: boolean
  data: T
}

// GET /api/purchase-payments/ (api/purchase-payments/index.php) — real,
// mirrors api/payments/index.php (see payments.queries.ts) against
// llx_paiementfourn/llx_paiementfourn_facturefourn. limit: 500, fetched
// once and filtered/grouped client-side (same convention as
// ThirdPartyList.tsx and the customer-side payments hook).
export function usePurchasePayments(search = '') {
  return useQuery({
    queryKey: ['purchase-payments', search],
    queryFn: async (): Promise<{ items: PurchasePaymentRow[]; total: number }> => {
      const { data } = await api.get<WebEnvelope<{ items: PurchasePaymentRow[]; total: number }>>('/purchase-payments/', { params: { search: search || undefined, limit: 500 } })
      return data.data
    },
  })
}
