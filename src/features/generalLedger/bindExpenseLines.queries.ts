import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { loadBindExpenseLines } from './bindingFapi'

export const EXPENSE_BIND_PATH = '/accountancy/expensereport/list.php'

// The lines come from accountancy/fapi/binding_expensereport.php (see bindingFapi.ts). Binding itself is useBindSelectedLines in bindLines.queries.ts.
export function useBindExpenseLines(limit: number, page: number) {
  return useQuery({
    queryKey: ['generalLedger', 'bindLines', EXPENSE_BIND_PATH, limit, page],
    queryFn: () => loadBindExpenseLines(limit, page),
    staleTime: 0,
    placeholderData: keepPreviousData,
  })
}
