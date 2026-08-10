import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/axios'

// GET /api/zra/asycuda-purchase/reference-data/ — real, direct SQL mirrors of
// fourn/facture/asycudapurchase.php's own dropdown sources (vendors filtered
// exactly like the real page's select_company('s.fournisseur=1 AND
// s.fk_pays != 239') call — foreign vendors only, since this screen is for
// Asycuda customs-import purchases).
export interface AsycudaVendor {
  id: number
  name: string
  tpin: string | null
  branchCode: string | null
  countryLabel: string | null
}
export interface AsycudaDeclaration {
  taskcodeGroup: string
  declarationRef: string
}
export interface AsycudaReferenceOption {
  id: number
  code: string
  label: string
}
export interface AsycudaReferenceData {
  vendors: AsycudaVendor[]
  declarations: AsycudaDeclaration[]
  bankAccounts: { id: number; ref: string; label: string }[]
  paymentTypes: AsycudaReferenceOption[]
  paymentTerms: AsycudaReferenceOption[]
  currencies: { code: string; name: string }[]
  incoterms: AsycudaReferenceOption[]
  projects: { id: number; ref: string; title: string }[]
}
export function useAsycudaPurchaseReferenceData() {
  return useQuery({
    queryKey: ['zra', 'asycuda-purchase', 'reference-data'],
    queryFn: async (): Promise<AsycudaReferenceData> => {
      const { data } = await api.get<{ success: boolean; data: AsycudaReferenceData }>('/zra/asycuda-purchase/reference-data/')
      return data.data
    },
    staleTime: 1000 * 60,
  })
}

// GET /api/zra/asycuda-purchase/declaration-products/ — real, proxies
// fourn/facture/asycudaproduct_ajax.php's own live "View Products" list for
// a given Asycuda declaration. Read-only, safe to call and retry.
export interface AsycudaDeclarationProduct {
  productId: number
  refLabel: string
  sellingPrice: number | null
  tax: string | null
}
export function useDeclarationProducts(declaration: string | undefined) {
  return useQuery({
    queryKey: ['zra', 'asycuda-purchase', 'declaration-products', declaration],
    queryFn: async (): Promise<{ products: AsycudaDeclarationProduct[]; alreadyAssigned: boolean }> => {
      const { data } = await api.get<{ success: boolean; data: { products: AsycudaDeclarationProduct[]; alreadyAssigned: boolean } }>(
        '/zra/asycuda-purchase/declaration-products/',
        { params: { declaration } },
      )
      return data.data
    },
    enabled: !!declaration,
    staleTime: 1000 * 30,
  })
}

export interface AsycudaInvoiceLine {
  id: number
  productId: number | null
  productRef: string | null
  productLabel: string | null
  qty: number
  unitPriceExclTax: number
  unitPriceInclTax: number
  vatRate: number
  discountPercent: number
  totalExclTax: number
  totalVat: number
  totalInclTax: number
}
export interface AsycudaInvoiceState {
  invoiceId: number | null
  ref: string | null
  refSupplier?: string | null
  socid?: number
  status: number | null
  fkAccount?: number | null
  modeReglementId?: number | null
  condReglementId?: number | null
  multicurrencyCode?: string | null
  totalExclTax: number
  totalVat: number
  totalInclTax: number
  lines: AsycudaInvoiceLine[]
}

// POST /api/zra/asycuda-purchase/assign/ — real, proxies
// fourn/facture/invoiceajax.php?action=addline once per product exactly
// like the real page's own assignproducttoall(). Non-idempotent: each call
// creates/extends a real draft supplier invoice. Not safe to auto-retry.
export function useAssignAsycudaProducts() {
  return useMutation({
    mutationFn: async (input: { socid: number; declaration: string; invoiceDate: string; productIds: number[] }) => {
      const { data } = await api.post<{ success: boolean; data: AsycudaInvoiceState }>('/zra/asycuda-purchase/assign/', input)
      return data.data
    },
  })
}

// GET /api/zra/asycuda-purchase/invoice/ — real, direct SQL read of the
// current draft invoice + lines. Read-only, safe to call and retry.
export function useAsycudaPurchaseInvoice(place: number | null) {
  return useQuery({
    queryKey: ['zra', 'asycuda-purchase', 'invoice', place],
    queryFn: async (): Promise<AsycudaInvoiceState> => {
      const { data } = await api.get<{ success: boolean; data: AsycudaInvoiceState }>('/zra/asycuda-purchase/invoice/', { params: { place } })
      return data.data
    },
    enabled: !!place,
    staleTime: 0,
  })
}

// POST /api/zra/asycuda-purchase/lines/delete/ — real, proxies
// invoiceajax.php?action=deleteline. Non-idempotent, not safe to auto-retry.
export function useDeleteAsycudaPurchaseLine() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { place: number; lineId: number }) => {
      const { data } = await api.post<{ success: boolean; data: AsycudaInvoiceState }>('/zra/asycuda-purchase/lines/delete/', input)
      return data.data
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['zra', 'asycuda-purchase', 'invoice', variables.place] })
    },
  })
}

// POST /api/zra/asycuda-purchase/save/ — real, proxies
// invoiceajax.php?action=draft or action=valid, exactly like the real "Save
// as Draft"/"Save as Invoice" buttons. Non-idempotent, not safe to
// auto-retry.
export interface SaveAsycudaPurchaseInput {
  place: number
  mode: 'draft' | 'valid'
  fkAccount: number
  modeReglementId: number
  condReglementId: number
  multicurrencyCode: string
  projectId?: number
  paymentNote?: string
  receivedAmount?: number
}
export function useSaveAsycudaPurchaseInvoice() {
  return useMutation({
    mutationFn: async (input: SaveAsycudaPurchaseInput) => {
      const { data } = await api.post<{ success: boolean; data: AsycudaInvoiceState & { succeeded: boolean } }>('/zra/asycuda-purchase/save/', input)
      return data.data
    },
  })
}

// POST /api/zra/asycuda-purchase/delete/ — real, proxies
// invoiceajax.php?action=delete. Deletes a real draft invoice + its lines.
// Non-idempotent, not safe to auto-retry.
export function useDeleteAsycudaPurchaseInvoice() {
  return useMutation({
    mutationFn: async (place: number) => {
      const { data } = await api.post<{ success: boolean; data: { succeeded: boolean } }>('/zra/asycuda-purchase/delete/', { place })
      return data.data
    },
  })
}
