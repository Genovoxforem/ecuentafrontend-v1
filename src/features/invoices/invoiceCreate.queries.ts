import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/axios'

export interface NewInvoiceLine {
  productId?: string
  label: string
  qty: number
  unitPriceHt: number
  vatRate: number
  productType?: number
}

export interface NewInvoiceInput {
  customerId: string
  date: string
  refClient?: string
  paymentModeCode?: string
  note?: string
  lines: NewInvoiceLine[]
}

interface WebEnvelope<T> {
  success: boolean
  data: T
}

// POST /api/invoices/list/ (api/invoices/list/index.php) — real, creates a
// draft llx_facture + llx_facturedet lines with an auto-generated
// FA<yymm>-<seq> ref, matching the legacy "Create draft" action. Same
// endpoint useInvoicesSummary() reads from (see invoices.queries.ts).
export function useCreateInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: NewInvoiceInput) => {
      const { data } = await api.post<WebEnvelope<{ id: number; ref: string }>>('/invoices/list/', input)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
  })
}
