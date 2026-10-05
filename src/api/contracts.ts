/**
 * Centralized Contracts API client.
 * Uses bearer-token-authenticated fapi endpoints that wrap the
 * existing Dolibarr Contrat business class.
 */

import { fapi } from './axios'

export interface ContractRow {
  id: number
  ref: string
  ref_customer: string
  ref_supplier: string
  fk_soc: number
  third_party_name: string
  third_party_code: string
  date_contrat: string | null
  date_valid: string | null
  date_creation: string | null
  total_ht: number
  total_vat: number
  total_ttc: number
  statut: number
  status_label: string
  fk_user_author: number
  author_login: string
  note_private: string | null
  note_public: string | null
}

export interface ContractLine {
  id: number
  product_id: number | null
  label: string
  description: string
  qty: number
  pu_ht: number
  tva_tx: number
  total_ht: number
  total_tva: number
  total_ttc: number
  date_start: string | null
  date_end: string | null
  date_start_real: string | null
  date_end_real: string | null
  status: number
  fk_unit: number | null
}

export interface ContractDetail extends ContractRow {
  lines: ContractLine[]
  actions: {
    can_edit: number
    can_delete: number
    can_validate: number
    can_activate: number
    can_close_line: number
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

export interface ContractListParams {
  page?: number
  limit?: number
  search?: string
  socid?: number
  sort?: string
  direction?: 'asc' | 'desc'
}

export async function fetchContracts(params: ContractListParams = {}): Promise<{
  items: ContractRow[]
  pagination: Pagination
}> {
  const res = await fapi.get<FapiListResponse<ContractRow>>('/contrat/fapi/list.php', { params })
  return res.data.data
}

export async function fetchContract(id: number): Promise<ContractDetail> {
  const res = await fapi.get<FapiSuccess<ContractDetail>>('/contrat/fapi/get.php', { params: { id } })
  return res.data.data
}

export interface CreateContractInput {
  socid: number
  date_contrat?: string
  note_private?: string
  note_public?: string
  ref_customer?: string
  project_id?: number
  commercial_id?: number
}

export async function createContract(input: CreateContractInput): Promise<{ id: number; ref: string }> {
  const res = await fapi.post<FapiSuccess<{ id: number; ref: string }>>('/contrat/fapi/create.php', input)
  return res.data.data
}

export async function updateContract(id: number, input: Partial<CreateContractInput>): Promise<{ id: number; ref: string }> {
  const res = await fapi.post<FapiSuccess<{ id: number; ref: string }>>('/contrat/fapi/update.php', input, { params: { id } })
  return res.data.data
}

export async function deleteContract(id: number): Promise<{ id: number }> {
  const res = await fapi.delete<FapiSuccess<{ id: number }>>('/contrat/fapi/delete.php', { params: { id } })
  return res.data.data
}

export type ContractAction = 'validate' | 'activate_line' | 'close_line'

export async function contractAction(
  id: number,
  action: ContractAction,
  extra?: { line_id?: number; date_start?: string; date_end?: string; comment?: string },
): Promise<{ id: number; ref?: string; line_id?: number }> {
  const res = await fapi.post<FapiSuccess<{ id: number; ref?: string; line_id?: number }>>(
    '/contrat/fapi/actions.php', { id, action, ...extra },
  )
  return res.data.data
}
