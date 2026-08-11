import { useLocalCollection, nextLocalRef } from '../../shared/localCollection'
import { useLogActivity } from '../agenda/agenda.queries'
import { useAuth } from '../auth/AuthContext'

export type DiscountMethod = 'Product Price' | 'Percentage'
export type DiscountType = 'N/A' | 'Increase' | 'Decrease'

export interface CustomerGroupRow {
  id: string
  label: string
  discountMethod: DiscountMethod
  // Only meaningful when discountMethod is 'Percentage' — the reference
  // list shows this baked into the Discount Method cell itself, e.g.
  // "Percentage -0%".
  discountValue: number
  discountType: DiscountType
  description: string
}

export interface CustomerGroupsSummary {
  groups: CustomerGroupRow[]
}

const SEED: CustomerGroupsSummary = { groups: [] }

const KEY = ['local', 'customerGroups'] as const

// No customer-group/discount-tier endpoint exists on this app's server —
// held in react-query's cache only (see shared/localCollection.ts), same
// pattern as users.queries.ts, so create/edit/delete feel real in the
// browser but never persist anywhere.
export function useCustomerGroupsSummary() {
  const [data] = useLocalCollection(KEY, SEED)
  return { data, isError: false, isLoading: false }
}

export function useCustomerGroup(id: string | undefined) {
  const { data } = useCustomerGroupsSummary()
  return id ? data.groups.find((g) => g.id === id) : undefined
}

export function formatDiscountMethod(row: Pick<CustomerGroupRow, 'discountMethod' | 'discountValue'>) {
  if (row.discountMethod === 'Percentage') return `Percentage -${row.discountValue}%`
  return row.discountMethod
}

export interface CustomerGroupInput {
  label: string
  discountMethod: DiscountMethod
  discountValue: number
  discountType: DiscountType
  description: string
}

export function useCreateCustomerGroup() {
  const [, update] = useLocalCollection(KEY, SEED)
  const logActivity = useLogActivity()
  const { user } = useAuth()
  return (input: CustomerGroupInput) => {
    const row: CustomerGroupRow = { id: nextLocalRef('cg'), ...input }
    update((current) => ({ ...current, groups: [row, ...current.groups] }))
    const authorName = user ? `${user.firstname} ${user.lastname}`.trim() || user.login : 'Unknown'
    logActivity({ label: `New customer group ${row.label} added`, category: 'other', authorName })
    return row
  }
}

export function useUpdateCustomerGroup() {
  const [, update] = useLocalCollection(KEY, SEED)
  return (id: string, input: CustomerGroupInput) => {
    update((current) => ({ ...current, groups: current.groups.map((g) => (g.id === id ? { ...g, ...input } : g)) }))
  }
}

export function useDeleteCustomerGroup() {
  const [, update] = useLocalCollection(KEY, SEED)
  return (id: string) => {
    update((current) => ({ ...current, groups: current.groups.filter((g) => g.id !== id) }))
  }
}
