import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { api, fapi } from '../../api/axios'

// Customer groups (pricing groups) — /api/customer/group.php for legacy actions,
// with fapi list/create/delete routes.
//   GET    ?action=list[&search&page&limit]      groups
//   GET    ?action=get&id=N                      one group + its prices[] + customers_assigned
//   GET    ?action=products&id=N[&search&offset&limit]   the Product Price grid
//   GET    ?action=check_label&label=X[&id=N]    label availability
//   POST   {action:'create', ...}                create
//   PUT    {action:'update', id, ...}            partial update (label included)
//   DELETE ?action=delete&id=N                   delete + unassign customers
// Authenticated with the stored X-API-Key (see api/axios.ts).
const ENDPOINT = '/customer/group.php'
const FAPI_ENDPOINT = '/societe/fapi/customer_group.php'

export interface CustomerGroupListRow {
  id: number
  label: string
  discount: number
  discountType: number
  discountMethod: number
  description: string
}

// discountType / discountMethod are the integer codes the backend stores
// (llx_custom_group.discount_type / .customer_method).
export const DISCOUNT_TYPE_OPTIONS = [
  { value: 0, label: 'Decrease' },
  { value: 1, label: 'Increase' },
] as const

export const DISCOUNT_METHOD_OPTIONS = [
  { value: 1, label: 'Percentage' },
  { value: 2, label: 'Product Price' },
] as const

export type CustomerGroupRow = CustomerGroupListRow

export interface GroupPrice {
  productId: number
  price: number
}

export interface CustomerGroupInput {
  label: string
  discount: number
  discountType: number
  discountMethod: number
  description: string
  // Product Price method only: per-product overrides to save.
  prices?: GroupPrice[]
}

export interface CustomerGroupDetail extends CustomerGroupListRow {
  prices: Array<{ productId: number; ref: string; label: string; price: number }>
  customersAssigned: number
}

export interface GroupProductRow {
  productId: number
  ref: string
  label: string
  taxRate: number
  sellPrice: number
  groupPrice: number | null
}

interface RawGroup {
  id: number | string
  label: string | null
  discount: number | string | null
  discount_type: number | string | null
  customer_method: number | string | null
  description: string | null
  prices?: Array<{ product_id: number | string; ref: string | null; label: string | null; price: number | string | null }>
  customers_assigned?: number | string | null
}

interface ApiEnvelope {
  success: boolean
  error?: string
  message?: string
}

const QUERY_KEY = ['customerGroups', 'list'] as const

function mapGroup(g: RawGroup): CustomerGroupListRow {
  return {
    id: Number(g.id),
    label: g.label ?? '',
    discount: Number(g.discount) || 0,
    discountType: Number(g.discount_type) || 0,
    discountMethod: Number(g.customer_method) || 0,
    description: g.description ?? '',
  }
}

// The API returns the backend's own message in `error` (400/404/409 …); surface it instead of a generic failure.
function apiError(err: unknown, fallback: string): Error {
  const data = (err as { response?: { data?: ApiEnvelope } })?.response?.data
  return new Error(data?.error || data?.message || (err instanceof Error ? err.message : fallback) || fallback)
}

const PAGE_LIMIT = 100

// The list page searches, sorts and paginates client-side, so fetch every page once.
async function fetchCustomerGroupList(): Promise<CustomerGroupListRow[]> {
  const groups: CustomerGroupListRow[] = []
  for (let page = 1; page <= 50; page += 1) {
    let data: ApiEnvelope & { data?: RawGroup[]; count?: number; total?: number; page?: number; limit?: number }
    try {
      ;({ data } = await fapi.get(FAPI_ENDPOINT, { params: { action: 'list', page, limit: PAGE_LIMIT } }))
    } catch (err) {
      throw apiError(err, 'Could not load the customer groups.')
    }
    if (!data.success) throw new Error(data.error || 'Could not load the customer groups.')
    groups.push(...(data.data ?? []).map(mapGroup))
    if (groups.length >= (data.total ?? 0) || (data.data ?? []).length < PAGE_LIMIT) break
  }
  return groups
}

export function useCustomerGroupsSummary() {
  const query = useQuery({ queryKey: QUERY_KEY, queryFn: fetchCustomerGroupList, staleTime: 1000 * 30 })
  return { data: { groups: query.data ?? [] }, isError: query.isError, error: query.error, isLoading: query.isLoading }
}

export function formatDiscountMethod(row: Pick<CustomerGroupRow, 'discountMethod' | 'discount'>) {
  if (row.discountMethod === 1) return `Percentage -${row.discount}%`
  if (row.discountMethod === 2) return 'Product Price'
  return '—'
}

// Edit-form load: the group, its saved per-product prices and how many customers use it.
export function useCustomerGroupDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['customerGroups', 'detail', id],
    enabled: Boolean(id),
    queryFn: async (): Promise<CustomerGroupDetail> => {
      let data: ApiEnvelope & { data?: RawGroup }
      try {
        ;({ data } = await fapi.get(FAPI_ENDPOINT, { params: { action: 'get', id } }))
      } catch (err) {
        throw apiError(err, 'Customer group not found.')
      }
      if (!data.success || !data.data) throw new Error(data.error || 'Customer group not found.')
      const raw = data.data
      return {
        ...mapGroup(raw),
        prices: (raw.prices ?? []).map((p) => ({ productId: Number(p.product_id), ref: p.ref ?? '', label: p.label ?? '', price: Number(p.price) || 0 })),
        customersAssigned: Number(raw.customers_assigned) || 0,
      }
    },
  })
}

export const PRODUCTS_PAGE_SIZE = 25

// One page of the Product Price grid (every product with this group's override, if any).
export function useGroupProducts(groupId: string | undefined, search: string, offset: number, limit: number = PRODUCTS_PAGE_SIZE) {
  return useQuery({
    queryKey: ['customerGroups', 'products', groupId ?? 'new', search, offset, limit],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      let data: ApiEnvelope & {
        data?: Array<{ product_id: number | string; ref: string | null; label: string | null; tva_tx: number | string | null; sell_price: number | string | null; group_price: number | string | null }>
        hasMore?: boolean
      }
      try {
        ;({ data } = await fapi.get(FAPI_ENDPOINT, { params: { action: 'products', id: groupId ?? 0, search: search || undefined, offset, limit } }))
      } catch (err) {
        throw apiError(err, 'Could not load the products.')
      }
      if (!data.success) throw new Error(data.error || 'Could not load the products.')
      return {
        rows: (data.data ?? []).map(
          (p): GroupProductRow => ({
            productId: Number(p.product_id),
            ref: p.ref ?? '',
            label: p.label ?? '',
            taxRate: Number(p.tva_tx) || 0,
            sellPrice: Number(p.sell_price) || 0,
            groupPrice: p.group_price === null || p.group_price === undefined ? null : Number(p.group_price),
          }),
        ),
        hasMore: Boolean(data.hasMore),
      }
    },
  })
}

// Same rule the backend enforces on save; pass the group's id when editing so its own label doesn't read as taken.
export async function checkGroupLabel(label: string, id?: string): Promise<{ available: boolean; message: string }> {
  try {
    const { data } = await fapi.get<ApiEnvelope & { available?: boolean }>(FAPI_ENDPOINT, { params: { action: 'check_label', label, id } })
    return { available: Boolean(data.available), message: data.message ?? '' }
  } catch (err) {
    throw apiError(err, 'Could not check the label.')
  }
}

function toPayload(input: CustomerGroupInput) {
  return {
    label: input.label,
    description: input.description,
    customer_method: input.discountMethod,
    discount: input.discountMethod === 1 ? input.discount : 0,
    discount_type: input.discountMethod === 1 ? input.discountType : 0,
    ...(input.discountMethod === 2 && input.prices ? { prices: input.prices.map((p) => ({ product_id: p.productId, price: p.price })) } : {}),
  }
}

export function useCreateCustomerGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CustomerGroupInput) => {
      if (input.discountMethod === 1) {
        const body = new URLSearchParams({
          action: 'create',
          label: input.label,
          description: input.description,
          dis_method: String(input.discountMethod),
          prod_discount: String(input.discount),
          dis_type: String(input.discountType),
        })

        try {
          const { data } = await fapi.post<ApiEnvelope & { id?: number; cust_group_id?: number }>(
            `${FAPI_ENDPOINT}?action=create`,
            body,
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
          )
          const id = data.id ?? data.cust_group_id
          if (!data.success || !id) throw new Error(data.error || data.message || 'Failed to create customer group.')
          return { id }
        } catch (err) {
          const isMissingRoute =
            axios.isAxiosError(err) &&
            err.response?.status === 404 &&
            (typeof err.response.data !== 'object' || err.response.data === null)
          if (!isMissingRoute) throw apiError(err, 'Failed to create customer group.')
        }
      }

      if (input.discountMethod === 2) {
        try {
          const { data } = await fapi.post<ApiEnvelope & { id?: number; cust_group_id?: number }>(
            `${FAPI_ENDPOINT}?action=create`,
            { action: 'create', ...toPayload(input) },
          )
          const id = data.id ?? data.cust_group_id
          if (!data.success || !id) throw new Error(data.error || data.message || 'Failed to create customer group.')
          return { id }
        } catch (err) {
          const isMissingRoute =
            axios.isAxiosError(err) &&
            err.response?.status === 404 &&
            (typeof err.response.data !== 'object' || err.response.data === null)
          if (!isMissingRoute) throw apiError(err, 'Failed to create customer group.')
        }
      }

      try {
        const { data } = await api.post<ApiEnvelope & { id?: number; cust_group_id?: number }>(ENDPOINT, { action: 'create', ...toPayload(input) })
        const id = data.id ?? data.cust_group_id
        if (!data.success || !id) throw new Error(data.error || data.message || 'Failed to create customer group.')
        return { id }
      } catch (err) {
        throw apiError(err, 'Failed to create customer group.')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerGroups'] })
    },
  })
}

export function useUpdateCustomerGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: CustomerGroupInput }) => {
      try {
        const { data } = await fapi.post<ApiEnvelope>(FAPI_ENDPOINT, { id, ...toPayload(input) }, { params: { action: 'update' } })
        if (!data.success) throw new Error(data.error || data.message || 'Failed to save changes.')
        return { id }
      } catch (err) {
        throw apiError(err, 'Failed to save changes.')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerGroups'] })
    },
  })
}

// Deleting also resets the group on every customer assigned to it (the response says how many).
export function useDeleteCustomerGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      try {
        const { data } = await fapi.delete<ApiEnvelope & {
          customers_unassigned?: number
          data?: { customers_unassigned?: number }
        }>(FAPI_ENDPOINT, { params: { action: 'delete', id } })
        if (!data.success) throw new Error(data.error || data.message || 'Failed to delete customer group.')
        return {
          id,
          customersUnassigned: Number(data.data?.customers_unassigned ?? data.customers_unassigned) || 0,
        }
      } catch (err) {
        throw apiError(err, 'Failed to delete customer group.')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerGroups'] })
    },
  })
}
