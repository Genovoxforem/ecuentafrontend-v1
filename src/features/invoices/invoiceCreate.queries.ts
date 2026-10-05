import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchLegacyDocument, legacyMissingContentError, looksLikeLegacyLoginPageText, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'
import { toastMessages } from '../generalLedger/bindLines.queries'

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

interface UnifiedResponse {
  success: boolean
  message?: string
  invoice_id?: number
  invoice?: { id?: number; ref?: string; status?: number }
  lines_saved?: number
  lines_failed?: number
  errors?: string[]
}

// The classic invoice screens (compta/facture/invoice.php "Create Quick
// Invoice" and card.php "Create Detailed Invoice") save through ONE JSON
// endpoint, compta/facture/api/unified_invoice_api.php — confirmed by reading
// that page's own save scripts and the endpoint's PHP. One POST does it all:
// the invoice header as form fields (socid, reday/remonth/reyear, ref_client,
// mode_reglement_id, fk_account, cond_reglement_id, warehouse_id, …) plus the
// lines as a `cached_lines` JSON string; `action=draft` keeps the invoice a
// draft, `action=validate_cash` validates it (and records the payment when
// payment_amount is given). Everything runs in one database transaction, so a
// refusal (bad date, missing stock, …) creates nothing. This replaces POST
// /api/invoices/list/, which does not exist on the backend (404) — and the old
// "validate, else silently fall back to a draft" logic, which hid failures.
const UNIFIED_PATH = '/compta/facture/api/unified_invoice_api.php'

function lineJson(l: NewInvoiceLine) {
  const type = l.discountType === 2 ? 2 : 1
  return {
    product_id: Number(l.productId) || 0,
    description: l.label,
    qty: l.qty,
    subprice: l.unitPriceHt,
    tva_tx: l.vatRate,
    vat_src_code: l.vatCode ?? '',
    product_type: l.productType ?? 0,
    remise_type: type,
    discount_percent: type === 1 ? (l.discountPercent ?? 0) : 0,
    discount_fixed: type === 2 ? (l.discountFixed ?? 0) : 0,
  }
}

// yyyy-MM-dd -> the day/month/year fields the classic date picker posts.
function dateFields(iso: string): Record<string, string> {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? { reyear: m[1], remonth: m[2], reday: m[3] } : {}
}

export function buildUnifiedBody(input: NewInvoiceInput, validate: boolean): URLSearchParams {
  const body = new URLSearchParams({ socid: input.customerId, ...dateFields(input.date), cached_lines: JSON.stringify(input.lines.map(lineJson)) })
  const set = (k: string, v: string | number | undefined | null) => {
    if (v !== undefined && v !== null && String(v) !== '') body.set(k, String(v))
  }
  set('ref_client', input.refClient)
  set('note_public', input.notePublic)
  set('note_private', input.notePrivate ?? input.note)
  set('mode_reglement_id', input.paymentModeCode)
  set('cond_reglement_id', input.paymentTermId)
  set('fk_account', input.bankAccountId)
  set('projectid', input.projectId)
  set('warehouse_id', input.warehouseId)
  set('type', input.type)
  set('refno', input.refNo)
  set('lpono', input.lpoNo)
  // A foreign currency needs its rate; the invoice's own currency is left alone.
  if (input.currency && input.currencyRate && input.currencyRate !== 1) {
    set('multicurrency_code', input.currency)
    set('multicurrency_tx', input.currencyRate)
  }
  const s = input.shipment
  if (s) {
    set('gdnno', s.gdnNo)
    set('grnno', s.grnNo)
    set('shipment_month', s.month)
    set('shipmentvia', s.shippingVia)
    set('shipmentdate', s.shippingDate)
    set('trackingid', s.trackingId)
    set('transporter', s.transporter)
    set('truck_details', s.truckDetails)
    set('shipmentaddress', s.shippingAddress)
  }
  if (validate) {
    set('shipping_amount_ttc', input.shippingCharges)
    set('payment_amount', input.paymentAmount)
    body.set('pay_code', 'cash')
    if (input.useAdvance) body.set('use_advance', '1')
  }
  return body
}

// An invoice that exists on the backend although saving did not finish (some
// of its lines were refused). Carries the id so the form can point the user at it.
export class PartialInvoiceError extends Error {
  invoiceId: number
  invoiceRef: string
  constructor(invoiceId: number, invoiceRef: string, message: string) {
    super(message)
    this.name = 'PartialInvoiceError'
    this.invoiceId = invoiceId
    this.invoiceRef = invoiceRef
  }
}

// One POST to the unified endpoint, answered as JSON. `invoiceId` 0 creates the
// invoice; an existing draft's id adds the lines to it.
async function postUnified(action: string, invoiceId: number, body: URLSearchParams): Promise<{ id: number; ref: string }> {
  const res = await fetch(`${UNIFIED_PATH}?action=${action}&invoice_id=${invoiceId}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const text = await res.text()
  if (looksLikeLegacyLoginPageText(text)) throw new Error(NOT_SIGNED_IN_MESSAGE)
  let data: UnifiedResponse
  try {
    data = JSON.parse(text) as UnifiedResponse
  } catch {
    throw new Error(`The backend did not return a valid answer (HTTP ${res.status}).`)
  }
  const details = (data.errors ?? []).filter(Boolean).join('; ')
  if (!data.success) throw new Error([data.message, details].filter(Boolean).join(' — ') || 'The backend refused this invoice.')
  const id = data.invoice?.id ?? data.invoice_id ?? invoiceId
  // The backend commits the invoice even when some lines were rejected, and
  // the classic page reports that as an error — so do the same, but say which
  // invoice was created so it isn't lost.
  if ((data.lines_failed ?? 0) > 0 || (data.errors?.length ?? 0) > 0) {
    const ref = data.invoice?.ref ?? `#${id}`
    throw new PartialInvoiceError(id, ref, `Invoice ${ref} was created, but ${data.lines_failed ?? 0} line(s) failed to save${details ? `: ${details}` : '.'}`)
  }
  return { id, ref: data.invoice?.ref ?? '' }
}

async function saveInvoice(input: NewInvoiceInput, validate: boolean): Promise<{ id: number; ref: string }> {
  return postUnified(validate ? 'validate_cash' : 'draft', 0, buildUnifiedBody(input, validate))
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

// ── Lpo and Export invoices ──────────────────────────────────────────────────
// The unified endpoint above always creates a standard invoice and ignores
// `type`, so an Lpo (6) or Export (7) invoice is created the way the classic
// "Create Detailed Invoice" page does it: its own form POST to
// compta/facture/card.php (action=add), which saves the header with the type,
// the Ref No / LPO No and the incoterms, and answers with a redirect to the new
// invoice (…?facid=N). The lines are then added to that draft through the
// unified endpoint. The classic page only offers Lpo and Export when the ZRA
// module is on, so the radios it prints decide which types are offered here.
const CLASSIC_CARD = '/compta/facture/card.php'

export interface InvoiceCreateOption {
  value: string
  label: string
}

export interface InvoiceCreateContext {
  token: string
  hasLpo: boolean
  hasExport: boolean
  incoterms: InvoiceCreateOption[]
  models: InvoiceCreateOption[]
  defaultModel: string
}

const optionList = (select: Element | null | undefined): InvoiceCreateOption[] =>
  Array.from(select?.querySelectorAll('option') ?? []).map((o) => ({ value: o.getAttribute('value') ?? '', label: (o.textContent ?? '').replace(/\s+/g, ' ').trim() }))

// Reads the classic new-invoice form: its CSRF token, whether it offers the Lpo
// and Export types, and the incoterm / document template choices. The form's
// controls are looked up on the document, not inside the <form> — the page's
// HTML is malformed, so they often are not its descendants.
export async function fetchInvoiceCreateContext(): Promise<InvoiceCreateContext> {
  const doc = await fetchLegacyDocument(CLASSIC_CARD, new URLSearchParams({ action: 'create' }))
  const addAction = doc.querySelector('input[name="action"][value="add"]')
  if (!addAction) throw legacyMissingContentError(doc, 'The new-invoice form on this backend page was not recognised.')
  const token =
    addAction.closest('form')?.querySelector<HTMLInputElement>('input[name="token"]')?.value ??
    doc.querySelector<HTMLMetaElement>('meta[name="anti-csrf-currenttoken"]')?.content ??
    doc.querySelector<HTMLInputElement>('input[name="token"]')?.value ??
    ''
  if (!token) throw new Error('Could not read the backend session token — sign out and back in, then retry.')
  const models = optionList(doc.querySelector('select[name="model"]'))
  const selectedModel = doc.querySelector<HTMLOptionElement>('select[name="model"] option[selected]')?.value
  return {
    token,
    hasLpo: !!doc.querySelector('input[name="type"][value="6"]'),
    hasExport: !!doc.querySelector('input[name="type"][value="7"]'),
    incoterms: optionList(doc.querySelector('select[name="incoterm_id"]')).filter((o) => o.value && o.value !== '0'),
    models,
    defaultModel: selectedModel ?? models[0]?.value ?? '',
  }
}

export function useInvoiceCreateContext() {
  return useQuery({ queryKey: ['invoices', 'createContext'], queryFn: fetchInvoiceCreateContext, staleTime: 5 * 60_000 })
}

export interface NewTypedInvoiceInput extends NewInvoiceInput {
  type: 6 | 7
  incotermId?: string
  incotermLocation?: string
  model?: string
  baseCurrency?: string
}

// The classic form's own POST — see the section comment above. It requires a
// Ref No and an LPO No for every type, so a non-Lpo invoice carries the literal
// NULL its own form pre-fills.
function buildClassicBody(input: NewTypedInvoiceInput, token: string, defaultModel: string): URLSearchParams {
  const m = input.date.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  const body = new URLSearchParams({
    token,
    action: 'add',
    ref: 'provisoire',
    socid: input.customerId,
    type: String(input.type),
    refno: input.refNo?.trim() || 'NULL',
    lpono: input.lpoNo?.trim() || 'NULL',
    ref_client: input.refClient ?? '',
    re: m ? `${m[2]}/${m[3]}/${m[1]}` : '',
    reday: m?.[3] ?? '',
    remonth: m?.[2] ?? '',
    reyear: m?.[1] ?? '',
    cond_reglement_id: input.paymentTermId ?? '',
    mode_reglement_id: input.paymentModeCode ?? '',
    fk_account: input.bankAccountId || '-1',
    projectid: input.projectId || '0',
    incoterm_id: input.incotermId || '0',
    location_incoterms: input.incotermLocation ?? '',
    model: input.model || defaultModel,
    note_public: input.notePublic ?? '',
    note_private: input.notePrivate ?? input.note ?? '',
  })
  // A foreign currency carries its rate, like the classic form's own picker.
  if (input.currency && input.baseCurrency && input.currency !== input.baseCurrency) {
    body.set('multicurrency_code', input.currency)
    body.set('originmulticurrency_tx', String(input.currencyRate ?? 1))
  }
  return body
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
  // A fresh form read: the token must be current when the POST is sent.
  const context = await fetchInvoiceCreateContext()
  const res = await fetch(CLASSIC_CARD, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: buildClassicBody(input, context.token, context.defaultModel),
  })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  const html = await res.text()
  if (looksLikeLegacyLoginPageText(html)) throw new Error(NOT_SIGNED_IN_MESSAGE)
  // A saved invoice redirects to its own page (…card.php?facid=N); a refusal
  // re-renders the form with its message as a showToast(…, "error").
  const id = Number(/[?&](?:facid|id)=(\d+)/.exec(res.url)?.[1] ?? 0)
  if (!res.redirected || !id) {
    const refusal = classicFormRefusals(html)[0]
    throw new Error(refusal ?? 'The backend did not create this invoice.')
  }
  const lines = input.lines.filter((l) => l.label.trim() && l.qty > 0)
  if (lines.length === 0) return { id, ref: '' }
  const lineBody = new URLSearchParams({ socid: input.customerId, cached_lines: JSON.stringify(lines.map(lineJson)) })
  if (input.warehouseId) lineBody.set('warehouse_id', input.warehouseId)
  try {
    return await postUnified('draft', id, lineBody)
  } catch (e) {
    if (e instanceof PartialInvoiceError) throw e
    // The header exists even though its lines did not save — say so rather than hide the invoice.
    throw new PartialInvoiceError(id, `#${id}`, `The invoice was created (#${id}) but its lines were not saved: ${e instanceof Error ? e.message : 'unknown error'}`)
  }
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
