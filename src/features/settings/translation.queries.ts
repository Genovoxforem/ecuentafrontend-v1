import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fapiGet } from '../../api/fapiEnvelope'
import { fetchLegacyDocument } from '../../shared/legacyHtmlFetch'
import { legacyAdminSend } from './legacyAdminRequest'
import { parseTranslationOverwritesPage, type TranslationOverwritesPage, type TranslationSearchPage, type TranslationSearchRow } from './translationParser'

// Setup > Translation. Searching the language files and listing the overwritten strings are on admin/fapi/translation.php (below); overriding a string (add, edit, delete) and
// the switch still send the request of the classic admin/translation.php page's own controls (no fapi writer: AN-180), confirmed by reading the overwrite list again.

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

// admin/fapi/translation.php?mode=search&lang=&search=&limit=&page= (12 Nov 2026, key-authenticated): scans the .lang files of the installed language (core and modules) for a
// term in the key OR the value: {mode, lang, search, total_strings, total_matches, files [names], rows [[file, key, value]], matches [{file, key, value}], pagination {page, limit,
// total, pages}}. lang is required (422 without it) and so is the term (422 when empty), and the term is one, so:
//  - a blank language uses the instance default (core/fapi/languages.php default);
//  - Key and Current Translation String are two boxes on the classic page: the Key is sent as the term (else the String), and when both are filled the rows of the page are
//    narrowed to those whose string holds the String (the API takes one term: master report AN-180);
//  - with no term nothing is asked (the classic page lists every string; the API cannot): the tab asks for a term.
// A string that is overwritten carries its record (id, entity) from the overwrite list (translation.php without mode) and the original value is the one of the language file;
// the classic "Overwrite" link shows while the switch is on and the string is not overwritten.
interface FapiTranslationSearch {
  total_strings: number
  total_matches: number
  files: string[]
  rows: Array<[string, string, string]>
}

async function defaultLanguage(): Promise<string> {
  const d = await fapiGet<{ default?: string }>('/core/fapi/languages.php')
  return d.default || 'en_US'
}

async function loadOverwritesApi() {
  const d = await fapiGet<{ overwrite_enabled: boolean; overrides: { items: Row[] } }>('/admin/fapi/translation.php', { limit: 1000 })
  return {
    enabled: !!d.overwrite_enabled,
    rows: d.overrides.items.map((r) => ({ rowId: str(r, 'id', 'rowid'), language: str(r, 'langcode', 'language', 'lang'), key: str(r, 'transkey', 'key'), value: str(r, 'transvalue', 'value', 'translation'), entity: str(r, 'entity') })),
  }
}

async function searchTranslationsApi(params: TranslationSearchParams): Promise<TranslationSearchPage> {
  const term = params.key || params.value
  const base = { token: '', enabled: false, currentLanguage: '', languageOptions: [], matches: 0, totalStrings: 0, files: 0, rows: [] as TranslationSearchRow[] }
  if (!term) return { ...base, noTerm: true }
  const language = params.language || (await defaultLanguage())
  const [d, over] = await Promise.all([
    fapiGet<FapiTranslationSearch>('/admin/fapi/translation.php', { mode: 'search', lang: language, search: term, limit: TRANSLATION_PAGE_SIZE, page: params.page + 1 }),
    loadOverwritesApi(),
  ])
  const overwritten = new Map(over.rows.map((r) => [`${r.language}:${r.key}`, r]))
  const narrowed = params.key && params.value ? d.rows.filter(([, , value]) => value.toLowerCase().includes(params.value.toLowerCase())) : d.rows
  const rows: TranslationSearchRow[] = narrowed.map(([, key, value]) => {
    const rule = overwritten.get(`${language}:${key}`)
    return {
      language,
      key,
      value: rule ? rule.value : value,
      overwriteId: rule ? rule.rowId : null,
      overwriteEntity: rule ? rule.entity : '',
      originalValue: rule ? value : null,
      canOverwrite: over.enabled && !rule,
    }
  })
  return { ...base, enabled: over.enabled, matches: d.total_matches, totalStrings: d.total_strings, files: d.files.length, rows }
}

export function useTranslationSearch(params: TranslationSearchParams) {
  return useQuery({
    queryKey: [...KEY, 'search', params],
    queryFn: () => searchTranslationsApi(params),
    staleTime: 1000 * 30,
    placeholderData: keepPreviousData,
    retry: false,
  })
}

// admin/fapi/translation.php (13 Nov 2026, #406, key-authenticated, read-only): {overwrite_enabled, languages [{code, label}] (98), overrides {items, pagination}}
// (llx_overwrite_trans). The user's own language is only printed by the classic page and is read from it when the classic session is there ('' otherwise). newecuenta has no overwritten string, so the
// row fields are read under the names of the classic columns (id, langcode / language, transkey / key, transval / value, entity) and not seen.
type Row = Record<string, unknown>
const str = (r: Row, ...keys: string[]) => String(keys.map((k) => r[k]).find((v) => v !== undefined && v !== null) ?? '')

async function fetchOverwritesApi(): Promise<TranslationOverwritesPage> {
  const d = await fapiGet<{ overwrite_enabled: boolean; languages: Array<{ code: string; label: string }>; overrides: { items: Row[] } }>('/admin/fapi/translation.php', { limit: 1000 })
  const currentLanguage = await fetchOverwrites()
    .then((p) => p.currentLanguage)
    .catch(() => '')
  return {
    token: '',
    enabled: d.overwrite_enabled,
    currentLanguage,
    languageOptions: d.languages.map((l) => ({ value: l.code, label: l.label })),
    rows: d.overrides.items.map((r) => ({
      rowId: str(r, 'id', 'rowid'),
      language: str(r, 'langcode', 'language', 'lang'),
      key: str(r, 'transkey', 'key'),
      value: str(r, 'transvalue', 'value', 'translation'),
      entity: str(r, 'entity'),
    })),
  }
}

export function useTranslationOverwrites() {
  return useQuery({ queryKey: [...KEY, 'overwrites'], queryFn: fetchOverwritesApi, staleTime: 1000 * 30 })
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
