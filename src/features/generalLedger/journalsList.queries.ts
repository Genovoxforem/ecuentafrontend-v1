import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchLegacyDocument, looksLikeLegacyLoginPageText, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'
import { legacyAdminSend } from '../settings/legacyAdminRequest'
import { toastMessages } from './bindLines.queries'
import { JOURNAL_DATE_FILTERS, readJournalsList, type JournalsList } from './journalsListParser'

// accountancy/bookkeeping/list.php — see journalsListParser.ts for what the page does.
const PATH = '/accountancy/bookkeeping/list.php'
const KEY = ['generalLedger', 'journalsList'] as const

export interface JournalsRequest {
  // null = ask the page with no filter at all, which makes it apply the current fiscal year.
  filters: Record<string, string> | null
  limit: number | null
  // 0-based
  page: number
}

const DATE_FILTERS: readonly string[] = JOURNAL_DATE_FILTERS

// The page's own search parameters. Once a filter has been sent, `formfilteraction` tells the page
// the empty date fields are deliberate (otherwise it puts the fiscal year back).
export function journalsSearchParams(req: JournalsRequest): URLSearchParams {
  const params = new URLSearchParams()
  if (req.filters) {
    params.set('formfilteraction', 'list')
    for (const [name, value] of Object.entries(req.filters)) {
      if (!value) continue
      if (DATE_FILTERS.includes(name)) {
        const [y, m, d] = value.split('-').map(Number)
        if (y && m && d) {
          params.set(`${name}year`, String(y))
          params.set(`${name}month`, String(m))
          params.set(`${name}day`, String(d))
        }
      } else {
        params.set(name, value)
      }
    }
  }
  if (req.limit) params.set('limit', String(req.limit))
  if (req.page > 0) params.set('page', String(req.page))
  return params
}

const fetchJournals = async (req: JournalsRequest): Promise<JournalsList> => readJournalsList(await fetchLegacyDocument(PATH, journalsSearchParams(req)))

export function useJournalsList(req: JournalsRequest) {
  return useQuery({ queryKey: [...KEY, req], queryFn: () => fetchJournals(req), staleTime: 0, placeholderData: keepPreviousData })
}

// The "Include docs already exported" switch is a global setting (ACCOUNTING_REEXPORT): it changes
// which lines this list shows and whether an export may include lines exported before.
export function useToggleReexport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (enable: boolean): Promise<void> => {
      // The link's token comes from the page, so it is read right before the request.
      const current = await fetchJournals({ filters: null, limit: null, page: 0 })
      await legacyAdminSend(PATH, { method: 'GET' }, `?${new URLSearchParams({ action: 'setreexport', token: current.token, value: enable ? '1' : '0' })}`)
      const after = await fetchJournals({ filters: null, limit: null, page: 0 })
      if (after.reexport !== enable) throw new Error('The backend did not change the setting.')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

// Deletes every line of one transaction (the page's `delmouvconfirm`), then checks it is gone.
export function useDeleteTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (pieceNum: string): Promise<void> => {
      const current = await fetchJournals({ filters: null, limit: null, page: 0 })
      const body = new URLSearchParams({ token: current.token, action: 'delmouvconfirm', mvt_num: pieceNum, confirm: 'yes' })
      await legacyAdminSend(PATH, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() })
      const after = await fetchJournals({ filters: { search_mvt_num: pieceNum }, limit: null, page: 0 })
      if (after.rows.some((r) => r.pieceNum === pieceNum)) throw new Error(`Transaction ${pieceNum} was not deleted.`)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['generalLedger'] }),
  })
}

// The picker of shown columns is a per-user setting the page stores itself (`selectedfields`, saved
// by `formfilteraction=listafterchangingselectedfields`).
export function useSaveJournalColumns() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (keys: string[]): Promise<void> => {
      const current = await fetchJournals({ filters: null, limit: null, page: 0 })
      // The page writes the list with a trailing comma.
      const body = new URLSearchParams({ token: current.token, action: 'list', formfilteraction: 'listafterchangingselectedfields', selectedfields: keys.map((k) => `${k},`).join('') })
      await legacyAdminSend(PATH, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() })
      const after = await fetchJournals({ filters: null, limit: null, page: 0 })
      const shown = after.columns.filter((c) => c.visible).map((c) => c.key)
      if (shown.length !== keys.length || keys.some((k) => !shown.includes(k))) throw new Error('The backend did not save the column choice.')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

// The page's export (`action=export_file`): the backend answers with the file in the configured
// export format and marks every exported line as exported. Anything that is not a file is the page
// explaining a refusal.
export function useExportJournals() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (filters: Record<string, string>): Promise<string> => {
      const params = journalsSearchParams({ filters, limit: null, page: 0 })
      params.delete('formfilteraction')
      params.set('action', 'export_file')
      const res = await fetch(`${PATH}?${params}`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      if (/text\/html/i.test(res.headers.get('content-type') ?? '')) {
        const html = await res.text()
        if (looksLikeLegacyLoginPageText(html)) throw new Error(NOT_SIGNED_IN_MESSAGE)
        throw new Error(toastMessages(html).find((t) => t.type === 'error')?.message ?? 'The backend did not return an export file.')
      }
      const name = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(res.headers.get('content-disposition') ?? '')?.[1] ?? 'journals-export.csv'
      const url = URL.createObjectURL(await res.blob())
      const link = document.createElement('a')
      link.href = url
      link.download = decodeURIComponent(name)
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      return decodeURIComponent(name)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['generalLedger'] }),
  })
}
