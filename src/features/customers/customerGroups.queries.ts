import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/axios'
import { useLogActivity } from '../agenda/agenda.queries'
import { useAuth } from '../auth/AuthContext'

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

export interface CustomerGroupRow {
  id: number
  label: string
  discount: number
  discountType: number
  discountMethod: number | null
  description: string
}

export interface CustomerGroupInput {
  label: string
  discount: number
  discountType: number
  discountMethod: number
  description: string
}

interface WebEnvelope<T> {
  success: boolean
  data: T
}

const QUERY_KEY = ['customers', 'groups'] as const

// GET/POST/PUT/DELETE /api/customers/groups/ (api/customers/groups/index.php)
// — real, reads/writes llx_custom_group directly (ports Node
// sales-service/customers.service.js's list/create/delete; PUT added
// alongside this page so the existing Edit UI has a real backing route too).
export function useCustomerGroupsSummary() {
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<CustomerGroupRow[]> => {
      const { data } = await api.get<WebEnvelope<CustomerGroupRow[]>>('/customers/groups/')
      // discountType/discountMethod currently come back as raw MySQL strings
      // ("1"/"2") rather than JSON numbers — the backend's own int-cast on
      // these two fields was reverted this session — so every strict ===
      // comparison downstream (formatDiscountMethod, the list's badge
      // lookups) would silently never match without normalizing here first.
      return data.data.map((row) => ({
        ...row,
        discountType: Number(row.discountType),
        discountMethod: row.discountMethod === null ? null : Number(row.discountMethod),
      }))
    },
    // /customers/groups/ doesn't exist on the currently-active backend (see
    // BackendUnavailable.tsx) — a permanent 404, so retrying is pointless.
    retry: false,
  })
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
      const { data } = await api.post<WebEnvelope<{ id: number }>>('/customers/groups/', input)
      return data.data
    },
    onSuccess: (_result, input) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      const authorName = user ? `${user.firstname} ${user.lastname}`.trim() || user.login : 'Unknown'
      logActivity({ label: `New customer group ${input.label} added`, category: 'other', authorName })
    },
  })
}

export function useUpdateCustomerGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: CustomerGroupInput }) => {
      const { data } = await api.put<WebEnvelope<{ id: number }>>('/customers/groups/', { id, ...input })
      return data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useDeleteCustomerGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete<WebEnvelope<{ id: number }>>('/customers/groups/', { params: { id } })
      return data.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}
