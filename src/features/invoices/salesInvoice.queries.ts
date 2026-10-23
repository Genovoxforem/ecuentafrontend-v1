import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { SalesInvoiceData } from './salesInvoiceApi'
import { fapi } from '../../api/axios'
import { fapiGet, fapiPost } from '../../api/fapiEnvelope'
import { fapiToSalesInvoice } from './salesInvoiceFapi'
import { fetchInvoiceFormSettings, type InvoiceFormSettings } from '../../api/invoices'

// Every card mutation goes to compta/facture/fapi (key-authenticated; replaces the session-only compta/sales/api/invoice.php).
const FAPI = '/compta/facture/fapi'

// "16 (A)" (rate and VAT code, as the line form holds it) -> the two fields the API takes.
function splitVat(v: string): { tva_tx: number; vat_src_code?: string } {
  const m = /^\s*([\d.]+)\s*(?:\(([^)]*)\))?/.exec(v)
  return { tva_tx: Number(m?.[1]) || 0, vat_src_code: m?.[2] || undefined }
}

// compta/facture/fapi/get.php, reshaped for the card by fapiToSalesInvoice().
export function useSalesInvoice(facid: string | undefined) {
  return useQuery<SalesInvoiceData>({
    queryKey: ['salesInvoice', facid],
    queryFn: async () => fapiToSalesInvoice(await fapiGet<Record<string, unknown>>('/compta/facture/fapi/get.php', { id: facid })),
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
    mutationFn: async (input: SalesLineInput) =>
      fapiPost(`${FAPI}/lines.php`, {
        id: Number(facid),
        product_id: input.productId ? Number(input.productId) : undefined,
        description: input.desc,
        qty: input.qty,
        pu_ht: input.priceHt,
        ...splitVat(input.vatRateStr),
        remise_percent: input.discountPercent ?? 0,
        remise_type: Number(input.discountType ?? '1'),
        pa_ht: input.costPrice || undefined,
      }, { action: 'add' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['salesInvoice', facid] }),
  })
}

export interface SalesLineUpdateInput extends SalesLineInput {
  lineId: string
}

export function useUpdateSalesInvoiceLine(facid: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: SalesLineUpdateInput) =>
      fapiPost(`${FAPI}/lines.php`, {
        id: Number(facid),
        line_id: Number(input.lineId),
        description: input.desc,
        qty: input.qty,
        pu_ht: input.priceHt,
        ...splitVat(input.vatRateStr),
        remise_percent: input.discountPercent ?? 0,
        remise_type: Number(input.discountType ?? '1'),
      }, { action: 'update' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['salesInvoice', facid] }),
  })
}

export function useDeleteSalesInvoiceLine(facid: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (lineId: string) => fapiPost(`${FAPI}/lines.php`, { id: Number(facid), line_id: Number(lineId) }, { action: 'delete' }),
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
    mutationFn: async (action: SalesInvoiceSimpleAction): Promise<{ new_id?: string }> => {
      if (action === 'delete') {
        await fapi.delete(`${FAPI}/delete.php`, { params: { id: facid } })
        return {}
      }
      const apiAction = action === 'reopen' ? 'classify_unpaid' : action === 'classifypaid' ? 'classify_paid' : 'clone'
      const d = await fapiPost<{ new_id?: number }>(`${FAPI}/actions.php`, { id: Number(facid), ...(apiAction === 'classify_paid' ? { close_code: 'other' } : {}) }, { action: apiAction })
      return { new_id: action === 'clone' && d.new_id ? String(d.new_id) : undefined }
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
    mutationFn: async (input: ValidateSalesInvoiceInput) =>
      fapiPost(`${FAPI}/actions.php`, { id: Number(facid), idwarehouse: input.idwarehouse ? Number(input.idwarehouse) : undefined, zravalidate: input.zravalidate || undefined }, { action: 'validate' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['salesInvoice', facid] }),
  })
}

// "Modify" (unvalidate back to draft) — same shape as validate, real
// contract `action=modif`, `idwarehouse` (for the stock reversal), read
// from InvoiceTab.confirmModif()/submitModif().
export function useModifySalesInvoice(facid: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (idwarehouse: string) => fapiPost(`${FAPI}/actions.php`, { id: Number(facid), idwarehouse: idwarehouse ? Number(idwarehouse) : undefined }, { action: 'back_to_draft' }),
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

export interface SalesDraftFormOptions {
  warehouseOptions: SalesWarehouseOption[]
  unvalidateWarehouseOptions: SalesWarehouseOption[]
}

// compta/facture/fapi/form_settings.php + product/stock/fapi/warehouses.php: the settings carry the configured default
// warehouse (it decides where stock moves on validation) and the debit-note flag (the "Create Debit Note" button is
// only offered when it is on).
const settingsQuery = {
  queryKey: ['invoices', 'formSettings'],
  queryFn: async (): Promise<{ settings: InvoiceFormSettings; warehouses: SalesWarehouseOption[] }> => {
    const settings = await fetchInvoiceFormSettings()
    const res = await fapi.get<{ success: boolean; data?: { items?: Array<{ id: number; ref?: string; label?: string }> } }>('/product/stock/fapi/warehouses.php', { params: { limit: 500 } })
    const warehouses = (res.data?.data?.items ?? []).map((w) => ({ value: String(w.id), label: w.ref ?? w.label ?? '', selected: w.id === settings.default_warehouse_id }))
    return { settings, warehouses }
  },
  staleTime: 1000 * 60 * 5,
}

export function useSalesInvoiceDraftFormOptions(_facid: string | undefined, enabled: boolean) {
  const settings = useQuery({ ...settingsQuery, enabled })
  const data: SalesDraftFormOptions | undefined = settings.data ? { warehouseOptions: settings.data.warehouses, unvalidateWarehouseOptions: settings.data.warehouses } : undefined
  return { data }
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
  const d = await fapiGet<{
    product?: { type?: number }
    price?: { pu_ht?: number; pu_ttc?: number }
    vat?: { rate?: number; code?: string }
    levies?: { total_rate?: number }
    cost?: { cost_price?: number; pmp?: number }
  }>('/product/fapi/price_for_customer.php', { product: Number(productId), socid: Number(socid), qty: 1, price_base_type: 'HT' })
  return {
    priceHt: Number(d.price?.pu_ht) || 0,
    priceTtc: Number(d.price?.pu_ttc) || 0,
    vatRate: Number(d.vat?.rate) || 0,
    vatCode: d.vat?.code ?? '',
    localtax1: Number(d.levies?.total_rate) || 0,
    costPrice: Number(d.cost?.cost_price) || Number(d.cost?.pmp) || 0,
    productType: Number(d.product?.type) || 0,
  }
}

export function useDebitNoteEnabled(facid: string | undefined) {
  const settings = useQuery({ ...settingsQuery, enabled: !!facid })
  return { data: settings.data ? settings.data.settings.debit_note_enabled === 1 : undefined }
}
