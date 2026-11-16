import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { bindKindOf, bindLines, loadBindLines, writeKindOf } from './bindingFapi'

// The lines still to bind (customer and vendor invoice lines) come from accountancy/fapi/binding_customer.php and binding_vendor.php
// (action=to_dispatch, bindingFapi.ts); the paths below only name which of the two a page is for.
export const CUSTOMER_BIND_PATH = '/accountancy/customer/list.php'
export const VENDOR_BIND_PATH = '/accountancy/supplier/list.php'

export function useBindLines(limit: number, page: number, path: string = CUSTOMER_BIND_PATH) {
  return useQuery({
    queryKey: ['generalLedger', 'bindLines', path, limit, page],
    queryFn: async () => {
      const kind = bindKindOf(path)
      if (!kind) throw new Error(`No binding list is known for ${path}.`)
      return loadBindLines(kind, limit, page)
    },
    staleTime: 0,
    placeholderData: (prev) => prev,
  })
}

export interface BindInput {
  token: string
  limit: number
  page: number
  sortfield: string
  sortorder: string
  // lineId -> accounting account option value, for each ticked line;
  // selectValue is the line's checkbox value exactly as the page printed it
  selections: { lineId: string; selectValue?: string; account: string }[]
}

// The messages a classic page prints as showToast("…", type) in an inline script (read by the pages that still post classic forms).
export function toastMessages(html: string): { type: string; message: string }[] {
  return Array.from(html.matchAll(/showToast\("((?:[^"\\]|\\.)*)",\s*"(\w+)"/g)).map((m) => ({
    type: m[2],
    message: m[1]
      .replace(/\\n/g, '\n')
      .replace(/\\(['"\\])/g, '$1')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\n\s*\n/g, '\n')
      .trim(),
  }))
}

export function useBindSelectedLines(path: string = CUSTOMER_BIND_PATH) {
  const queryClient = useQueryClient()
  return useMutation({
    // One POST to binding_customer.php / binding_vendor.php / binding_expensereport.php (action=bind): the ticked lines with their account.
    mutationFn: async (input: BindInput): Promise<string> => {
      const kind = writeKindOf(path)
      if (!kind) throw new Error(`No binding is known for ${path}.`)
      return bindLines(kind, input.selections.map((s) => ({ lineId: s.lineId, account: s.account })))
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['generalLedger'] }),
  })
}
