import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchLegacyDocument, looksLikeLegacyLoginPageText, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'
import { toastMessages } from './bindLines.queries'
import { parseBoundLines } from './boundLinesParser'
import { parseBoundExpenseLines } from './boundExpenseLinesParser'

export const CUSTOMER_LINES_PATH = '/accountancy/customer/lines.php'
export const VENDOR_LINES_PATH = '/accountancy/supplier/lines.php'
const PATH = CUSTOMER_LINES_PATH
export const EXPENSE_LINES_PATH = '/accountancy/expensereport/lines.php'

export function useBoundExpenseLines(limit: number, page: number) {
  return useQuery({
    queryKey: ['generalLedger', 'boundLines', 'expense', limit, page],
    queryFn: async () => parseBoundExpenseLines(await fetchLegacyDocument(EXPENSE_LINES_PATH, new URLSearchParams({ limit: String(limit), page: String(page) }))),
    staleTime: 0,
    placeholderData: (prev) => prev,
  })
}

export function useBoundLines(limit: number, page: number, path: string = CUSTOMER_LINES_PATH) {
  return useQuery({
    queryKey: ['generalLedger', 'boundLines', path, limit, page],
    queryFn: async () => parseBoundLines(await fetchLegacyDocument(path, new URLSearchParams({ limit: String(limit), page: String(page) }))),
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

// The real "Change the binding" POST: token + changeaccount[] + account_parent.
export function useRebindLines(path: string = PATH) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: RebindInput): Promise<string> => {
      const body = new URLSearchParams({
        token: input.token,
        formfilteraction: 'list',
        limit: String(input.limit),
        page: String(input.page),
        account_parent: input.account,
      })
      for (const id of input.lineIds) body.append('changeaccount[]', id)
      const res = await fetch(`${path}?limit=${input.limit}&page=${input.page}`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const html = await res.text()
      if (looksLikeLegacyLoginPageText(html)) throw new Error(NOT_SIGNED_IN_MESSAGE)
      const msgs = toastMessages(html)
      const err = msgs.find((m) => m.type === 'error')
      if (err) throw new Error(err.message)
      return msgs.map((m) => m.message).join('\n')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['generalLedger'] }),
  })
}
