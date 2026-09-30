import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchLegacyDocument } from '../../shared/legacyHtmlFetch'
import { legacyAdminSend } from './legacyAdminRequest'
import { parseWidgetsPage, type WidgetsPage } from './widgetsParser'

// Setup > Widgets — admin/boxes.php. Reading is the page itself; every change is the
// same request the page's own controls send, and is confirmed by reading the page
// again (the backend answers each with the whole page and no status).

const PATH = '/admin/boxes.php'
const KEY = ['settings', 'widgets'] as const

const fetchPage = async (): Promise<WidgetsPage> => parseWidgetsPage(await fetchLegacyDocument(PATH))

export function useWidgetsPage() {
  return useQuery({ queryKey: KEY, queryFn: fetchPage, staleTime: 1000 * 30 })
}

const send = (init: RequestInit, query = '') => legacyAdminSend(PATH, init, query)

// "Activate": one `boxid[<id>][pos]` (the page) + `boxid[<id>][value]` per widget picked.
export function useActivateWidgets() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (picks: { boxId: string; position: string; label: string }[]) => {
      const before = await fetchPage()
      const body = new URLSearchParams({ token: before.token, action: 'add' })
      for (const pick of picks) {
        body.set(`boxid[${pick.boxId}][pos]`, pick.position)
        body.set(`boxid[${pick.boxId}][value]`, pick.boxId)
      }
      await send({ method: 'POST', body })
      const after = await fetchPage()
      const activatedLabels = new Set(after.activated.map((w) => w.label))
      const missing = picks.filter((p) => !activatedLabels.has(p.label))
      if (missing.length > 0) throw new Error(`The backend did not activate: ${missing.map((m) => m.label).join(', ')}.`)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

// The trashcan: a GET carrying a fresh token, as the page's own link does.
export function useDisableWidget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (rowId: string) => {
      const current = await fetchPage()
      await send({ method: 'GET' }, `?rowid=${encodeURIComponent(rowId)}&action=delete&token=${encodeURIComponent(current.token)}`)
      if ((await fetchPage()).activated.some((w) => w.rowId === rowId)) throw new Error('The backend did not disable this widget.')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

// The up/down arrows swap the default order of two neighbouring widgets.
export function useMoveWidget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ fromRowId, toRowId }: { fromRowId: string; toRowId: string }) => {
      await send({ method: 'GET' }, `?action=switch&switchfrom=${encodeURIComponent(fromRowId)}&switchto=${encodeURIComponent(toRowId)}`)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

// The "Other" form: max lines per widget, and the file cache switch where the page has it.
export function useSaveWidgetSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ maxLines, fileCache }: { maxLines: string; fileCache: string | null }) => {
      const current = await fetchPage()
      const body = new URLSearchParams({ token: current.token, action: 'addconst', MAIN_BOXES_MAXLINES: maxLines, Button: 'Save' })
      if (fileCache !== null) body.set('MAIN_ACTIVATE_FILECACHE', fileCache)
      await send({ method: 'POST', body })
      const after = await fetchPage()
      if (after.maxLines !== maxLines) throw new Error('The backend did not save these settings.')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}
