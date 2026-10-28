/**
 * Centralized Invoices API client.
 * Uses bearer-token-authenticated fapi endpoints that wrap the
 * existing Dolibarr Facture business class.
 */

import { fapi } from './axios'

export interface InvoiceRow {
  id: number
  ref: string
  ref_client: string
  type: number
  fk_soc: number
  third_party_name: string
  third_party_alias: string
  third_party_email: string
  third_party_town: string
  third_party_zip: string
  third_party_country: string
  third_party_code: string
  typent_code: string
  state_name: string
  invoice_date: string | null
  date_valid: string | null
  due_date: string | null
  date_creation: string | null
  date_update: string | null
  total_ht: number
  total_vat: number
  total_ttc: number
  localtax1: number
  localtax2: number
  fk_statut: number
  paye: number
  status_label: string
  close_code: string | null
  fk_mode_reglement: number
  fk_cond_reglement: number
  author_login: string
  author_firstname: string
  author_lastname: string
  author_photo: string
  multicurrency_code: string
  multicurrency_tx: number
  multicurrency_total_ht: number
  multicurrency_total_vat: number
  multicurrency_total_ttc: number
  project_id: number | null
  project_ref: string | null
  project_label: string | null
  module_source: string | null
  pos_source: string | null
  zra_upload_status: string | null
  zra_upload_response: string | null
  zra_upload_error: string | null
  has_child_invoices: number
  note_private: string | null
  note_public: string | null
}

export interface InvoiceLine {
  id: number
  rowid: number
  product_id: number | null
  label: string
  description: string
  qty: number
  pu_ht: number
  pu_ttc: number
  remise_percent: number
  tva_tx: number
  total_ht: number
  total_tva: number
  total_ttc: number
  fk_unit: number | null
  product_type: number
  info_bits: number
  fk_parent_line: number
  special_code: number
  multicurrency_code: string | null
  multicurrency_subprice: number
}

export interface InvoiceDetail extends InvoiceRow {
  date_modification: string | null
  total_localtax1: number
  total_localtax2: number
  close_note: string | null
  lines: InvoiceLine[]
  actions: {
    can_edit: number
    can_delete: number
    can_validate: number
    can_abandon: number
    can_payment: number
  }
}

export interface InvoiceSummary {
  total_customers: number
  total_invoices: number
  paid_amount: number
  unpaid_amount: number
  currency: string
}

export interface InvoiceAgendaEvent {
  id: number
  ref: string
  url: string
  date: string
  date_end: string
  owner: string
  label: string
  type_code?: string
  location?: string
  related_object_ref: string
  related_object_url: string
  status_label: string
  percent: number
}

export interface InvoiceAgendaData {
  id: number
  ref: string
  created_by: string
  creation_date: string
  latest_modification_date: string
  validated_by: string
  validation_date: string
  closing_date?: string
  events: InvoiceAgendaEvent[]
}

export interface SalesOverviewData {
  currency: string
  period: { start: string; end: string; only_validated: boolean }
  sales: {
    invoice_count: number
    total_ht: number
    total_ttc: number
    net_of_refunds_ttc: number
  }
  refunds: {
    count: number
    total_ht: number
    total_ttc: number
    by_month: Array<{ month: string; count: number; total: number }>
    top_customers: Array<{ id: number; name: string; count: number; total: number }>
  }
  top_products: Array<{
    product_id: number
    ref: string
    label: string
    qty: number
    total_ht: number
    total_ttc: number
    invoice_count: number
  }>
}

export interface ProductPrice {
  product_id: number
  product_ref: string
  product_label: string
  socid: number
  price_level: number
  pu_ht: number
  pu_ttc: number
  tva_tx: number
  qty: number
  total_ht: number
  total_tva: number
  total_ttc: number
  currency: string
  fk_unit: number | null
}

export interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

interface FapiSuccess<T> {
  success: true
  data: T
  message: string | null
  errors: []
}

interface FapiListResponse<T> {
  success: true
  data: { items: T[]; pagination: Pagination }
  message: string | null
  errors: []
}

export interface InvoiceListParams {
  page?: number
  limit?: number
  search?: string
  status?: number
  socid?: number
  sort?: string
  direction?: 'asc' | 'desc'
  date_from?: string
  date_to?: string
  type?: number
}

export async function fetchInvoices(params: InvoiceListParams = {}, signal?: AbortSignal): Promise<{
  items: InvoiceRow[]
  pagination: Pagination
}> {
  const res = await fapi.get<FapiListResponse<InvoiceRow>>('/compta/facture/fapi/list.php', { params, signal })
  return res.data.data
}

export async function fetchInvoice(id: number): Promise<InvoiceDetail> {
  const res = await fapi.get<FapiSuccess<InvoiceDetail>>('/compta/facture/fapi/get.php', { params: { id } })
  return res.data.data
}

export async function fetchInvoiceSummary(socid?: number): Promise<InvoiceSummary> {
  const res = await fapi.get<FapiSuccess<InvoiceSummary>>('/compta/facture/fapi/summary.php', {
    params: socid ? { socid } : {},
  })
  return res.data.data
}

export async function fetchInvoiceAgenda(id: number): Promise<InvoiceAgendaData> {
  const res = await fapi.get<FapiSuccess<InvoiceAgendaData>>('/compta/facture/fapi/agenda.php', { params: { id } })
  return res.data.data
}

export interface SalesOverviewParams {
  year?: number
  date_start?: string
  date_end?: string
  socid?: number
  limit?: number
  only_validated?: number
}

export async function fetchSalesOverview(params: SalesOverviewParams = {}): Promise<SalesOverviewData> {
  const res = await fapi.get<FapiSuccess<SalesOverviewData>>('/compta/facture/fapi/sales_overview.php', { params })
  return res.data.data
}

export async function fetchProductPrice(productId: number, socid: number, qty = 1, fkUnit?: number): Promise<ProductPrice> {
  const res = await fapi.get<FapiSuccess<ProductPrice>>('/compta/facture/fapi/product-price.php', {
    params: { product_id: productId, socid, qty, fk_unit: fkUnit },
  })
  return res.data.data
}

export interface InvoiceIncoterm {
  value: string
  code: string
  label: string
  description: string
}

export interface InvoiceIncotermsData {
  enabled: boolean
  incoterms: InvoiceIncoterm[]
  count: number
  // Only present with ?id= — the invoice's saved incoterm.
  selected: { fk_incoterms: number; code: string; location_incoterms: string } | null
}

// Replaces select[name="incoterm_id"] on compta/facture/card.php. `enabled` is
// false when the incoterm module is off (the classic form then omits the field).
export async function fetchInvoiceIncoterms(id?: number): Promise<InvoiceIncotermsData> {
  const res = await fapi.get<FapiSuccess<InvoiceIncotermsData>>('/compta/facture/fapi/incoterms.php', { params: id ? { id } : {} })
  return res.data.data
}

export interface InvoiceDocumentModelsData {
  models: Array<{ value: string; label: string; description: string }>
  count: number
  default_model: string
  default_by_type: Record<string, string>
  languages: Array<{ value: string; label: string }>
  default_language: string
  // Only present with ?id= — the invoice's saved template.
  selected: { model_pdf: string; type: number; from_default: boolean } | null
  // Added 15 Oct 2026: the invoice types this install offers (standard always; Lpo = 6 and
  // Export = 7 only when the ZRA module is on or ZRA_Tpin is set, as the classic card's radios).
  invoice_types?: Array<{ value: number; code: string; label: string; hidden_for_credit_note: boolean }>
}

// Replaces select[name="model"] on compta/facture/card.php.
export async function fetchInvoiceDocumentModels(id?: number): Promise<InvoiceDocumentModelsData> {
  const res = await fapi.get<FapiSuccess<InvoiceDocumentModelsData>>('/compta/facture/fapi/document_models.php', { params: id ? { id } : {} })
  return res.data.data
}

// compta/facture/fapi/form_settings.php: the install-level settings of the draft invoice screen.
export interface InvoiceFormSettings {
  debit_note_enabled: number
  default_warehouse_id: number
  default_warehouse: { id: number; ref: string; label: string; location: string } | null
  cond_options: Array<{ id: number; code: string; label: string; days: number }>
  mode_options: Array<{ id: number; code: string; label: string; type: number }>
  bank_options: Array<{ id: number; ref: string; label: string; currency: string; type: number }>
  backdate_days: number
  currency: string
}

export async function fetchInvoiceFormSettings(): Promise<InvoiceFormSettings> {
  const res = await fapi.get<FapiSuccess<InvoiceFormSettings>>('/compta/facture/fapi/form_settings.php')
  if (typeof res.data !== 'object' || res.data === null) throw new Error('Invoice form settings are not available on this backend.')
  return res.data.data
}

export interface CreateInvoiceInput {
  socid: number
  type?: number
  date?: string
  note_private?: string
  note_public?: string
  ref_client?: string
  cond_reglement_id?: number
  mode_reglement_id?: number
  project_id?: number
  multicurrency_code?: string
  multicurrency_tx?: number
}

export async function createInvoice(input: CreateInvoiceInput): Promise<{ id: number; ref: string }> {
  const res = await fapi.post<FapiSuccess<{ id: number; ref: string }>>('/compta/facture/fapi/create.php', input)
  return res.data.data
}

export async function updateInvoice(id: number, input: Partial<CreateInvoiceInput>): Promise<{ id: number; ref: string }> {
  const res = await fapi.post<FapiSuccess<{ id: number; ref: string }>>('/compta/facture/fapi/update.php', input, { params: { id } })
  return res.data.data
}

export async function deleteInvoice(id: number): Promise<{ id: number }> {
  const res = await fapi.delete<FapiSuccess<{ id: number }>>('/compta/facture/fapi/delete.php', { params: { id } })
  return res.data.data
}

export type InvoiceAction = 'validate' | 'abandon' | 'reopen' | 'clone'

export async function invoiceAction(
  id: number,
  action: InvoiceAction,
  extra?: { close_code?: string; close_note?: string },
): Promise<{ id: number; ref?: string; fk_statut?: number }> {
  const res = await fapi.post<FapiSuccess<{ id: number; ref?: string; fk_statut?: number }>>(
    '/compta/facture/fapi/actions.php',
    { id, action, ...extra },
  )
  return res.data.data
}

export interface AddLineInput {
  description?: string
  pu_ht?: number
  qty?: number
  tva_tx?: number
  remise_percent?: number
  product_id?: number
  product_type?: number
  fk_unit?: number
  label?: string
}

export async function addInvoiceLine(invoiceId: number, input: AddLineInput): Promise<{
  line_id: number
  total_ht: number
  total_vat: number
  total_ttc: number
}> {
  const res = await fapi.post<FapiSuccess<{ line_id: number; total_ht: number; total_vat: number; total_ttc: number }>>(
    '/compta/facture/fapi/lines.php',
    { id: invoiceId, action: 'add', ...input },
  )
  return res.data.data
}

export async function updateInvoiceLine(invoiceId: number, lineId: number, input: AddLineInput): Promise<{
  line_id: number
  total_ht: number
  total_vat: number
  total_ttc: number
}> {
  const res = await fapi.post<FapiSuccess<{ line_id: number; total_ht: number; total_vat: number; total_ttc: number }>>(
    '/compta/facture/fapi/lines.php',
    { id: invoiceId, action: 'update', line_id: lineId, ...input },
  )
  return res.data.data
}

export async function deleteInvoiceLine(invoiceId: number, lineId: number): Promise<{
  line_id: number
  total_ht: number
  total_vat: number
  total_ttc: number
}> {
  const res = await fapi.post<FapiSuccess<{ line_id: number; total_ht: number; total_vat: number; total_ttc: number }>>(
    '/compta/facture/fapi/lines.php',
    { id: invoiceId, action: 'delete', line_id: lineId },
  )
  return res.data.data
}

// compta/facture/fapi/create_from_orders.php: bill a customer's orders, one invoice per
// customer (Facture::createFromOrder). Every order is checked before anything is written;
// one bad order means nothing is billed (422 with the reason per order). At most 100 orders.
export interface BilledInvoice {
  id: number
  ref: string
  socid: number
  third_party_name: string
  order_ids: number[]
  order_refs: string[]
  total_ht: number
  total_ttc: number
  status: number
  validated: boolean
}

export async function createInvoicesFromOrders(input: {
  order_ids: number[]
  validate?: 0 | 1
  classify_orders_billed?: 0 | 1
  warehouse_id?: number
}): Promise<{ invoices: BilledInvoice[]; orders_classified: number[] }> {
  const res = await fapi.post<FapiSuccess<{ invoices: BilledInvoice[]; orders_classified: number[] }>>('/compta/facture/fapi/create_from_orders.php', input, { validateStatus: () => true })
  const body = res.data as unknown as { success?: boolean; message?: string | null; errors?: unknown; data?: { invoices: BilledInvoice[]; orders_classified: number[] } }
  if (!body?.success) {
    const detail = Array.isArray(body?.errors) ? body.errors.map((e) => (typeof e === 'string' ? e : JSON.stringify(e))).join('; ') : ''
    throw new Error([body?.message, detail].filter(Boolean).join(' - ') || 'The orders could not be billed.')
  }
  return body.data ?? { invoices: [], orders_classified: [] }
}
