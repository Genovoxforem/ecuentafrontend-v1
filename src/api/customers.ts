/**
 * Centralized Customer (Third-Party) API client.
 *
 * All customer/prospect/vendor list, detail, create, update, delete, and
 * search calls go through this module — no scattered fetch/axios calls in
 * components. Uses the bearer-token-authenticated fapi endpoints that wrap
 * the existing Dolibarr Societe business class.
 */

import { fapi } from './axios'

// ── Types ──────────────────────────────────────────────────────

export interface ThirdPartyRow {
  id: number
  name: string
  name_alias: string | null
  code_client: string | null
  code_fournisseur: string | null
  email: string
  phone: string
  fax: string
  url: string
  address: string
  zip: string
  town: string
  tpin: string | null
  tracking: string | null
  vat_number: string | null
  currency: string | null
  client: number
  type: 'customer' | 'prospect' | 'customer_prospect'
  is_supplier: number
  status: number
  country: string
  country_code: string
  state: string
  state_code: string
  date_creation: string | null
  date_modification: string | null
  creator_name: string
  sales_rep: string
  sales_rep_id: number | null
  outstanding_balance: number
  price_level: number
  parent_id: number
  parent_name: string | null
  entity: number
  logo: string | null
  zrastatus: string | null
  note_private: string | null
  note_public: string | null
  typent_code: string | null
  staff_code: string | null
  legalform_label: string | null
}

export interface ThirdPartyDetail extends ThirdPartyRow {
  sales_representatives: SalesRep[]
  categories: Category[]
  actions: {
    can_edit: number
    can_delete: number
  }
}

export interface SalesRep {
  id: number
  login: string
  name: string
}

export interface Category {
  id: number
  label: string
  color: string
  type: number
}

export interface SearchResult {
  items: Array<{
    id: number
    name: string
    name_alias: string | null
    code_client: string | null
    code_fournisseur: string | null
    type: string
    is_supplier: number
    email: string
    phone: string
    town: string
    country: string
    country_code: string
  }>
}

export interface SummaryData {
  type: string
  total: number
  created_this_month: number
  outstanding_balance: number
  default_country_parties: number
  other_country_parties: number
  currency: string
  currency_symbol: string
}

export interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

// ── Standard fapi response shapes ──────────────────────────────

interface FapiSuccess<T> {
  success: true
  data: T
  message: string | null
  errors: []
}

interface FapiListResponse<T> {
  success: true
  data: {
    items: T[]
    pagination: Pagination
  }
  message: string | null
  errors: []
}

// ── API functions ──────────────────────────────────────────────

export type ThirdPartyType = 'customer' | 'prospect' | 'vendor' | 'all'

export interface ListParams {
  page?: number
  limit?: number
  search?: string
  type?: ThirdPartyType
  sort?: string
  direction?: 'asc' | 'desc'
  category?: number
  sales_rep?: number
  date_from?: string
  date_to?: string
  country?: string
  status?: number
  zrastatus?: string
}

/**
 * GET /societe/fapi/list.php — paginated third-party list.
 */
export async function fetchThirdParties(params: ListParams = {}): Promise<{
  items: ThirdPartyRow[]
  pagination: Pagination
}> {
  const res = await fapi.get<FapiListResponse<ThirdPartyRow>>('/societe/fapi/list.php', { params })
  return res.data.data
}

/**
 * GET /societe/fapi/get.php?id=… — single third-party detail.
 */
export async function fetchThirdParty(id: number): Promise<ThirdPartyDetail> {
  const res = await fapi.get<FapiSuccess<ThirdPartyDetail>>('/societe/fapi/get.php', {
    params: { id },
  })
  return res.data.data
}

/**
 * GET /societe/fapi/summary.php?type=… — KPI summary for a type.
 */
export async function fetchThirdPartySummary(type: ThirdPartyType = 'customer'): Promise<SummaryData> {
  const res = await fapi.get<FapiSuccess<SummaryData>>('/societe/fapi/summary.php', {
    params: { type },
  })
  return res.data.data
}

/**
 * GET /societe/fapi/search.php?q=… — quick search for dropdowns.
 */
export async function searchThirdParties(
  q: string,
  type: ThirdPartyType = 'all',
  limit = 20,
): Promise<SearchResult['items']> {
  const res = await fapi.get<FapiSuccess<SearchResult>>('/societe/fapi/search.php', {
    params: { q, type, limit },
  })
  return res.data.data.items
}

export interface CreateInput {
  name: string
  type?: ThirdPartyType
  name_alias?: string
  email?: string
  phone?: string
  fax?: string
  url?: string
  address?: string
  zip?: string
  town?: string
  country_id?: number
  tpin?: string
  tracking?: string
  vat_number?: string
  currency?: string
  note_private?: string
  note_public?: string
  status?: number
  code_client?: string
  code_fournisseur?: string
}

/**
 * POST /societe/fapi/create.php — create a new third party.
 */
export async function createThirdParty(input: CreateInput): Promise<{
  id: number
  name: string
  code_client: string
  code_fournisseur: string
}> {
  const res = await fapi.post<FapiSuccess<{ id: number; name: string; code_client: string; code_fournisseur: string }>>(
    '/societe/fapi/create.php',
    input,
  )
  return res.data.data
}

export interface UpdateInput extends Partial<CreateInput> {
  id: number
}

/**
 * POST /societe/fapi/update.php?id=… — update an existing third party.
 */
export async function updateThirdParty(input: UpdateInput): Promise<{ id: number }> {
  const { id, ...body } = input
  const res = await fapi.post<FapiSuccess<{ id: number }>>('/societe/fapi/update.php', body, {
    params: { id },
  })
  return res.data.data
}

/**
 * DELETE /societe/fapi/delete.php?id=… — delete a third party.
 */
export async function deleteThirdParty(id: number): Promise<{ id: number }> {
  const res = await fapi.delete<FapiSuccess<{ id: number }>>('/societe/fapi/delete.php', {
    params: { id },
  })
  return res.data.data
}
