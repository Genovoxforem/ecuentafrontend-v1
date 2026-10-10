import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { SalesInvoiceData } from './salesInvoiceApi'

// compta/sales/api/invoice.php — see salesInvoiceApi.ts header comment for
// why this replaces the compta/facture/card.php HTML-scraping approach for
// this page's main tab. Every mutation below is read verbatim from the real
// page's own compta/sales/js/invoice.js (functions submitAddLine/
// submitEditLine/deleteLine/action/submitValidate) — same generic action=X
// POST to this one endpoint, {success, error?} response, confirmed live.
const SALES_BASE = '/compta/sales'
const API = `${SALES_BASE}/api/invoice.php`

async function postAction<T = { success: boolean; error?: string; [k: string]: unknown }>(fd: FormData): Promise<T> {
  const res = await fetch(API, { method: 'POST', body: fd, credentials: 'same-origin' })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  const json = (await res.json()) as T & { success: boolean; error?: string }
  if (!json.success) throw new Error(json.error || 'The legacy backend rejected this request.')
  return json
}

export function useSalesInvoice(facid: string | undefined) {
  return useQuery<SalesInvoiceData>({
    queryKey: ['salesInvoice', facid],
    queryFn: async () => {
      const res = await fetch(`${API}?facid=${facid}`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const json = (await res.json()) as SalesInvoiceData & { error?: string }
      if (!json.success) throw new Error(json.error || 'Could not load this invoice.')
      return json
    },
    enabled: !!facid,
  })
}

export interface SalesLineInput {
  productId: string
  desc: string
  qty: number
  priceHt: number
  vatRateStr: string // e.g. "16 (A)" or plain "0"
  discountPercent?: number
  discountType?: '1' | '2' // 1=percent, 2=fixed
  costPrice?: number
}

export function useAddSalesInvoiceLine(facid: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: SalesLineInput) => {
      const fd = new FormData()
      fd.set('action', 'addline')
      fd.set('facid', facid ?? '')
      fd.set('product_id', input.productId)
      fd.set('desc', input.desc)
      fd.set('qty', String(input.qty))
      fd.set('pu_ht', String(input.priceHt))
      fd.set('tva_tx', input.vatRateStr)
      fd.set('remise_percent', String(input.discountPercent ?? 0))
      fd.set('remise_type', input.discountType ?? '1')
      if (input.costPrice) fd.set('pa_ht', String(input.costPrice))
      return postAction(fd)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['salesInvoice', facid] }),
  })
}

export interface SalesLineUpdateInput extends SalesLineInput {
  lineId: string
}

export function useUpdateSalesInvoiceLine(facid: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: SalesLineUpdateInput) => {
      const fd = new FormData()
      fd.set('action', 'updateline')
      fd.set('facid', facid ?? '')
      fd.set('lineid', input.lineId)
      fd.set('desc', input.desc)
      fd.set('qty', String(input.qty))
      fd.set('pu_ht', String(input.priceHt))
      fd.set('tva_tx', input.vatRateStr)
      fd.set('remise_percent', String(input.discountPercent ?? 0))
      fd.set('remise_type', input.discountType ?? '1')
      return postAction(fd)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['salesInvoice', facid] }),
  })
}

export function useDeleteSalesInvoiceLine(facid: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (lineId: string) => {
      const fd = new FormData()
      fd.set('action', 'deleteline')
      fd.set('facid', facid ?? '')
      fd.set('lineid', lineId)
      return postAction(fd)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['salesInvoice', facid] }),
  })
}

// Generic single-shot invoice actions — same real `InvoiceTab.action(act)`
// helper covers all of these on the real page (Clone/Delete/Re-open/Classify
// Paid), each just POSTing `action=<act>&facid=<id>` to the same endpoint.
export type SalesInvoiceSimpleAction = 'clone' | 'delete' | 'reopen' | 'classifypaid'

export function useSalesInvoiceAction(facid: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (action: SalesInvoiceSimpleAction) => {
      const fd = new FormData()
      fd.set('action', action)
      fd.set('facid', facid ?? '')
      return postAction<{ success: boolean; error?: string; new_id?: string; redirect?: string }>(fd)
    },
    onSuccess: (_data, action) => {
      if (action !== 'delete') queryClient.invalidateQueries({ queryKey: ['salesInvoice', facid] })
    },
  })
}

export interface ValidateSalesInvoiceInput {
  idwarehouse: string
  zravalidate?: string
}

export function useValidateSalesInvoice(facid: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: ValidateSalesInvoiceInput) => {
      const fd = new FormData()
      fd.set('action', 'validate')
      fd.set('facid', facid ?? '')
      fd.set('idwarehouse', input.idwarehouse)
      if (input.zravalidate) fd.set('zravalidate', input.zravalidate)
      return postAction(fd)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['salesInvoice', facid] }),
  })
}

// "Modify" (unvalidate back to draft) — same shape as validate, real
// contract `action=modif`, `idwarehouse` (for the stock reversal), read
// from InvoiceTab.confirmModif()/submitModif().
export function useModifySalesInvoice(facid: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (idwarehouse: string) => {
      const fd = new FormData()
      fd.set('action', 'modif')
      fd.set('facid', facid ?? '')
      fd.set('idwarehouse', idwarehouse)
      return postAction(fd)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['salesInvoice', facid] }),
  })
}

// Real ajax contract read verbatim from invoice.js's own updateZRA() —
// identical to this feature's existing useSyncZraInvoice (compta/facture
// side), confirmed to be the same real endpoint either page's JS calls.
export function useSyncSalesInvoiceZra(facid: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const fd = new FormData()
      fd.set('type', 'getzraresponseinvoice')
      fd.set('cisInvcNo', facid ?? '')
      const res = await fetch('/quicklinks_ajax.php', { method: 'POST', credentials: 'same-origin', body: fd })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['salesInvoice', facid] }),
  })
}

export interface SalesWarehouseOption {
  value: string
  label: string
  selected: boolean
}

export interface SalesProductOption {
  value: string
  label: string
}

export interface SalesDraftFormOptions {
  warehouseOptions: SalesWarehouseOption[]
  unvalidateWarehouseOptions: SalesWarehouseOption[]
  productOptions: SalesProductOption[]
}

function scrapeSelectOptions(doc: Document, selector: string): SalesWarehouseOption[] {
  const select = doc.querySelector<HTMLSelectElement>(selector)
  return select ? Array.from(select.options).map((o) => ({ value: o.value, label: (o.textContent ?? '').trim(), selected: o.selected })) : []
}

// `#vm-warehouse` (real "Validate" modal), `#um-warehouse` (real "Modify"/
// unvalidate modal) and `#nl-idprod` (real add-line product select) are all
// plain server-rendered markup, not part of invoice.php's own JSON — same
// small, deliberate HTML-scrape exception this app already uses elsewhere
// when no JSON API covers a field (see AGENTS.md/project convention).
// Combined into one fetch since all three selects live on the same real
// page.
//
// compta/sales/card.php (1.4–1.7 MB) feeds both this and useDebitNoteEnabled
// below: it is downloaded once into this shared cache entry, then each hook
// reads what it needs from it.
function salesInvoicePageQuery(facid: string | undefined) {
  return {
    queryKey: ['salesInvoice', facid, 'page'],
    queryFn: async (): Promise<string> => {
      const res = await fetch(`${SALES_BASE}/card.php?facid=${facid}`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      return res.text()
    },
    staleTime: 1000 * 30,
  }
}

function parseDraftFormOptions(html: string): SalesDraftFormOptions {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const productSelect = doc.querySelector<HTMLSelectElement>('#nl-idprod')
  const productOptions: SalesProductOption[] = productSelect
    ? Array.from(productSelect.options)
        .filter((o) => o.value)
        .map((o) => ({ value: o.value, label: (o.textContent ?? '').trim() }))
    : []
  return {
    warehouseOptions: scrapeSelectOptions(doc, '#vm-warehouse'),
    unvalidateWarehouseOptions: scrapeSelectOptions(doc, '#um-warehouse'),
    productOptions,
  }
}

export function useSalesInvoiceDraftFormOptions(facid: string | undefined, enabled: boolean) {
  return useQuery({ ...salesInvoicePageQuery(facid), select: parseDraftFormOptions, enabled: enabled && !!facid })
}

export interface SalesProductPricing {
  priceHt: number
  priceTtc: number
  vatRate: number
  vatCode: string
  localtax1: number
  costPrice: number
  productType: number
}

// Real contract read verbatim from invoice.js's own product-select change
// handler (toggleAddLine()): POST /product/ajax/products.php,
// action=fetch&id=<id>&outjson=1&socid=<socid>&qty=1&price_base_type=HT.
export async function fetchSalesProductPricing(productId: string, socid: string): Promise<SalesProductPricing> {
  const fd = new FormData()
  fd.set('action', 'fetch')
  fd.set('id', productId)
  fd.set('outjson', '1')
  fd.set('socid', socid)
  fd.set('qty', '1')
  fd.set('price_base_type', 'HT')
  const res = await fetch('/product/ajax/products.php', { method: 'POST', credentials: 'same-origin', body: fd })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  const json = await res.json()
  const vatRate = Number(json.tva_tx ?? json.vat_rate) || 0
  const vatCode = json.vat_code || json.default_vat_code || ''
  let priceHt = Number(json.price ?? json.price_ht) || 0
  const priceTtc = Number(json.price_ttc) || 0
  if (!priceHt && priceTtc) {
    const localtax1 = Number(json.localtax1_tx ?? json.iplAmt) || 0
    const combined = vatRate + localtax1
    priceHt = combined > 0 ? priceTtc / (1 + combined / 100) : priceTtc
  }
  return {
    priceHt,
    priceTtc,
    vatRate,
    vatCode,
    localtax1: Number(json.localtax1_tx ?? json.iplAmt) || 0,
    costPrice: Number(json.cost_price) || 0,
    productType: Number(json.type) || 0,
  }
}

// `DEBIT_NOTE_ENABLED` is a page-level config flag set in the real page's
// own inline <script> (not part of invoice.php's JSON) — confirmed live to
// genuinely differ per backend/install (0 on 172.16.5.10, 1 on 172.16.5.55),
// so it can't be hardcoded. The real page omits the "Create Debit Note"
// button entirely when this is 0 (not just disables it), so this must be
// checked before showing that button at all.
const parseDebitNoteEnabled = (html: string): boolean => {
  const m = html.match(/DEBIT_NOTE_ENABLED\s*=\s*([^;]+);/)
  return m ? m[1].trim() === '1' : false
}

export function useDebitNoteEnabled(facid: string | undefined) {
  return useQuery({ ...salesInvoicePageQuery(facid), select: parseDebitNoteEnabled, enabled: !!facid })
}
