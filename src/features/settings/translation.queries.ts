import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchLegacyDocument } from '../../shared/legacyHtmlFetch'
import { legacyAdminSend } from './legacyAdminRequest'
import { parseTranslationOverwritesPage, parseTranslationSearchPage, type TranslationOverwritesPage, type TranslationSearchPage } from './translationParser'

// Setup > Translation — admin/translation.php. Searching reads the backend's own language
// files (one page of matches per request); overriding a string adds a record to its
// overwrite table. Every write is the request the page's own controls send, confirmed by
// reading the overwrite list again (the backend answers each with the whole page).

const PATH = '/admin/translation.php'
const KEY = ['settings', 'translation'] as const

export const TRANSLATION_PAGE_SIZE = 25

export interface TranslationSearchParams {
  language: string
  key: string
  value: string
  page: number
}

const fetchOverwrites = async (): Promise<TranslationOverwritesPage> => parseTranslationOverwritesPage(await fetchLegacyDocument(`${PATH}?mode=overwrite`))

export function useTranslationSearch(params: TranslationSearchParams) {
  return useQuery({
    queryKey: [...KEY, 'search', params],
    queryFn: async (): Promise<TranslationSearchPage> => {
      const query = new URLSearchParams({ mode: 'searchkey', action: 'search', transkey: params.key, transvalue: params.value, limit: String(TRANSLATION_PAGE_SIZE), page: String(params.page) })
      if (params.language) query.set('langcode', params.language)
      return parseTranslationSearchPage(await fetchLegacyDocument(`${PATH}?${query.toString()}`))
    },
    staleTime: 1000 * 30,
    placeholderData: keepPreviousData,
  })
}

export function useTranslationOverwrites() {
  return useQuery({ queryKey: [...KEY, 'overwrites'], queryFn: fetchOverwrites, staleTime: 1000 * 30 })
}

// The switch: a GET link whose `value` is the state to switch to.
export function useToggleTranslationOverwrite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (enable: boolean) => {
      const current = await fetchOverwrites()
      await legacyAdminSend(PATH, { method: 'GET' }, `?action=setMAIN_ENABLE_OVERWRITE_TRANSLATION&token=${encodeURIComponent(current.token)}&value=${enable ? 1 : 0}&mode=overwrite`)
      if ((await fetchOverwrites()).enabled !== enable) throw new Error('The backend did not change this setting.')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

export interface OverrideInput {
  language: string
  key: string
  value: string
}

export function useAddTranslationOverride() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: OverrideInput) => {
      const before = await fetchOverwrites()
      if (before.rows.some((r) => r.language === input.language && r.key === input.key.trim())) throw new Error('An overwritten string already exists for this language and key.')
      const body = new URLSearchParams({ token: before.token, formfilteraction: 'list', mode: 'overwrite', action: 'add', langcode: input.language, transkey: input.key, transvalue: input.value, add: 'Add' })
      await legacyAdminSend(PATH, { method: 'POST', body })
      if (!(await fetchOverwrites()).rows.some((r) => r.language === input.language && r.key === input.key.trim())) throw new Error('The backend did not add this overwritten string.')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

// The pencil's "Save": posts the new string for the record.
export function useUpdateTranslationOverride() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ rowId, value }: { rowId: string; value: string }) => {
      const before = await fetchOverwrites()
      const body = new URLSearchParams({ token: before.token, formfilteraction: 'list', mode: 'overwrite', action: 'update', rowid: rowId, transvalue: value, save: 'Save' })
      await legacyAdminSend(PATH, { method: 'POST', body })
      if ((await fetchOverwrites()).rows.find((r) => r.rowId === rowId)?.value !== value.trim()) throw new Error('The backend did not save this string.')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

// The trashcan: a GET carrying a fresh token and the record's own entity.
export function useDeleteTranslationOverride() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ rowId, entity }: { rowId: string; entity: string }) => {
      const current = await fetchOverwrites()
      await legacyAdminSend(PATH, { method: 'GET' }, `?rowid=${encodeURIComponent(rowId)}&entity=${encodeURIComponent(entity || '1')}&mode=overwrite&action=delete&token=${encodeURIComponent(current.token)}`)
      if ((await fetchOverwrites()).rows.some((r) => r.rowId === rowId)) throw new Error('The backend did not delete this overwritten string.')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}
