/**
 * Centralized Orders API client.
 * Uses bearer-token-authenticated fapi endpoints that wrap the
 * existing Dolibarr Commande business class.
 */

import { fapi } from './axios'

export interface OrderRow {
  id: number
  ref: string
  ref_client: string
  ref_ext: string
  fk_soc: number
  third_party_name: string
  third_party_code: string
  third_party_town: string
  date_commande: string | null
  date_valid: string | null
  date_creation: string | null
  date_delivery: string | null
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

export interface OrderLine {
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

export interface OrderDetail extends OrderRow {
  lines: OrderLine[]
  actions: {
    can_edit: number
    can_delete: number
    can_validate: number
    can_close: number
    can_cancel: number
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

export interface OrderListParams {
  page?: number
  limit?: number
  search?: string
  status?: number
  socid?: number
  sort?: string
  direction?: 'asc' | 'desc'
}

export async function fetchOrders(params: OrderListParams = {}): Promise<{
  items: OrderRow[]
  pagination: Pagination
}> {
  const res = await fapi.get<FapiListResponse<OrderRow>>('/commande/fapi/list.php', { params })
  return res.data.data
}

export async function fetchOrder(id: number): Promise<OrderDetail> {
  const res = await fapi.get<FapiSuccess<OrderDetail>>('/commande/fapi/get.php', { params: { id } })
  return res.data.data
}

export interface CreateOrderInput {
  socid: number
  date?: string
  note_private?: string
  note_public?: string
  ref_client?: string
  project_id?: number
  cond_reglement_id?: number
  mode_reglement_id?: number
  multicurrency_code?: string
  multicurrency_tx?: number
}

export async function createOrder(input: CreateOrderInput): Promise<{ id: number; ref: string }> {
  const res = await fapi.post<FapiSuccess<{ id: number; ref: string }>>('/commande/fapi/create.php', input)
  return res.data.data
}

export async function updateOrder(id: number, input: Partial<CreateOrderInput>): Promise<{ id: number; ref: string }> {
  const res = await fapi.post<FapiSuccess<{ id: number; ref: string }>>('/commande/fapi/update.php', input, { params: { id } })
  return res.data.data
}

export async function deleteOrder(id: number): Promise<{ id: number }> {
  const res = await fapi.delete<FapiSuccess<{ id: number }>>('/commande/fapi/delete.php', { params: { id } })
  return res.data.data
}

export type OrderAction = 'validate' | 'close' | 'cancel' | 'clone'

export async function orderAction(id: number, action: OrderAction): Promise<{ id: number; ref?: string; fk_statut?: number }> {
  const res = await fapi.post<FapiSuccess<{ id: number; ref?: string; fk_statut?: number }>>(
    '/commande/fapi/actions.php', { id, action },
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

export async function addOrderLine(orderId: number, input: AddLineInput): Promise<{
  line_id: number; total_ht: number; total_vat: number; total_ttc: number
}> {
  const res = await fapi.post<FapiSuccess<{ line_id: number; total_ht: number; total_vat: number; total_ttc: number }>>(
    '/commande/fapi/lines.php', { id: orderId, action: 'add', ...input },
  )
  return res.data.data
}

export async function updateOrderLine(orderId: number, lineId: number, input: AddLineInput): Promise<{
  line_id: number; total_ht: number; total_vat: number; total_ttc: number
}> {
  const res = await fapi.post<FapiSuccess<{ line_id: number; total_ht: number; total_vat: number; total_ttc: number }>>(
    '/commande/fapi/lines.php', { id: orderId, action: 'update', line_id: lineId, ...input },
  )
  return res.data.data
}

export async function deleteOrderLine(orderId: number, lineId: number): Promise<{
  line_id: number; total_ht: number; total_vat: number; total_ttc: number
}> {
  const res = await fapi.post<FapiSuccess<{ line_id: number; total_ht: number; total_vat: number; total_ttc: number }>>(
    '/commande/fapi/lines.php', { id: orderId, action: 'delete', line_id: lineId },
  )
  return res.data.data
}
