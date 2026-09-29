import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchLegacyDocument, looksLikeLegacyLoginPageText, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'
import { toastMessages } from './bindLines.queries'
import { parseProductAccounts, type ProductAccountFilters } from './productAccountsParser'

const PATH = '/accountancy/admin/productaccount.php'

export interface ProductAccountsQuery {
  mode: string
  limit: number
  page: number
  filters: ProductAccountFilters
}

function listParams({ mode, limit, page, filters }: ProductAccountsQuery): URLSearchParams {
  // The page only applies its "without a valid dedicated account" default when
  // search_current_account_valid is absent, so always send it (empty = all).
  return new URLSearchParams({
    accounting_product_mode: mode,
    limit: String(limit),
    page: String(page),
    search_ref: filters.ref,
    search_label: filters.label,
    search_vat: filters.vat,
    search_onsell: filters.onsell,
    search_current_account: filters.currentAccount,
    search_current_account_valid: filters.currentAccountValid,
  })
}

export function useProductAccounts(query: ProductAccountsQuery) {
  return useQuery({
    queryKey: ['generalLedger', 'productAccounts', query],
    queryFn: async () => parseProductAccounts(await fetchLegacyDocument(PATH, listParams(query))),
    staleTime: 0,
    placeholderData: keepPreviousData,
  })
}

export interface SaveProductAccountsInput {
  token: string
  mode: string
  limit: number
  page: number
  sortfield: string
  sortorder: string
  // productId -> accounting account option value, for each ticked product
  selections: { productId: string; account: string }[]
}

// The real page's "Save" button: token, action=update, changeaccount, the
// ticked products as chk_prod[] and each one's chosen account as
// codeventil_<productId>. Only ticked products are sent.
export function useSaveProductAccounts() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: SaveProductAccountsInput): Promise<string> => {
      const body = new URLSearchParams({
        token: input.token,
        action: 'update',
        formfilteraction: 'list',
        accounting_product_mode: input.mode,
        sortfield: input.sortfield,
        sortorder: input.sortorder,
        changeaccount: 'Save',
      })
      for (const s of input.selections) {
        body.append('chk_prod[]', s.productId)
        body.set(`codeventil_${s.productId}`, s.account)
      }
      const res = await fetch(`${PATH}?limit=${input.limit}&page=${input.page}&accounting_product_mode=${encodeURIComponent(input.mode)}`, {
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
