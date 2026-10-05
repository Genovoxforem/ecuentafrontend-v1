/**
 * Centralized Quotations API client.
 * Uses bearer-token-authenticated fapi endpoints that wrap the
 * existing Dolibarr Propal business class.
 */

import { fapi } from './axios'

export interface QuotationRow {
  id: number
  ref: string
  ref_client: string
  fk_soc: number
  third_party_name: string
  third_party_code: string
  third_party_town: string
  date_propal: string | null
  date_valid: string | null
  date_creation: string | null
  date_close: string | null
  fin_validite: string | null
  total_ht: number
  total_vat: number
  total_ttc: number
  fk_statut: number
  status_label: string
  fk_user_author: number
  author_login: string
  author_firstname: string
  author_lastname: string
  multicurrency_code: string
  multicurrency_total_ht: number
  multicurrency_total_ttc: number
  project_id: number | null
  project_ref: string | null
  note_private: string | null
  note_public: string | null
}

export interface QuotationLine {
  id: number
  rowid: number
  product_id: number | null
  label: string
  description: string
  qty: number
  pu_ht: number
  remise_percent: number
  tva_tx: number
  total_ht: number
  total_tva: number
  total_ttc: number
  fk_unit: number | null
  product_type: number
}

export interface QuotationDetail extends QuotationRow {
  lines: QuotationLine[]
  actions: {
    can_edit: number
    can_delete: number
    can_validate: number
    can_sign: number
    can_refuse: number
    can_close: number
    can_reopen: number
    can_clone: number
  }
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

export interface QuotationListParams {
  page?: number
  limit?: number
  search?: string
  status?: number
  socid?: number
  sort?: string
  direction?: 'asc' | 'desc'
}

export async function fetchQuotations(params: QuotationListParams = {}): Promise<{
  items: QuotationRow[]
  pagination: Pagination
}> {
  const res = await fapi.get<FapiListResponse<QuotationRow>>('/comm/propal/fapi/list.php', { params })
  return res.data.data
}

export async function fetchQuotation(id: number): Promise<QuotationDetail> {
  const res = await fapi.get<FapiSuccess<QuotationDetail>>('/comm/propal/fapi/get.php', { params: { id } })
  return res.data.data
}

export interface CreateQuotationInput {
  socid: number
  date?: string
  fin_validite?: string
  note_private?: string
  note_public?: string
  ref_client?: string
  project_id?: number
  cond_reglement_id?: number
  mode_reglement_id?: number
  multicurrency_code?: string
  multicurrency_tx?: number
}

export async function createQuotation(input: CreateQuotationInput): Promise<{ id: number; ref: string }> {
  const res = await fapi.post<FapiSuccess<{ id: number; ref: string }>>('/comm/propal/fapi/create.php', input)
  return res.data.data
}

export async function updateQuotation(id: number, input: Partial<CreateQuotationInput>): Promise<{ id: number; ref: string }> {
  const res = await fapi.post<FapiSuccess<{ id: number; ref: string }>>('/comm/propal/fapi/update.php', input, { params: { id } })
  return res.data.data
}

export async function deleteQuotation(id: number): Promise<{ id: number }> {
  const res = await fapi.delete<FapiSuccess<{ id: number }>>('/comm/propal/fapi/delete.php', { params: { id } })
  return res.data.data
}

export type QuotationAction = 'validate' | 'sign' | 'accept' | 'refuse' | 'close' | 'reopen' | 'clone'

export async function quotationAction(
  id: number,
  action: QuotationAction,
  note?: string,
): Promise<{ id: number; ref?: string; fk_statut?: number }> {
  const res = await fapi.post<FapiSuccess<{ id: number; ref?: string; fk_statut?: number }>>(
    '/comm/propal/fapi/actions.php', { id, action, note },
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

export async function addQuotationLine(quotationId: number, input: AddLineInput): Promise<{
  line_id: number; total_ht: number; total_vat: number; total_ttc: number
}> {
  const res = await fapi.post<FapiSuccess<{ line_id: number; total_ht: number; total_vat: number; total_ttc: number }>>(
    '/comm/propal/fapi/lines.php', { id: quotationId, action: 'add', ...input },
  )
  return res.data.data
}

export async function updateQuotationLine(quotationId: number, lineId: number, input: AddLineInput): Promise<{
  line_id: number; total_ht: number; total_vat: number; total_ttc: number
}> {
  const res = await fapi.post<FapiSuccess<{ line_id: number; total_ht: number; total_vat: number; total_ttc: number }>>(
    '/comm/propal/fapi/lines.php', { id: quotationId, action: 'update', line_id: lineId, ...input },
  )
  return res.data.data
}

export async function deleteQuotationLine(quotationId: number, lineId: number): Promise<{
  line_id: number; total_ht: number; total_vat: number; total_ttc: number
}> {
  const res = await fapi.post<FapiSuccess<{ line_id: number; total_ht: number; total_vat: number; total_ttc: number }>>(
    '/comm/propal/fapi/lines.php', { id: quotationId, action: 'delete', line_id: lineId },
  )
  return res.data.data
}
