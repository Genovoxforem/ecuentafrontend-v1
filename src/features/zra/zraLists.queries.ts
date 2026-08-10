import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { api } from '../../api/axios'

interface ListParams {
  page: number
  perPage: number
  search?: string
}

interface ListResponse<T> {
  success: boolean
  data: { items: T[]; total: number }
}

function useZraList<T>(key: string, path: string, params: ListParams) {
  return useQuery({
    queryKey: ['zra', key, params],
    queryFn: async (): Promise<{ items: T[]; total: number }> => {
      const { data } = await api.get<ListResponse<T>>(path, {
        params: { page: params.page, limit: params.perPage, search: params.search || undefined },
      })
      return data.data
    },
    placeholderData: keepPreviousData,
    staleTime: 1000 * 30,
  })
}

// GET /api/zra/purchases/ — real, on the ecnta10 backend. Mirrors
// custom/zra/getpurchases_ajax.php against llx_zrapurchases
// (purchasestatus='0', hardcoded — only "not yet actioned" rows).
export interface AutomaticPurchaseRow {
  id: number
  invoiceNo: string
  saleDate: string
  itemCount: number
  supplierName: string
  supplierTpin: string
  supplierBranch: string
  receiptTypeCode: string
  paymentTypeCode: string
  confirmationDate: string | null
  remark: string | null
  totalAmount: number
  taxableAmount: number
  taxAmount: number
}
export function useAutomaticPurchaseList(params: ListParams) {
  return useZraList<AutomaticPurchaseRow>('purchases', '/zra/purchases/', params)
}

// GET /api/zra/customers/unuploaded/ — real, on the ecnta10 backend. Mirrors
// societe/unuploadedcustomer.php + customer_ajax_list.php with
// zrastatus=unupload, against llx_societe (entity 0 or current).
export interface UnuploadedCustomerRow {
  id: number
  name: string
  tpin: string
  phone: string
  role: 'Prospect' | 'Customer' | 'Supplier' | 'Customer & Supplier'
  countryLabel: string
  typeLabel: string
  createdAt: string
  creatorName: string
  zraSucceeded: boolean
  zraStatusMessage: string
}
export function useUnuploadedCustomersList(params: ListParams) {
  return useZraList<UnuploadedCustomerRow>('unuploaded-customers', '/zra/customers/unuploaded/', params)
}

// POST /api/zra/customers/upload/ — real, proxies societe/ajax_zracustomer.php's
// own type=zraupload action, which submits each selected llx_societe row to
// the ZRA gateway's live /branches/saveBrancheCustomers endpoint (a real,
// non-idempotent filing, not a local-only update). Not safe to auto-retry.
export function useUploadCustomersToZra() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (ids: number[]) => {
      const { data } = await api.post<{ success: boolean; data: { succeeded: boolean; raw: unknown } }>('/zra/customers/upload/', { ids })
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zra', 'unuploaded-customers'] })
    },
  })
}

// GET /api/zra/invoices/pending-sales/ — real, direct SQL matching
// compta/facture/invoice_ajax_list.php's own query (invtype=pending: same
// WHERE zra_upload_error != '000' OR IS NULL filter) against llx_facture.
export interface PendingSalesInvoiceRow {
  id: number
  ref: string
  invoiceDate: string
  dueDate: string | null
  thirdParty: string
  city: string | null
  paymentType: string | null
  paymentTerms: string | null
  amountExclTax: number
  vat: number
  amountInclTax: number
  author: string
  status: string
  zraSucceeded: boolean
  zraStatusMessage: string
}
export function usePendingSalesList(params: ListParams) {
  return useZraList<PendingSalesInvoiceRow>('pending-sales', '/zra/invoices/pending-sales/', params)
}

// GET /api/zra/invoices/pending-purchases/ — real, direct SQL matching
// fourn/facture/facture_ajax_list.php's own query (invtype=pending: same
// WHERE zra_upload_error != '000' OR IS NULL filter) against llx_facture_fourn.
export interface PendingPurchaseInvoiceRow {
  id: number
  ref: string
  refVendor: string | null
  invoiceDate: string
  dueDate: string | null
  thirdParty: string
  thirdPartyAlias: string | null
  paymentType: string | null
  amountExclTax: number
  vat: number
  amountInclTax: number
  status: string
  zraSucceeded: boolean
  zraStatusMessage: string
}
export function usePendingPurchasesList(params: ListParams) {
  return useZraList<PendingPurchaseInvoiceRow>('pending-purchases', '/zra/invoices/pending-purchases/', params)
}

// GET /api/zra/stock-movements/unuploaded/ — real, direct SQL matching
// product/stock/movement_listunuploaded.php's own query (m.zrastatus IS
// NULL, p.fk_product_type = 0) against llx_stock_mouvement.
export interface UnuploadedStockMovementRow {
  id: number
  date: string
  productRef: string
  productLabel: string
  batch: string | null
  warehouseRef: string | null
  authorName: string
  inventoryCode: string
  movementLabel: string
  movementType: string
  qty: number
  zraStatusMessage: string | null
}
export function useUnuploadedStockMovements(params: ListParams) {
  return useZraList<UnuploadedStockMovementRow>('unuploaded-stock-movements', '/zra/stock-movements/unuploaded/', params)
}

// POST /api/zra/stock-movements/upload/ — real, proxies
// product/stock/zraallupdatestock.php's own type=zrastockupload action,
// which submits each selected llx_stock_mouvement row to the ZRA gateway's
// live /stock/saveStockItems + /stockMaster/saveStockMaster endpoints (a
// real, non-idempotent filing, not a local-only update). Not safe to
// auto-retry.
export function useUploadStockMovementsToZra() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (ids: number[]) => {
      const { data } = await api.post<{ success: boolean; data: { succeeded: boolean; statusMessage: string | null; raw: unknown } }>(
        '/zra/stock-movements/upload/',
        { ids },
      )
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zra', 'unuploaded-stock-movements'] })
    },
  })
}
