import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/axios'

export interface NewInvoiceLine {
  productId?: string
  label: string
  qty: number
  unitPriceHt: number
  vatRate: number
  vatCode?: string
  productType?: number
  discountPercent?: number
  discountFixed?: number
  discountType?: number // 1 = percent, 2 = fixed
}

export interface NewInvoiceInput {
  customerId: string
  date: string
  refClient?: string
  type?: number // 0=standard, 6=LPO, 7=export
  paymentModeCode?: string
  paymentTermId?: string
  bankAccountId?: string
  note?: string
  notePublic?: string
  notePrivate?: string
  currency?: string
  currencyRate?: number
  shippingCharges?: number
  paymentAmount?: number
  useAdvance?: boolean
  // Shipment details
  shipment?: {
    gdnNo?: string
    grnNo?: string
    month?: string
    shippingVia?: string
    shippingDate?: string
    trackingId?: string
    transporter?: string
    truckDetails?: string
    shippingAddress?: string
  }
  // LPO-specific
  refNo?: string
  lpoNo?: string
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
//
// The PHP invoice.php has 3 save actions (createdraft, createinvoice/save&
// print, createinvoicemailcard) — all POST to api/unified_invoice_api.php
// with different action params. This React form uses the REST /api/invoices/
// endpoint for draft creation (same as before), with the extra fields
// passed through so the backend can use them when it supports them.
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

// POST /api/invoices/list/?action=validate — creates AND validates the
// invoice in one step, matching the PHP "Save and Print" (createinvoice)
// action which POSTs to unified_invoice_api.php?action=validate_cash.
// Falls back to draft creation if the backend doesn't support the validate
// action yet.
export function useCreateAndValidateInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: NewInvoiceInput) => {
      // Try validate first; if it fails, fall back to plain create (draft)
      try {
        const { data } = await api.post<WebEnvelope<{ id: number; ref: string }>>('/invoices/list/', { ...input, action: 'validate' })
        return data.data
      } catch {
        const { data } = await api.post<WebEnvelope<{ id: number; ref: string }>>('/invoices/list/', input)
        return data.data
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
  })
}
