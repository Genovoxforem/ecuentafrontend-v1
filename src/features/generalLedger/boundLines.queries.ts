import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { bindKindOf, loadBoundExpenseLines, loadBoundLines, rebindLines, writeKindOf } from './bindingFapi'

// The bound lines (customer, vendor and expense-report lines) come from accountancy/fapi/binding_customer.php, binding_vendor.php and
// binding_expensereport.php (action=dispatched, bindingFapi.ts); the paths below only name which of the three a page is for.
export const CUSTOMER_LINES_PATH = '/accountancy/customer/lines.php'
export const VENDOR_LINES_PATH = '/accountancy/supplier/lines.php'
const PATH = CUSTOMER_LINES_PATH
export const EXPENSE_LINES_PATH = '/accountancy/expensereport/lines.php'

export function useBoundExpenseLines(limit: number, page: number) {
  return useQuery({
    queryKey: ['generalLedger', 'boundLines', 'expense', limit, page],
    queryFn: () => loadBoundExpenseLines(limit, page),
    staleTime: 0,
    placeholderData: (prev) => prev,
  })
}

export function useBoundLines(limit: number, page: number, path: string = CUSTOMER_LINES_PATH) {
  return useQuery({
    queryKey: ['generalLedger', 'boundLines', path, limit, page],
    queryFn: async () => {
      const kind = bindKindOf(path)
      if (!kind) throw new Error(`No bound list is known for ${path}.`)
      return loadBoundLines(kind, limit, page)
    },
    staleTime: 0,
    placeholderData: (prev) => prev,
  })
}

export interface RebindInput {
  token: string
  limit: number
  page: number
  lineIds: string[]
  account: string // account option value; "0" = none
}

// "Change the binding": account "0" unbinds the lines, any other account binds them in its place (binding_*.php action=unbind / bind).
export function useRebindLines(path: string = PATH) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: RebindInput): Promise<string> => {
      const kind = writeKindOf(path)
      if (!kind) throw new Error(`No binding is known for ${path}.`)
      return rebindLines(kind, input.lineIds, input.account)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['generalLedger'] }),
  })
}
