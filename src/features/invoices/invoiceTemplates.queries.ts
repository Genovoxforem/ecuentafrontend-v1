import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/axios'

export interface InvoiceTemplateRow {
  id: number
  ref: string
  thirdParty: string | null
  amountExclTax: number
  vat: number
  amountInclTax: number
  isRecurring: boolean
  frequency: number
  frequencyUnit: string
  nbGenDone: number
  nbGenMax: number
  dateLastGen: string | null
  dateNextGen: string | null
  statusLabel: 'Active' | 'Suspended'
}

interface WebEnvelope<T> {
  success: boolean
  data: T
}

// GET /api/invoice-templates/ (api/invoice-templates/index.php) — real,
// reads llx_facture_rec directly. Read-only — see that endpoint's header
// comment for why there's no create action here.
export function useInvoiceTemplates() {
  return useQuery({
    queryKey: ['invoice-templates'],
    queryFn: async (): Promise<{ items: InvoiceTemplateRow[]; total: number }> => {
      const { data } = await api.get<WebEnvelope<{ items: InvoiceTemplateRow[]; total: number }>>('/invoice-templates/')
      return data.data
    },
  })
}
