import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchLegacyDocument, looksLikeLegacyLoginPageText, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'
import { toastMessages } from './bindLines.queries'
import { parseTaxAccountEditForm, parseTaxAccounts, type TaxAccountEditForm, type TaxAccountValues } from './taxAccountsParser'

const PATH = '/admin/dict.php'
const KEY = ['generalLedger', 'taxAccounts']

export interface TaxAccountFilters {
  code: string
  country: string // country rowid, "0" = all; "__MYCOUNTRYID__" = the company's country
  rate: string
  module: string
}

export function useTaxAccounts(filters: TaxAccountFilters) {
  return useQuery({
    queryKey: [...KEY, filters],
    queryFn: async () => {
      const params = new URLSearchParams({ id: '7', from: 'accountancy', search_country_id: filters.country })
      if (filters.code) params.set('search_code', filters.code)
      if (filters.rate) params.set('search_rate', filters.rate)
      if (filters.module) params.set('search_modulecode', filters.module)
      return parseTaxAccounts(await fetchLegacyDocument(PATH, params))
    },
  })
}

async function post(body: URLSearchParams): Promise<void> {
  const res = await fetch(`${PATH}?id=7`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  const html = await res.text()
  if (looksLikeLegacyLoginPageText(html)) throw new Error(NOT_SIGNED_IN_MESSAGE)
  const err = toastMessages(html).find((m) => m.type === 'error')
  if (err) throw new Error(err.message)
}

// The real Add row: token + actionadd + the row's own fields.
export function useAddTaxAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ token, values }: { token: string; values: TaxAccountValues }) =>
      post(new URLSearchParams({ token, from: 'accountancy', id: '7', actionadd: 'Add', ...values })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

// The row's pencil renders the page's own edit form; read it for the current
// values and a fresh token instead of guessing them from the list cells.
export async function loadTaxAccountEditForm(editUrl: string): Promise<TaxAccountEditForm> {
  const [path, query = ''] = editUrl.split('?')
  const params = new URLSearchParams(query)
  params.set('from', 'accountancy')
  const form = parseTaxAccountEditForm(await fetchLegacyDocument(path, params))
  if (!form) throw new Error('The backend did not return the edit form for this entry.')
  return form
}

export function useUpdateTaxAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ form, values }: { form: TaxAccountEditForm; values: TaxAccountValues }) =>
      post(new URLSearchParams({ token: form.token, from: 'accountancy', page: form.page, rowid: form.rowid, entity: form.entity, actionmodify: 'Modify', ...values })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

// Enable/disable and delete are the row's own tokened GET links.
export function useFollowTaxAccountLink() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (url: string) => {
      const res = await fetch(url, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const html = await res.text()
      if (looksLikeLegacyLoginPageText(html)) throw new Error(NOT_SIGNED_IN_MESSAGE)
      const err = toastMessages(html).find((m) => m.type === 'error')
      if (err) throw new Error(err.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}
