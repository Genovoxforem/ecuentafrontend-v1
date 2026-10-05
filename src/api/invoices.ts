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

export async function fetchInvoices(params: InvoiceListParams = {}): Promise<{
  items: InvoiceRow[]
  pagination: Pagination
}> {
  const res = await fapi.get<FapiListResponse<InvoiceRow>>('/compta/facture/fapi/list.php', { params })
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

export async function fetchProductPrice(productId: number, socid: number, qty = 1, fkUnit?: number): Promise<ProductPrice> {
  const res = await fapi.get<FapiSuccess<ProductPrice>>('/compta/facture/fapi/product-price.php', {
    params: { product_id: productId, socid, qty, fk_unit: fkUnit },
  })
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
