import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/axios'

export type VendorInvoiceStatus = 'all' | 'paid' | 'unpaid' | 'manual' | 'automatic'

export interface VendorInvoiceRow {
  id: number
  ref: string
  refSupplier: string | null
  invoiceDate: string | null
  thirdPartyId: number | null
  thirdPartyName: string | null
  paymentTypeLabel: string | null
  amountHt: number
  amountVat: number
  amountTtc: number
  saleTypeCode: string | null
  registrationTypeCode: string | null
  statusCode: number
  paye: boolean
  zraStatus: string | null
}

export interface VendorInvoicesSummary {
  suppliers: number
  invoices: number
  automaticAmount: number
  manualAmount: number
}

interface VendorInvoicesPayload {
  items: VendorInvoiceRow[]
  total: number
  summary: VendorInvoicesSummary
}

interface WebEnvelope<T> {
  success: boolean
  data: T
}

// Dolibarr FactureFournisseur status: 0=Draft, 1=Validated (unpaid), 2=Closed
// (paid), 3=Abandoned — real class constants (fournisseur.facture.class.php),
// confirmed live against this DB's actual distribution.
const STATUS_LABELS: Record<number, string> = { 0: 'Draft', 1: 'Not Paid', 2: 'Paid', 3: 'Abandoned' }
export function vendorInvoiceStatusLabel(row: VendorInvoiceRow) {
  return STATUS_LABELS[row.statusCode] ?? 'Unknown'
}

// GET /api/purchase-invoices/ (api/purchase-invoices/index.php) — real,
// built for this app against llx_facture_fourn (no REST endpoint existed
// for vendor invoices before). `status` maps directly onto the legacy
// list's own fk_statut filter (see that endpoint's header comment):
// paid=fk_statut 2, unpaid=fk_statut 1, manual/automatic=sarTyCd/regTyCd
// (the "Manual Purchases"/"Automatic Purchases" toolbar buttons on the
// legacy page). Summary tiles (suppliers/invoices/automatic+manual amount)
// are always computed across all invoices regardless of `status`, matching
// how the legacy page shows the same four tiles on every tab.
export function useVendorInvoices(status: VendorInvoiceStatus, search = '', page = 1, limit = 500) {
  return useQuery({
    queryKey: ['vendor-invoices', status, search, page, limit],
    queryFn: async (): Promise<VendorInvoicesPayload> => {
      const { data } = await api.get<WebEnvelope<VendorInvoicesPayload>>('/purchase-invoices/', {
        params: { status, search: search || undefined, page, limit },
      })
      return data.data
    },
    placeholderData: (prev) => prev,
  })
}

export interface NewVendorInvoiceLine {
  productId?: string
  supplierRef?: string
  label: string
  qty: number
  unitPriceHt: number
  vatRate: number
  discPercent?: number
  productType?: number
}

export interface NewVendorInvoiceInput {
  vendorId: string
  date: string
  refSupplier?: string
  label?: string
  paymentModeCode?: string
  notePrivate?: string
  validate?: boolean
  lines?: NewVendorInvoiceLine[]
}

// POST /api/purchase-invoices/ — real, creates a llx_facture_fourn header
// (+ llx_facture_fourn_det lines when provided) with an auto-generated
// SI<yymm>-<seq> ref, matching the real observed ref pattern on this DB.
// `lines` is optional so the Detailed Purchase create-draft form (header
// only, matching the legacy card.php?action=create screen which has no
// item table yet) can share this same endpoint with the Quick Purchase
// form (header + lines in one shot, matching purchase.php).
export function useCreateVendorInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: NewVendorInvoiceInput) => {
      const { data } = await api.post<WebEnvelope<{ id: number; ref: string }>>('/purchase-invoices/', input)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-invoices'] })
    },
  })
}
