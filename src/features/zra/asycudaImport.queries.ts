import { useQuery, useMutation, keepPreviousData } from '@tanstack/react-query'
import { LEGACY_SESSION_EXPIRED_PREFIX } from '../../shared/components/BackendUnavailable'

// custom/zra/zra-import_ajax.php — the real DataTables-style AJAX handler
// behind the legacy zra-import.php page (read directly, not guessed — it's
// a single json_encode() at the end of the file, no action dispatcher).
// The previous version of this file called /api/zra/asycuda-imports/, a
// route that only ever existed on the inactive ecnta10 backend as a
// server-side proxy INTO this exact same real ecuenta9 endpoint (see that
// route's own now-removed comment) — now fetched directly, same-origin,
// session-cookie authenticated (custom/zra/zra-import_ajax.php explicitly
// defines NOCSRFCHECK, so no Referer/token dance needed either). Confirmed
// live: 2839 real pending rows.
//
// Real response field names (sno/refno/supplier/seq/item/invoice/quantity/
// actions) differ from this app's own AsycudaImportRow shape (a rename
// only — every row's actual HTML content, and the window.fn* onclick
// bridge AsycudaImportList.tsx already wires up, match exactly).
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

interface RawAsycudaRow {
  sno: number
  refno: string
  supplier: string
  seq: string
  item: string
  invoice: string
  quantity: string
  actions: string
}

interface RawAsycudaResponse {
  draw: number
  recordsTotal: number
  recordsFiltered: number
  data: RawAsycudaRow[]
}

function toAsycudaImportRow(raw: RawAsycudaRow): AsycudaImportRow {
  return {
    id: raw.sno,
    seqNo: raw.sno,
    itemSeq: raw.seq,
    declHtml: raw.refno,
    supplierHtml: raw.supplier,
    itemHtml: raw.item,
    invoiceHtml: raw.invoice,
    quantityHtml: raw.quantity,
    actionsHtml: raw.actions,
  }
}

async function fetchAsycudaImports(params: { start: number; length: number; declRefNum?: string; search?: string }): Promise<RawAsycudaResponse> {
  const qs = new URLSearchParams({ draw: '1', start: String(params.start), length: String(params.length) })
  if (params.declRefNum) qs.set('dclRefNum', params.declRefNum)
  if (params.search) qs.set('search[value]', params.search)
  const res = await fetch(`/custom/zra/zra-import_ajax.php?${qs.toString()}`, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  const trimmed = (await res.text()).trim()
  if (trimmed.startsWith('<')) {
    throw new Error(`${LEGACY_SESSION_EXPIRED_PREFIX}custom/zra/zra-import_ajax.php returned a login page instead of JSON.`)
  }
  return JSON.parse(trimmed)
}

export function useAsycudaImportList(params: { page: number; perPage: number; declRefNum?: string; search?: string }) {
  return useQuery({
    queryKey: ['zra', 'asycuda-imports', params],
    queryFn: async (): Promise<{ items: AsycudaImportRow[]; total: number }> => {
      const body = await fetchAsycudaImports({
        start: (params.page - 1) * params.perPage,
        length: params.perPage,
        declRefNum: params.declRefNum,
        search: params.search,
      })
      return { items: body.data.map(toAsycudaImportRow), total: body.recordsFiltered }
    },
    placeholderData: keepPreviousData,
    staleTime: 1000 * 30,
  })
}

// Same real endpoint, length=1 — cheap enough for the header badge count,
// and keeps this in sync with whatever declRefNum filter is active without
// a second, differently-shaped route (the endpoint has no dedicated
// count-only mode of its own).
export function useAsycudaImportCount(declRefNum?: string) {
  return useQuery({
    queryKey: ['zra', 'asycuda-imports', 'count', declRefNum],
    queryFn: async (): Promise<number> => {
      const body = await fetchAsycudaImports({ start: 0, length: 1, declRefNum })
      return body.recordsFiltered
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

// POST custom/zra/zraupdateimport.php — read directly (not guessed): THIS
// SUBMITS TO THE LIVE ZRA GOVERNMENT TAX GATEWAY (zraworker->initialize(),
// endpoint '/imports/updateImportItems') — not a local-only mutation, and
// deliberately not auto-retried on failure to avoid double-submitting a
// real filing. Exact status codes/action name (approve=3, cancel=4,
// split-approve=multiupdate+3) read directly from zra-import.php's
// fnapproveasycuda/fncancelasycuda/fnapprovesplitasycuda. `itemdetails` is
// posted as a real PHP array field (itemdetails[itemNm]=...), matching
// exactly how that handler reads $itemdetails['itemNm'] etc. Real response
// is a bare {status: string} — no {success,data} envelope, unlike the old
// ecnta10-side proxy this used to call.
export type AsycudaUpdateInput =
  | { action: 'approve'; item: AsycudaUpdateItem }
  | { action: 'cancel'; item: AsycudaUpdateItem; reason: string }
  | { action: 'split-approve'; item: AsycudaUpdateItem; splitRows: AsycudaSplitRow[] }

function buildItemDetailsFields(body: URLSearchParams, item: AsycudaUpdateItem) {
  body.set('itemdetails[itemNm]', item.itemNm)
  body.set('itemdetails[itemSeq]', item.itemSeq)
  body.set('itemdetails[hsCd]', item.hsCd)
  body.set('itemdetails[taskCd]', item.taskCd)
  body.set('itemdetails[dclDe]', item.dclDe)
  body.set('itemdetails[dclRefNum]', item.dclRefNum)
  if (item.proid) body.set('itemdetails[proid]', item.proid)
}

export function useZraUpdateImport() {
  return useMutation({
    mutationFn: async (input: AsycudaUpdateInput): Promise<{ status: string }> => {
      const body = new URLSearchParams()
      if (input.action === 'approve') {
        body.set('status', '3')
        buildItemDetailsFields(body, input.item)
      } else if (input.action === 'cancel') {
        body.set('status', '4')
        body.set('reason', input.reason)
        buildItemDetailsFields(body, input.item)
      } else {
        body.set('action', 'multiupdate')
        body.set('status', '3')
        buildItemDetailsFields(body, input.item)
        input.splitRows.forEach((row, i) => {
          body.set(`tableData[${i}][seqno]`, row.seqno)
          body.set(`tableData[${i}][proid]`, row.proid)
          body.set(`tableData[${i}][tabsearch]`, row.tabsearch)
          body.set(`tableData[${i}][hsncode]`, row.hsncode)
        })
      }
      const res = await fetch('/custom/zra/zraupdateimport.php', { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const trimmed = (await res.text()).trim()
      if (trimmed.startsWith('<')) {
        throw new Error(`${LEGACY_SESSION_EXPIRED_PREFIX}custom/zra/zraupdateimport.php returned a login page instead of JSON.`)
      }
      return JSON.parse(trimmed)
    },
  })
}
