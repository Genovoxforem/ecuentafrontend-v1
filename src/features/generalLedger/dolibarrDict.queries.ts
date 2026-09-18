import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchLegacyText, looksLikeLegacyLoginPageText, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'
import { parseDictRows, type DictRow } from './dolibarrDictParser'

// See dolibarrDictParser.ts's own top comment for how these pages were
// confirmed to share one real template. Toggle/Delete call the exact link
// each row's own HTML already carries (rowid + real CSRF token, scraped
// fresh on every list load) — not fabricated. Live execution of
// toggle/delete specifically wasn't exercised against 172.16.5.55 in this
// session (blocked by the safety classifier for repeated test mutations on
// that host after the first one); this follows Dolibarr's well-documented
// dict.php action=enable/disable/delete-via-GET convention, worth
// confirming once interactively in the running app.
export function useDictList(path: string) {
  return useQuery({
    queryKey: ['generalLedger', 'dict', path],
    queryFn: async (): Promise<DictRow[]> => {
      const html = await fetchLegacyText(path)
      return parseDictRows(html)
    },
  })
}

async function followDictLink(url: string): Promise<void> {
  const res = await fetch(url, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  const html = await res.text()
  if (looksLikeLegacyLoginPageText(html)) throw new Error(NOT_SIGNED_IN_MESSAGE)
}

export function useToggleDictStatus(path: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (url: string) => followDictLink(url),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['generalLedger', 'dict', path] }),
  })
}

export function useDeleteDictRow(path: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (url: string) => followDictLink(url),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['generalLedger', 'dict', path] }),
  })
}
