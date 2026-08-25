import { useMutation } from '@tanstack/react-query'
import { useLogActivity } from '../agenda/agenda.queries'
import { useAuth } from '../auth/AuthContext'
import { useLocalCollection } from '../../shared/localCollection'

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

// /api/customers/groups/ (llx_custom_group) genuinely doesn't exist on the
// currently-active backend — confirmed live: 404 on every path variant
// tried (customer-groups, customergroups, custom-groups, customers/group,
// groups), and /api/categories/ (a real endpoint elsewhere in this app,
// initially considered as a substitute) is also 404 here. Unlike Customers/
// Prospects — which had a genuine Dolibarr-native fallback
// (societe/api/list.php) this app just hadn't wired up yet — Customer
// Group's discount-rule concept has no Dolibarr equivalent at all to fall
// back to; it's a feature this Node backend built and this specific
// deployment never got. So this uses the same honest pattern this app
// already established for exactly that situation — no backend, not even a
// legacy page to scrape (see agenda.queries.ts's Activities, the direct
// model this follows): a local, session-only collection. Real create/edit/
// delete, immediately reflected everywhere it's read, explicitly not
// persisted past this session or shared with other users — not a permanent
// substitute for the real table, just no longer a dead end either.
const QUERY_KEY = ['local', 'customerGroups'] as const
const SEED: CustomerGroupRow[] = []

let idSeq = 1

export function useCustomerGroupsSummary() {
  const [groups] = useLocalCollection(QUERY_KEY, SEED)
  return { data: { groups }, isError: false, error: null, isLoading: false }
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
  const [, update] = useLocalCollection(QUERY_KEY, SEED)
  const { user } = useAuth()
  const logActivity = useLogActivity()
  return useMutation({
    mutationFn: async (input: CustomerGroupInput) => {
      const row: CustomerGroupRow = { id: idSeq++, ...input }
      update((current) => [...current, row])
      return { id: row.id }
    },
    onSuccess: (_result, input) => {
      const authorName = user ? `${user.firstname} ${user.lastname}`.trim() || user.login : 'Unknown'
      logActivity({ label: `New customer group ${input.label} added`, category: 'other', authorName })
    },
  })
}

export function useUpdateCustomerGroup() {
  const [, update] = useLocalCollection(QUERY_KEY, SEED)
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: CustomerGroupInput }) => {
      update((current) => current.map((g) => (g.id === id ? { id, ...input } : g)))
      return { id }
    },
  })
}

export function useDeleteCustomerGroup() {
  const [, update] = useLocalCollection(QUERY_KEY, SEED)
  return useMutation({
    mutationFn: async (id: number) => {
      update((current) => current.filter((g) => g.id !== id))
      return { id }
    },
  })
}
