import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fetchLegacyDocument } from '../../shared/legacyHtmlFetch'
import { parseBindExpenseLines } from './bindExpenseLinesParser'

export const EXPENSE_BIND_PATH = '/accountancy/expensereport/list.php'

// Binding itself reuses the customer/vendor mass action (useBindSelectedLines
// in bindLines.queries.ts): same form, same ventil POST.
export function useBindExpenseLines(limit: number, page: number) {
  return useQuery({
    queryKey: ['generalLedger', 'bindLines', EXPENSE_BIND_PATH, limit, page],
    queryFn: async () => parseBindExpenseLines(await fetchLegacyDocument(EXPENSE_BIND_PATH, new URLSearchParams({ limit: String(limit), page: String(page) }))),
    staleTime: 0,
    placeholderData: keepPreviousData,
  })
}
