import { useQuery } from '@tanstack/react-query'
import { looksLikeLegacyLoginPageText, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'

// The "New invoice - Wizard" (compta/facture/card-wizard.php) saves through the session-authenticated
// compta/facture/api/wizard_api.php. Contract, read from the page's own script (invoice-wizard.js) and from live GETs on
// newecuenta on 11 Nov 2026 (no write was sent):
//   GET  ?action=bootstrap&socid=N  -> { company_currency, currencies[{code,name,rate}], invoice_types[0,6,7,9..13], zra_enabled,
//        ci_enabled, pi_enabled, ci{ zambia_ports{}, destination_incoterms{}, departure_incoterms{}, banks{},
//        issued_commercial_invoices[{invc_no,ref,status}], issued_provisional_invoices[] }, permissions{create,validate} }
//   GET  ?action=get_rate&code=USD&date=YYYY-MM-DD -> { code, rate }
//   POST action=save_draft     (every header / shipment / ci_* field of the form + invoice_id, version, idempotency_key)
//        -> 200 { success, data: { invoice_id, version, reference } }, 422 { errors: { field: [msg] } }, 409 = changed elsewhere
//   POST action=validate_invoice (the same fields + pay_mode none|pay|draft, payment_mode_id, payment_account_id, use_advance, advance_id)
//        -> { success, data: { invoice_id, ref, status_label, customer_name, total_*, paid_amount, remain, zra{...}, pdf_url } }
// The lines of the draft go through compta/facture/fapi/lines.php (see src/api/invoices.ts).

export const WIZARD_API = '/compta/facture/api/wizard_api.php'

export const INVOICE_TYPES = [
  { value: 0, label: 'Standard invoice' },
  { value: 6, label: 'Lpo' },
  { value: 7, label: 'Export' },
  { value: 9, label: 'Commercial Invoice' },
  { value: 10, label: 'Provisional' },
  { value: 11, label: 'Final Invoice' },
  { value: 12, label: 'Final Credit Note' },
  { value: 13, label: 'Final Combined' },
] as const

export interface IssuedInvoiceRef {
  invc_no: string
  ref: string
  status?: string
}

export interface WizardBootstrap {
  company_currency: string
  currencies: { code: string; name: string; rate: number }[]
  invoice_types: number[]
  zra_enabled: number
  ci_enabled: number
  pi_enabled: number
  ci: {
    zambia_ports?: Record<string, string>
    destination_incoterms?: Record<string, string>
    departure_incoterms?: Record<string, string>
    banks?: Record<string, string>
    issued_commercial_invoices?: IssuedInvoiceRef[]
    issued_provisional_invoices?: IssuedInvoiceRef[]
  }
  permissions?: { create?: number; validate?: number }
}

// Field-level errors the backend returns with a 422, keyed by the form field name.
export class WizardError extends Error {
  errors: Record<string, string[]>
  status: number
  // True when the request may still have been processed (network failure / reconciliation required).
  uncertain: boolean
  constructor(message: string, status: number, errors: Record<string, string[]> = {}, uncertain = false) {
    super(message)
    this.errors = errors
    this.status = status
    this.uncertain = uncertain
  }
}

interface Envelope<T> {
  success?: boolean
  message?: string
  data?: T
  errors?: Record<string, string[]> | unknown[]
}

async function readEnvelope<T>(res: Response): Promise<Envelope<T>> {
  const text = await res.text()
  if (looksLikeLegacyLoginPageText(text)) throw new WizardError(NOT_SIGNED_IN_MESSAGE, 401)
  try {
    return JSON.parse(text) as Envelope<T>
  } catch {
    throw new WizardError(res.ok ? 'The backend did not answer in JSON.' : `Legacy backend returned ${res.status}.`, res.status)
  }
}

const fieldErrors = (e: Envelope<unknown>['errors']): Record<string, string[]> => (e && !Array.isArray(e) && typeof e === 'object' ? (e as Record<string, string[]>) : {})

async function wizardGet<T>(params: Record<string, string>): Promise<T> {
  const res = await fetch(`${WIZARD_API}?${new URLSearchParams(params)}`, { credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest' } })
  const body = await readEnvelope<T>(res)
  if (!body.success || body.data === undefined) throw new WizardError(body.message || `Request failed (${res.status}).`, res.status)
  return body.data
}

async function wizardPost<T>(fields: Record<string, string>): Promise<T> {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  let res: Response
  try {
    res = await fetch(WIZARD_API, { method: 'POST', credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest' }, body: fd })
  } catch {
    throw new WizardError('Network error — your changes are NOT saved. Try again.', 0, {}, true)
  }
  const body = await readEnvelope<T>(res)
  if (body.success && body.data !== undefined) return body.data
  const data = body.data as { requires_reconciliation?: boolean } | undefined
  if (res.status === 409) throw new WizardError(body.message || 'Conflict: the draft changed elsewhere. Reload the page.', 409)
  throw new WizardError(body.message || (res.status === 422 ? 'Validation failed' : `Save failed (${res.status})`), res.status, fieldErrors(body.errors), !!data?.requires_reconciliation)
}

export function useWizardBootstrap(socid: string) {
  return useQuery({
    queryKey: ['zra', 'invoiceWizard', 'bootstrap', socid || '0'],
    queryFn: () => wizardGet<WizardBootstrap>({ action: 'bootstrap', socid: socid || '0' }),
    staleTime: 1000 * 30,
    retry: false,
  })
}

export function fetchWizardRate(code: string, isoDate: string): Promise<number> {
  return wizardGet<{ rate: number }>({ action: 'get_rate', code, ...(isoDate ? { date: isoDate } : {}) }).then((d) => Number(d.rate) || 0)
}

export interface SavedDraft {
  invoice_id: number
  version: number
  reference?: string
}

export function saveWizardDraft(fields: Record<string, string>): Promise<SavedDraft> {
  return wizardPost<SavedDraft>({ ...fields, action: 'save_draft' })
}

export interface ValidatedInvoice {
  invoice_id: number
  ref?: string
  status?: string
  status_label?: string
  customer_name?: string
  total_ht?: number
  total_tva?: number
  total_ttc?: number
  paid_amount?: number
  remain?: number
  pdf_url?: string
  zra?: { sdc_id?: string; rcpt_no?: string; invc_no?: string; mrc_no?: string; rcpt_date?: string; status?: string; error?: string }
}

export function validateWizardInvoice(fields: Record<string, string>): Promise<ValidatedInvoice> {
  return wizardPost<ValidatedInvoice>({ ...fields, action: 'validate_invoice' })
}

// get_draft: the draft's header, shipment, ZRA fields and its current `version`. Every save that changes the invoice (lines
// included) moves `version`, and save_draft/validate_invoice answer 409 "modified elsewhere" when sent an older one, so the
// wizard re-reads it after saving lines (the legacy script does the same). Checked on the legacy server 11 Nov 2026.
export interface WizardDraft {
  invoice_id: number
  ref?: string
  version: number
  type: number
  socid: number
  customer_name?: string
  invoice_date?: string
  ref_client?: string | null
  refno?: string | null
  lpono?: string | null
  cond_reglement_id?: number | null
  mode_reglement_id?: string | null
  fk_account?: number | string | null
  projectid?: number | string | null
  model_pdf?: string | null
  note_public?: string | null
  note_private?: string | null
  multicurrency_code?: string | null
  multicurrency_tx?: number | null
  fk_incoterms?: number | null
  location_incoterms?: string | null
  shipmentvia?: string | null
  shipmentdate?: string | null
  shipmentaddress?: string | null
  trackingid?: string | null
  grndetails?: { gdnno?: string; grnno?: string; shipment_month?: string; transporter?: string; truck_details?: string } | unknown[]
  zra_reward_mobile?: string | null
  zra_reward_email?: string | null
  zra_reward_participate?: number
  ci_fields?: Record<string, unknown>
  lines_count?: number
  is_draft?: number
}

export function fetchWizardDraft(invoiceId: number): Promise<WizardDraft> {
  return wizardGet<WizardDraft>({ action: 'get_draft', invoice_id: String(invoiceId) })
}

// core/ajax/thirdparty.php?action=fetch: the customer's unused advance and the id the validation needs to apply it.
export async function fetchCustomerAdvance(socid: string): Promise<{ amount: number; id: number }> {
  const res = await fetch(`/core/ajax/thirdparty.php?${new URLSearchParams({ action: 'fetch', id: socid })}`, { credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest' } })
  const body = await readEnvelope<unknown>(res)
  const d = body as unknown as { customer_advance?: number | string; customer_advance_id?: number | string }
  return { amount: Number(d.customer_advance) || 0, id: Number(d.customer_advance_id) || 0 }
}
