import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toastMessages } from '../generalLedger/bindLines.queries'
import axios from 'axios'
import { fapi } from '../../api/axios'
import { fetchInvoiceDocumentModels, fetchInvoiceFormSettings, fetchInvoiceIncoterms } from '../../api/invoices'
import { requireJson } from '../salesOrders/orderApi'

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
  date: string // yyyy-MM-dd
  refClient?: string
  type?: number // 0=standard, 6=LPO, 7=export
  paymentModeCode?: string // the payment mode's value in the classic form's select ("01" = Cash)
  paymentTermId?: string
  bankAccountId?: string
  projectId?: string
  warehouseId?: string
  note?: string
  notePublic?: string
  notePrivate?: string
  currency?: string
  currencyRate?: number
  shippingCharges?: number
  shippingVatRate?: number
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

// compta/facture/fapi/create.php (15 Oct 2026): header, lines, optional validation and optional cash payment in ONE
// JSON call and one transaction, for standard, Lpo (6) and Export (7) invoices alike; a failing line rolls the whole
// invoice back (422 with a per-line list), so there is no half-created draft. Since 16 Oct 2026 (_extras.php) it also
// takes notes, a project, the shipment block, freight, flat per-line discounts and advance use, and a foreign currency
// as multicurrency_code + multicurrency_tx (the line prices are in that currency, the totals are converted).
function fapiCreateError(e: unknown): Error {
  if (axios.isAxiosError(e)) {
    const body = e.response?.data as { message?: string; errors?: unknown } | undefined
    const detail = Array.isArray(body?.errors) ? body.errors.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join('; ') : ''
    if (body?.message) return new Error([body.message, detail].filter(Boolean).join(' — '))
    return new Error(`The backend refused this invoice (HTTP ${e.response?.status ?? 'no response'}).`)
  }
  return e instanceof Error ? e : new Error('The backend refused this invoice.')
}

async function createViaFapi(input: NewInvoiceInput & { type?: number; incotermId?: string; incotermLocation?: string; model?: string }, validate: boolean): Promise<{ id: number; ref: string }> {
  // The form carries the payment mode's code ("01"); the endpoint wants its id.
  const settings = await fetchInvoiceFormSettings()
  const modeId = settings.mode_options.find((m) => m.code === input.paymentModeCode)?.id ?? (Number(input.paymentModeCode) || undefined)
  const body: Record<string, unknown> = {
    socid: Number(input.customerId),
    type: input.type ?? 0,
    date: input.date,
    ref_client: input.refClient || undefined,
    cond_reglement_id: Number(input.paymentTermId) || undefined,
    mode_reglement_id: modeId,
    fk_account: Number(input.bankAccountId) || undefined,
    warehouse_id: Number(input.warehouseId) || undefined,
    note_public: input.notePublic || undefined,
    note_private: input.notePrivate ?? input.note ?? undefined,
    project_id: Number(input.projectId) || undefined,
    incoterm_id: Number(input.incotermId) || undefined,
    location_incoterms: input.incotermLocation || undefined,
    model: input.model || undefined,
    ...(input.currency && input.currencyRate && input.currencyRate !== 1 ? { multicurrency_code: input.currency, multicurrency_tx: input.currencyRate } : {}),
    lines: input.lines
      .filter((l) => l.label.trim() && l.qty > 0)
      .map((l) => ({
        ...(Number(l.productId) ? { product_id: Number(l.productId) } : {}),
        description: l.label,
        label: l.label,
        qty: l.qty,
        pu_ht: l.unitPriceHt,
        tva_tx: l.vatRate,
        // A flat amount goes as remise_absolute (stored with remise_type 2); a percentage as remise_percent.
        ...(l.discountType === 2 && l.discountFixed ? { remise_absolute: l.discountFixed } : { remise_percent: l.discountPercent ?? 0 }),
        product_type: l.productType ?? 0,
      })),
    validate,
  }
  const sh = input.shipment
  if (sh) {
    const shipment = {
      gdn_no: sh.gdnNo,
      grn_no: sh.grnNo,
      shipping_via: sh.shippingVia,
      shipping_date: sh.shippingDate,
      tracking_id: sh.trackingId,
      transporter: sh.transporter,
      truck_details: sh.truckDetails,
      shipping_address: sh.shippingAddress,
    }
    if (Object.values(shipment).some(Boolean)) body.shipment = shipment
  }
  if (input.shippingCharges && input.shippingCharges > 0) {
    body.shipping_amount_ttc = input.shippingCharges
    if (input.shippingVatRate !== undefined) body.shipping_vat_rate = input.shippingVatRate
  }
  if (validate && input.useAdvance) body.use_advance = true
  if (input.type === 6 || input.type === 7) {
    body.lpono = input.lpoNo?.trim() || undefined
    body.refno = input.refNo?.trim() || undefined
    body.incoterm_id = Number(input.incotermId) || undefined
    body.location_incoterms = input.incotermLocation || undefined
    body.model = input.model || undefined
  }
  if (validate && input.paymentAmount && input.paymentAmount > 0 && modeId) {
    body.payment = { amount: input.paymentAmount, mode_id: modeId }
  }
  try {
    const res = requireJson(await fapi.post<{ success: boolean; message?: string; data?: { invoice_id?: number; invoice?: { id?: number; ref?: string } } }>('/compta/facture/fapi/create.php', body))
    if (!res.data.success) throw new Error(res.data.message || 'The backend refused this invoice.')
    const d = res.data.data
    return { id: d?.invoice?.id ?? d?.invoice_id ?? 0, ref: d?.invoice?.ref ?? '' }
  } catch (e) {
    throw fapiCreateError(e)
  }
}

async function saveInvoice(input: NewInvoiceInput, validate: boolean): Promise<{ id: number; ref: string }> {
  return createViaFapi(input, validate)
}

// Save as Draft — the classic page's createdraft().
export function useCreateInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: NewInvoiceInput) => saveInvoice(input, false),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
  })
}

// Save & Print — the classic page's createinvoice(): create, validate, and
// record the payment entered on the form.
export function useCreateAndValidateInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: NewInvoiceInput) => saveInvoice(input, true),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
  })
}

export interface InvoiceCreateOption {
  value: string
  label: string
}

export interface InvoiceCreateContext {
  hasLpo: boolean
  hasExport: boolean
}

// compta/facture/fapi/document_models.php reports the offered invoice types (`invoice_types`): the classic form only
// offered Lpo and Export when the ZRA module is on, and so does this list.
// Shares its query key with useInvoiceDocumentModels, so the create form makes one request for both.
export function useInvoiceCreateContext() {
  return useQuery({
    queryKey: ['invoices', 'documentModels'],
    queryFn: () => fetchInvoiceDocumentModels(),
    staleTime: 5 * 60_000,
    select: (d): InvoiceCreateContext => {
      const types = d.invoice_types ?? []
      return { hasLpo: types.some((t) => t.value === 6), hasExport: types.some((t) => t.value === 7) }
    },
  })
}

// compta/facture/fapi/incoterms.php — `enabled` is false when the incoterm
// module is off, in which case the form hides the control.
export function useInvoiceIncoterms() {
  return useQuery({
    queryKey: ['invoices', 'incoterms'],
    queryFn: () => fetchInvoiceIncoterms(),
    staleTime: 10 * 60_000,
    select: (d): { enabled: boolean; options: InvoiceCreateOption[] } => ({ enabled: d.enabled, options: d.incoterms.map((i) => ({ value: i.value, label: i.label })) }),
  })
}

// compta/facture/fapi/document_models.php — the templates for this entity and
// the one the classic form pre-selects.
export function useInvoiceDocumentModels() {
  return useQuery({
    queryKey: ['invoices', 'documentModels'],
    queryFn: () => fetchInvoiceDocumentModels(),
    staleTime: 10 * 60_000,
    select: (d): { options: InvoiceCreateOption[]; defaultModel: string } => ({
      options: d.models.map((m) => ({ value: m.value, label: m.label })),
      defaultModel: d.default_model || d.models[0]?.value || '',
    }),
  })
}

export interface NewTypedInvoiceInput extends NewInvoiceInput {
  type: 6 | 7
  incotermId?: string
  incotermLocation?: string
  model?: string
  baseCurrency?: string
}

// The classic page's own messages (setEventMessages) are printed at the end of
// the page as `var block = false … else { showToast("…", "error") }`. The page
// also carries many showToast() calls of its own scripts (the product and
// category pop-ups' field checks), so only the messages of that block count.
export function classicFormRefusals(html: string): string[] {
  const blocks = Array.from(html.matchAll(/var block = false\s*if \(block\) \{[\s\S]*?\}\s*else \{[\s\S]*?(showToast\("(?:[^"\\]|\\.)*",\s*"\w+"\))/g), (m) => m[1])
  return toastMessages(blocks.join('\n'))
    .filter((t) => t.type === 'error')
    .map((t) => t.message)
}

export async function createTypedInvoice(input: NewTypedInvoiceInput): Promise<{ id: number; ref: string }> {
  return createViaFapi(input, false)
}

export function useCreateTypedInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createTypedInvoice,
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
  })
}

// A standard draft, returned with its id — the first half of a template invoice,
// which is that draft converted (and so removed) by the recurring-invoice endpoint.
export function useCreateInvoiceReturningId() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: NewInvoiceInput) => saveInvoice(input, false),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
  })
}
