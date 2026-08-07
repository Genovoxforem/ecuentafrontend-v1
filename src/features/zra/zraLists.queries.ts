import { useQuery, keepPreviousData } from '@tanstack/react-query'
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
