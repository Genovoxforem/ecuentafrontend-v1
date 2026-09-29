import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchLegacyDocument } from '../../shared/legacyHtmlFetch'
import { legacyAdminSend } from './legacyAdminRequest'
import { parseDefaultValuesPage, type DefaultValuesPage } from './defaultValuesParser'

// Setup > Default values/filters/sorting — admin/defaultvalues.php, one page per mode.
// Reading is the page itself; every change is the request the page's own controls send,
// confirmed by reading the mode's page again (the backend answers each with the whole page).

const PATH = '/admin/defaultvalues.php'

export const DEFAULT_VALUE_MODES = ['createform', 'filters', 'sortorder', 'focus', 'mandatory'] as const
export type DefaultValueMode = (typeof DEFAULT_VALUE_MODES)[number]

const key = (mode: DefaultValueMode) => ['settings', 'defaultValues', mode] as const

const fetchPage = async (mode: DefaultValueMode): Promise<DefaultValuesPage> => parseDefaultValuesPage(await fetchLegacyDocument(`${PATH}?mode=${mode}`))

export function useDefaultValuesPage(mode: DefaultValueMode) {
  return useQuery({ queryKey: key(mode), queryFn: () => fetchPage(mode), staleTime: 1000 * 30 })
}

const send = (init: RequestInit, query = '') => legacyAdminSend(PATH, init, query)

// The page keeps the URL without its leading slash.
const storedUrl = (url: string) => url.trim().replace(/^\//, '')

// The switch: a GET link whose `value` is the state to switch to.
export function useToggleDefaultValues(mode: DefaultValueMode) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (enable: boolean) => {
      const current = await fetchPage(mode)
      await send({ method: 'GET' }, `?action=setMAIN_ENABLE_DEFAULT_VALUES&token=${encodeURIComponent(current.token)}&value=${enable ? 1 : 0}&mode=${mode}`)
      if ((await fetchPage(mode)).enabled !== enable) throw new Error('The backend did not change this setting.')
    },
    // The switch is global to every mode, so every mode's page is stale.
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['settings', 'defaultValues'] }),
  })
}

export interface DefaultValueInput {
  page: string
  field: string
  value: string
}

export function useAddDefaultValue(mode: DefaultValueMode) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: DefaultValueInput) => {
      const before = await fetchPage(mode)
      const body = new URLSearchParams({ token: before.token, mode, formfilteraction: 'list', action: 'list', defaulturl: input.page, defaultkey: input.field, add: 'Add' })
      if (before.hasValue) body.set('defaultvalue', input.value)
      await send({ method: 'POST', body })
      const known = new Set(before.rules.map((r) => r.rowId))
      const after = await fetchPage(mode)
      const saved = after.rules.some((r) => !known.has(r.rowId) && r.page === storedUrl(input.page) && r.field === input.field.trim())
      if (!saved) throw new Error('The backend did not add this rule.')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key(mode) }),
  })
}

// The pencil turns a row into inputs; "Modify" posts `urlpage`, `key`, `value` and the row id.
export function useUpdateDefaultValue(mode: DefaultValueMode) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ rowId, ...input }: DefaultValueInput & { rowId: string }) => {
      const before = await fetchPage(mode)
      const body = new URLSearchParams({ token: before.token, mode, rowid: rowId, urlpage: input.page, key: input.field, actionmodify: 'Modify' })
      if (before.hasValue) body.set('value', input.value)
      await send({ method: 'POST', body })
      const saved = (await fetchPage(mode)).rules.find((r) => r.rowId === rowId)
      if (!saved || saved.page !== input.page.trim() || saved.field !== input.field.trim()) throw new Error('The backend did not save this rule.')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key(mode) }),
  })
}

// The trashcan: a GET carrying a fresh token and the row's own entity, as the page's link does.
export function useDeleteDefaultValue(mode: DefaultValueMode) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ rowId, entity }: { rowId: string; entity: string }) => {
      const current = await fetchPage(mode)
      await send({ method: 'GET' }, `?rowid=${encodeURIComponent(rowId)}&entity=${encodeURIComponent(entity)}&mode=${mode}&action=delete&token=${encodeURIComponent(current.token)}`)
      if ((await fetchPage(mode)).rules.some((r) => r.rowId === rowId)) throw new Error('The backend did not delete this rule.')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key(mode) }),
  })
}
