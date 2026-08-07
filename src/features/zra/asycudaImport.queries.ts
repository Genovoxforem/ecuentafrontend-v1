import { useQuery, useMutation, keepPreviousData } from '@tanstack/react-query'
import { api } from '../../api/axios'

// GET /api/zra/asycuda-imports/ — real endpoint on the ecnta10 backend. It
// proxies the legacy ecuenta9 install's custom/zra/zra-import_ajax.php via a
// server-side session login (api/_legacy_zra_proxy.php), reusing that
// script's exact query + exact/similar product-matching logic rather than
// duplicating it. Most fields come back as pre-rendered HTML fragments (with
// Bootstrap modal/offcanvas subtrees stripped) straight from the legacy
// renderer — actionsHtml's buttons call global window.fn* functions
// (fnapproveasycuda/fnaddnewproducts/fnapprovesplitasycuda/fnacancelasy),
// which AsycudaImportList.tsx defines to bridge into this app's own UI.
export interface AsycudaImportRow {
  id: number
  seqNo: number
  itemSeq: string | number
  declHtml: string
  supplierHtml: string
  itemHtml: string
  invoiceHtml: string
  quantityHtml: string
  actionsHtml: string
}

interface AsycudaImportResponse {
  success: boolean
  data: { items: AsycudaImportRow[]; total: number }
}

export function useAsycudaImportList(params: { page: number; perPage: number; declRefNum?: string; search?: string }) {
  return useQuery({
    queryKey: ['zra', 'asycuda-imports', params],
    queryFn: async (): Promise<{ items: AsycudaImportRow[]; total: number }> => {
      const { data } = await api.get<AsycudaImportResponse>('/zra/asycuda-imports/', {
        params: { page: params.page, limit: params.perPage, dclRefNum: params.declRefNum || undefined, search: params.search || undefined },
      })
      return data.data
    },
    placeholderData: keepPreviousData,
    staleTime: 1000 * 30,
  })
}

// GET /api/zra/asycuda-imports/count/ — real, lightweight unfiltered pending
// count (for the header badge), separate from the paginated/searched list.
export function useAsycudaImportCount(declRefNum?: string) {
  return useQuery({
    queryKey: ['zra', 'asycuda-imports', 'count', declRefNum],
    queryFn: async (): Promise<number> => {
      const { data } = await api.get<{ success: boolean; data: { total: number } }>('/zra/asycuda-imports/count/', {
        params: { dclRefNum: declRefNum || undefined },
      })
      return data.data.total
    },
    staleTime: 1000 * 30,
  })
}

// The item shape passed to fnapproveasycuda/fnacancelasy by the legacy
// row HTML's onclick attributes (see zra-import_ajax.php's $btnData), and
// the same shape zraupdateimport.php's single-item path expects back.
export interface AsycudaUpdateItem {
  proid?: string
  itemNm: string
  itemSeq: string
  hsCd: string
  taskCd: string
  dclDe: string
  dclRefNum: string
}

export interface AsycudaSplitRow {
  proid: string
  seqno: string
  tabsearch: string
  hsncode: string
}

// POST /api/zra/asycuda-imports/update/ — real, proxies the legacy
// zraupdateimport.php via the session-login proxy. THIS SUBMITS TO THE LIVE
// ZRA GOVERNMENT TAX GATEWAY (zraworker->initialize()) — not a local-only
// mutation, and the endpoint deliberately does not auto-retry on failure to
// avoid double-submitting a real filing. Exact status codes/action name
// (approve=3, cancel=4, split-approve=multiupdate+3) read directly from
// zra-import.php's fnapproveasycuda/fncancelasycuda/fnapprovesplitasycuda.
export type AsycudaUpdateInput =
  | { action: 'approve'; item: AsycudaUpdateItem }
  | { action: 'cancel'; item: AsycudaUpdateItem; reason: string }
  | { action: 'split-approve'; item: AsycudaUpdateItem; splitRows: AsycudaSplitRow[] }

export function useZraUpdateImport() {
  return useMutation({
    mutationFn: async (input: AsycudaUpdateInput) => {
      const { data } = await api.post<{ success: boolean; data: { status: string } }>('/zra/asycuda-imports/update/', input)
      return data.data
    },
  })
}
