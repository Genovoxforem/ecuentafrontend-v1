import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchLegacyDocument, looksLikeLegacyLoginPageText, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'
import { parseBindLines } from './bindLinesParser'

// accountancy/customer/list.php and accountancy/supplier/list.php are the same
// page (same form, same 13-cell rows) over invoice / vendor-invoice lines.
export const CUSTOMER_BIND_PATH = '/accountancy/customer/list.php'
export const VENDOR_BIND_PATH = '/accountancy/supplier/list.php'

export function useBindLines(limit: number, page: number, path: string = CUSTOMER_BIND_PATH) {
  return useQuery({
    queryKey: ['generalLedger', 'bindLines', path, limit, page],
    queryFn: async () => parseBindLines(await fetchLegacyDocument(path, new URLSearchParams({ limit: String(limit), page: String(page) }))),
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

// Same POST the real page's "Bind" + Confirm sends: token, action=ventil,
// massaction=ventil, confirmmassaction, one toselect[]="<lineId>_0" per ticked
// line and the chosen account as codeventil<lineId>. The result comes back as
// a showToast("…", type) message in an inline script.
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
    mutationFn: async (input: BindInput): Promise<string> => {
      const body = new URLSearchParams({
        token: input.token,
        action: 'ventil',
        massaction: 'ventil',
        confirmmassaction: 'Confirm',
        formfilteraction: 'list',
        limit: String(input.limit),
        page: String(input.page),
        sortfield: input.sortfield,
        sortorder: input.sortorder,
      })
      for (const s of input.selections) {
        body.append('toselect[]', s.selectValue ?? `${s.lineId}_0`)
        body.set(`codeventil${s.lineId}`, s.account)
      }
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
