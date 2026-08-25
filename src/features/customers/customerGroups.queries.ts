import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useLogActivity } from '../agenda/agenda.queries'
import { useAuth } from '../auth/AuthContext'
import { parseCustomerGroupListDocument, looksLikeGroupListLoginPage, type CustomerGroupListRow } from './customerGroupListParser'

// discountType/discountMethod are the exact int codes societe/new_card.php's
// legacy form posts as dis_type/dis_method, stored verbatim in
// llx_custom_group.discount_type / .customer_method:
export const DISCOUNT_TYPE_OPTIONS = [
  { value: 0, label: 'Decrease' },
  { value: 1, label: 'Increase' },
] as const

export const DISCOUNT_METHOD_OPTIONS = [
  { value: 1, label: 'Percentage' },
  { value: 2, label: 'Product Price' },
] as const

export type CustomerGroupRow = CustomerGroupListRow

export interface CustomerGroupInput {
  label: string
  discount: number
  discountType: number
  discountMethod: number
  description: string 
}

const QUERY_KEY = ['customerGroups', 'list'] as const

// /api/customers/groups/ (and every plausible path variant, plus
// /api/categories/) is a confirmed 404 on the currently-active backend — but
// unlike a feature this Node backend never built at all, Customer Groups
// turned out to have a real Dolibarr-native page underneath after all:
// societe/new_card.php (list/delete) + societe/new_card_ajax.php
// (create/update), the same "dead REST route, real legacy page" pattern
// already found for Customer create and the Customers/Prospects list.
// Verified live: POSTing new_card_ajax.php?action=add performed a genuine
// INSERT (returned a real cust_group_id), and the row then appeared in
// new_card.php's own re-rendered list table. Real, persisted, shared across
// users — not the session-only local collection this used to be.
async function fetchCustomerGroupList(): Promise<CustomerGroupListRow[]> {
  const res = await fetch('/societe/new_card.php?action=list', { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  const html = await res.text()
  const doc = new DOMParser().parseFromString(html, 'text/html')
  if (looksLikeGroupListLoginPage(doc)) throw new Error('Not signed into the legacy backend.')
  return parseCustomerGroupListDocument(doc)
}

export function useCustomerGroupsSummary() {
  const query = useQuery({ queryKey: QUERY_KEY, queryFn: fetchCustomerGroupList, staleTime: 1000 * 30 })
  return { data: { groups: query.data ?? [] }, isError: query.isError, error: query.error, isLoading: query.isLoading }
}

export function useCustomerGroup(id: string | undefined) {
  const { data } = useCustomerGroupsSummary()
  return id ? data.groups.find((g) => String(g.id) === id) : undefined
}

export function formatDiscountMethod(row: Pick<CustomerGroupRow, 'discountMethod' | 'discount'>) {
  if (row.discountMethod === 1) return `Percentage -${row.discount}%`
  if (row.discountMethod === 2) return 'Product Price'
  return '—'
}

export function useCreateCustomerGroup() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const logActivity = useLogActivity()
  return useMutation({
    mutationFn: async (input: CustomerGroupInput) => {
      const form = new URLSearchParams()
      form.set('action', 'add')
      form.set('label', input.label)
      form.set('description', input.description)
      form.set('prod_discount', String(input.discount))
      form.set('dis_type', String(input.discountType))
      form.set('dis_method', String(input.discountMethod))
      const { data } = await axios.post<{ success: boolean; cust_group_id?: number; message?: string }>(
        '/societe/new_card_ajax.php',
        form,
        { transformResponse: (raw) => JSON.parse(String(raw).trim()) },
      )
      if (!data.success || !data.cust_group_id) throw new Error(data.message ?? 'Failed to create customer group.')
      return { id: data.cust_group_id }
    },
    onSuccess: (_result, input) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      const authorName = user ? `${user.firstname} ${user.lastname}`.trim() || user.login : 'Unknown'
      logActivity({ label: `New customer group ${input.label} added`, category: 'other', authorName })
    },
  })
}

// societe/new_card_ajax.php?action=update_group_info reads `label` from the
// request but never actually uses it in either UPDATE branch (confirmed by
// reading the file directly) — a real backend limitation, not a frontend
// bug: label can only be set at creation, not changed afterward. Still sent
// here (matches what the legacy page's own edit form posts), but callers
// should not expect a label change to stick — see the disabled Ref field in
// CustomerGroupCreateForm.tsx's edit mode.
export function useUpdateCustomerGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: CustomerGroupInput }) => {
      const form = new URLSearchParams()
      form.set('action', 'update_group_info')
      form.set('id', String(id))
      form.set('label', input.label)
      form.set('description', input.description)
      form.set('prod_discount1', String(input.discount))
      form.set('dis_type1', String(input.discountType))
      form.set('dis_method1', String(input.discountMethod))
      const { data } = await axios.post<{ success: boolean; message?: string }>(
        '/societe/new_card_ajax.php',
        form,
        { transformResponse: (raw) => JSON.parse(String(raw).trim()) },
      )
      if (!data.success) throw new Error(data.message ?? 'Failed to save changes.')
      return { id }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}

// new_card.php?action=delete&id=X is a plain GET (confirmed live: real
// `DELETE FROM llx_custom_group ... llx_group_price_product`, no token/
// confirmation of its own) — the confirm() dialog in CustomerGroupList.tsx's
// handleDelete is the only safety gate, same as every other delete in this
// app.
export function useDeleteCustomerGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/societe/new_card.php?action=delete&id=${id}`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      return { id }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}
