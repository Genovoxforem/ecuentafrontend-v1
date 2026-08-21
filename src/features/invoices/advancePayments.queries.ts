import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/axios'

export interface AdvancePaymentRow {
  id: number
  ref: string
  date: string
  thirdParty: string | null
  amount: number
  usedAmount: number
  remainingAmount: number
  paymentTypeLabel: string | null
  author: string | null
}

interface WebEnvelope<T> {
  success: boolean
  data: T
}

// GET /api/invoices/advance-payments/ (api/invoices/advance-payments/index.php)
// — real, reads llx_paiement_advance directly (the actual backing table for
// the legacy "Customer Advance Payments" screen — not a deposit-type
// llx_facture row, which this app has none of; see that endpoint's header
// comment).
export function useAdvancePayments() {
  return useQuery({
    queryKey: ['invoices', 'advance-payments'],
    queryFn: async (): Promise<{ items: AdvancePaymentRow[]; total: number }> => {
      const { data } = await api.get<WebEnvelope<{ items: AdvancePaymentRow[]; total: number }>>('/invoices/advance-payments/')
      return data.data
    },
  })
}
