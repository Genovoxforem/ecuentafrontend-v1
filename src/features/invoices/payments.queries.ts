import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/axios'

export interface PaymentRow {
  id: number
  ref: string
  paymentReference: string | null
  customerName: string | null
  paymentDate: string
  paymentTypeLabel: string | null
  amount: number
  statusCode: number
  statusLabel: 'Validated' | 'Draft'
}

interface WebEnvelope<T> {
  success: boolean
  data: T
}

// GET /api/payments/ (api/payments/index.php) — real, reads
// llx_paiement/llx_paiement_facture. limit: 500, fetched once and
// filtered/grouped client-side (same convention as ThirdPartyList.tsx) —
// this backend has no date-range filter of its own.
export function usePayments(search = '') {
  return useQuery({
    queryKey: ['payments', search],
    queryFn: async (): Promise<{ items: PaymentRow[]; total: number }> => {
      const { data } = await api.get<WebEnvelope<{ items: PaymentRow[]; total: number }>>('/payments/', { params: { search: search || undefined, limit: 500 } })
      return data.data
    },
  })
}
