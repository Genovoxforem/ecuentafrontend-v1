import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchLegacyDocument } from '../../shared/legacyHtmlFetch'
import { legacyAdminSend } from '../settings/legacyAdminRequest'
import { dictConfirmDeleteUrl } from './dictLinks'
import { parseVatAccountEditForm, parseVatAccounts, type VatAccountEditForm, type VatAccountsPage, type VatAccountValues } from './vatAccountsParser'

// General Ledger > Setup > Vat accounts — admin/dict.php?id=10. Reading is the page itself; every
// change is the request the page's own controls send, confirmed by reading the list again (the
// backend answers each with the whole page and no status). Row links carry a token, so each
// write first re-reads the list and uses that row's fresh link.

const PATH = '/admin/dict.php'
const DICT_ID = '10'
const KEY = ['generalLedger', 'vatAccounts'] as const

// The list is filtered by country only (`search_country_id`: a country rowid, "0" = all,
// "__MYCOUNTRYID__" = the company's country). The page's own Code filter (`search_code`) is not
// sent: on this dictionary it makes the backend's SQL fail ("Column 'code' in where clause is
// ambiguous", the query joins the country table), so the page filters by code in the browser.
const fetchVat = async (country: string): Promise<VatAccountsPage> =>
  parseVatAccounts(await fetchLegacyDocument(PATH, new URLSearchParams({ id: DICT_ID, from: 'accountancy', search_country_id: country })))

export function useVatAccounts(country: string) {
  return useQuery({ queryKey: [...KEY, country], queryFn: () => fetchVat(country), staleTime: 1000 * 30 })
}

// The pencil renders the page's own edit form; read it for the current values and a fresh token.
export async function loadVatAccountEditForm(editUrl: string): Promise<VatAccountEditForm> {
  const [path, query = ''] = editUrl.split('?')
  const params = new URLSearchParams(query)
  params.set('from', 'accountancy')
  const form = parseVatAccountEditForm(await fetchLegacyDocument(path, params))
  if (!form) throw new Error('The backend did not return the edit form for this entry.')
  return form
}

// The Add row: token + actionadd + the row's own fields.
export function useAddVatAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: VatAccountValues) => {
      // Read the list the new row will appear in (its own country) before and after.
      const before = await fetchVat(values.country)
      const body = new URLSearchParams({ token: before.token, from: 'accountancy', id: DICT_ID, actionadd: 'Add', ...values })
      await legacyAdminSend(`${PATH}?id=${DICT_ID}`, { method: 'POST', body })
      const known = new Set(before.rows.map((r) => r.rowid))
      if (!(await fetchVat(values.country)).rows.some((r) => !known.has(r.rowid))) throw new Error('The backend did not add this VAT rate.')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

// The pencil's "Modify".
export function useUpdateVatAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ form, values }: { form: VatAccountEditForm; values: VatAccountValues }) => {
      const body = new URLSearchParams({ token: form.token, from: 'accountancy', page: form.page, rowid: form.rowid, entity: form.entity, actionmodify: 'Modify', ...values })
      await legacyAdminSend(`${PATH}?id=${DICT_ID}`, { method: 'POST', body })
      const saved = (await fetchVat(values.country)).rows.find((r) => r.rowid === form.rowid)
      if (!saved || saved.code !== values.code.trim()) throw new Error('The backend did not save this VAT rate.')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

// The status switch: the row's own `activate` / `disable` link.
export function useToggleVatAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ rowid, enable, country }: { rowid: string; enable: boolean; country: string }) => {
      const row = (await fetchVat(country)).rows.find((r) => r.rowid === rowid)
      if (!row?.toggleUrl) throw new Error('This VAT rate can no longer be found.')
      await legacyAdminSend(row.toggleUrl, { method: 'GET' })
      if ((await fetchVat(country)).rows.find((r) => r.rowid === rowid)?.active !== enable) throw new Error('The backend did not change this VAT rate.')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

// The trashcan: the row's delete link only shows the confirmation box; the app's own dialog
// replaces it and this sends the confirmed request.
export function useDeleteVatAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ rowid, country }: { rowid: string; country: string }) => {
      const row = (await fetchVat(country)).rows.find((r) => r.rowid === rowid)
      if (!row?.deleteUrl) throw new Error('This VAT rate can no longer be found.')
      await legacyAdminSend(dictConfirmDeleteUrl(row.deleteUrl), { method: 'GET' })
      if ((await fetchVat(country)).rows.some((r) => r.rowid === rowid)) throw new Error('The backend did not delete this VAT rate.')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}
