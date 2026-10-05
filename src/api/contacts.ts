/**
 * Centralized Contacts API client.
 * Uses bearer-token-authenticated fapi endpoints that wrap the
 * existing Dolibarr Contact business class.
 */

import { fapi } from './axios'

export interface ContactRow {
  id: number
  firstname: string
  lastname: string
  full_name: string
  email: string
  phone_pro: string
  phone_mobile: string
  phone_perso: string
  fax: string
  poste: string
  address: string
  zip: string
  town: string
  country: string
  country_code: string
  status: number
  priv: number
  no_email: number
  date_creation: string | null
  date_update: string | null
  third_party_id: number | null
  third_party_name: string | null
  third_party_code: string | null
  photo: string | null
  stcomm: string | null
  prospect_level: string | null
}

export interface ContactDetail extends ContactRow {
  entity: number
  note_public: string | null
  note_private: string | null
  categories: Array<{ id: number; label: string; color: string }>
  actions: { can_edit: number; can_delete: number }
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

export type ContactType = 'customer' | 'prospect' | 'vendor' | 'other' | 'all'

export interface ContactListParams {
  page?: number
  limit?: number
  search?: string
  type?: ContactType
  sort?: string
  direction?: 'asc' | 'desc'
  status?: number
  socid?: number
}

export async function fetchContacts(params: ContactListParams = {}): Promise<{
  items: ContactRow[]
  pagination: Pagination
}> {
  const res = await fapi.get<FapiListResponse<ContactRow>>('/contact/fapi/list.php', { params })
  return res.data.data
}

export async function fetchContact(id: number): Promise<ContactDetail> {
  const res = await fapi.get<FapiSuccess<ContactDetail>>('/contact/fapi/get.php', { params: { id } })
  return res.data.data
}

export async function searchContacts(
  q: string,
  type: ContactType = 'all',
  limit = 20,
): Promise<Array<{ id: number; full_name: string; email: string; third_party_name: string | null }>> {
  const res = await fapi.get<FapiSuccess<{ items: any[] }>>('/contact/fapi/search.php', {
    params: { q, type, limit },
  })
  return res.data.data.items
}

export interface CreateContactInput {
  lastname?: string
  firstname?: string
  email?: string
  phone_pro?: string
  phone_mobile?: string
  phone_perso?: string
  fax?: string
  poste?: string
  address?: string
  zip?: string
  town?: string
  country_id?: number
  socid?: number
  status?: number
  priv?: number
  note_public?: string
  note_private?: string
}

export async function createContact(input: CreateContactInput): Promise<{ id: number }> {
  const res = await fapi.post<FapiSuccess<{ id: number }>>('/contact/fapi/create.php', input)
  return res.data.data
}

export async function updateContact(id: number, input: Partial<CreateContactInput>): Promise<{ id: number }> {
  const res = await fapi.post<FapiSuccess<{ id: number }>>('/contact/fapi/update.php', input, { params: { id } })
  return res.data.data
}

export async function deleteContact(id: number): Promise<{ id: number }> {
  const res = await fapi.delete<FapiSuccess<{ id: number }>>('/contact/fapi/delete.php', { params: { id } })
  return res.data.data
}
