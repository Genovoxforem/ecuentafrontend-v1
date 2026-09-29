import { useMutation, useQueryClient } from '@tanstack/react-query'
import { looksLikeLegacyLoginPageText, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'

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

async function saveInvoice(input: NewInvoiceInput, validate: boolean): Promise<{ id: number; ref: string }> {
  const action = validate ? 'validate_cash' : 'draft'
  const res = await fetch(`${UNIFIED_PATH}?action=${action}&invoice_id=0`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: buildUnifiedBody(input, validate),
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
  const id = data.invoice?.id ?? data.invoice_id ?? 0
  // The backend commits the invoice even when some lines were rejected, and
  // the classic page reports that as an error — so do the same, but say which
  // invoice was created so it isn't lost.
  if ((data.lines_failed ?? 0) > 0 || (data.errors?.length ?? 0) > 0) {
    throw new Error(`Invoice ${data.invoice?.ref ?? `#${id}`} was created, but ${data.lines_failed ?? 0} line(s) failed to save${details ? `: ${details}` : '.'}`)
  }
  return { id, ref: data.invoice?.ref ?? '' }
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
