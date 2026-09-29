import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchLegacyDocument } from '../../shared/legacyHtmlFetch'
import { legacyAdminSend } from '../settings/legacyAdminRequest'
import { dictConfirmDeleteUrl } from './dictLinks'
import { parseDictionary, parseDictionaryEditForm, type DictionaryEditForm, type DictionaryPage } from './dictionaryParser'

// Any Dolibarr dictionary page (admin/dict.php?id=N&from=accountancy), see dictionaryParser.ts.
// Reading is the page itself; every change is the request the page's own controls send,
// confirmed by reading the page again (the backend answers each with the whole page and no
// status). Row links carry a token, so each write first re-reads the list and uses that row's
// fresh link.

const PATH = '/admin/dict.php'
const KEY = ['generalLedger', 'dictionary'] as const

// `search_*` parameter name -> value; empty values are not sent.
export type DictionaryFilters = Record<string, string>

const fetchDictionary = async (id: string, filters: DictionaryFilters): Promise<DictionaryPage> => {
  const params = new URLSearchParams({ id, from: 'accountancy' })
  for (const [name, value] of Object.entries(filters)) if (value) params.set(name, value)
  return parseDictionary(await fetchLegacyDocument(PATH, params))
}

export function useDictionary(id: string, filters: DictionaryFilters) {
  return useQuery({ queryKey: [...KEY, id, filters], queryFn: () => fetchDictionary(id, filters), staleTime: 1000 * 30 })
}

// The pencil renders the page's own edit form; read it for the stored values and a fresh token.
export async function loadDictionaryEditForm(editUrl: string, fieldNames: string[]): Promise<DictionaryEditForm> {
  const [path, query = ''] = editUrl.split('?')
  const params = new URLSearchParams(query)
  params.set('from', 'accountancy')
  const form = parseDictionaryEditForm(await fetchLegacyDocument(path, params), fieldNames)
  if (!form) throw new Error('The backend did not return the edit form for this entry.')
  return form
}

const same = (a: string, b: string) => a.trim() === b.trim()

// The Add row: token + actionadd + the row's own fields.
export function useAddDictionaryEntry(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const before = await fetchDictionary(id, {})
      const body = new URLSearchParams({ token: before.token, from: 'accountancy', id, actionadd: 'Add', ...values })
      await legacyAdminSend(`${PATH}?id=${id}`, { method: 'POST', body })
      const known = new Set(before.rows.map((r) => r.rowid))
      if (!(await fetchDictionary(id, {})).rows.some((r) => !known.has(r.rowid))) throw new Error('The backend did not add this entry.')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

// The pencil's "Modify". Confirmed by reading the entry's edit form again and comparing every field.
export function useUpdateDictionaryEntry(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ form, values }: { form: DictionaryEditForm; values: Record<string, string> }) => {
      const body = new URLSearchParams({ token: form.token, from: 'accountancy', page: form.page, rowid: form.rowid, entity: form.entity, actionmodify: 'Modify', ...values })
      await legacyAdminSend(`${PATH}?id=${id}`, { method: 'POST', body })
      const editUrl = (await fetchDictionary(id, {})).rows.find((r) => r.rowid === form.rowid)?.editUrl
      const saved = editUrl ? await loadDictionaryEditForm(editUrl, Object.keys(values)) : null
      if (!saved || Object.entries(values).some(([name, value]) => !same(saved.values[name] ?? '', value))) throw new Error('The backend did not save this entry.')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

// The status switch: the row's own `activate` / `disable` link.
export function useToggleDictionaryEntry(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ rowid, enable, filters }: { rowid: string; enable: boolean; filters: DictionaryFilters }) => {
      const row = (await fetchDictionary(id, filters)).rows.find((r) => r.rowid === rowid)
      if (!row?.toggleUrl) throw new Error('This entry can no longer be found.')
      await legacyAdminSend(row.toggleUrl, { method: 'GET' })
      if ((await fetchDictionary(id, filters)).rows.find((r) => r.rowid === rowid)?.active !== enable) throw new Error('The backend did not change this entry.')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

// The trashcan: the row's delete link only shows the confirmation box; the app's own dialog
// replaces it and this sends the confirmed request.
export function useDeleteDictionaryEntry(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ rowid, filters }: { rowid: string; filters: DictionaryFilters }) => {
      const row = (await fetchDictionary(id, filters)).rows.find((r) => r.rowid === rowid)
      if (!row?.deleteUrl) throw new Error('This entry can no longer be found.')
      await legacyAdminSend(dictConfirmDeleteUrl(row.deleteUrl), { method: 'GET' })
      if ((await fetchDictionary(id, filters)).rows.some((r) => r.rowid === rowid)) throw new Error('The backend did not delete this entry.')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}
