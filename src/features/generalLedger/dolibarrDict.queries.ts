import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchLegacyText, looksLikeLegacyLoginPageText, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'
import { parseDictRows, type DictRow } from './dolibarrDictParser'

// See dolibarrDictParser.ts's own top comment for the shared template.
// Toggle/Delete call the exact link each row's own HTML carries (rowid +
// CSRF token, scraped fresh on every list load), following Dolibarr's
// dict.php action=enable/disable/delete-via-GET convention. Toggle/delete
// themselves are not verified against a live backend.
export function useDictList(path: string, enabled = true) {
  return useQuery({
    queryKey: ['generalLedger', 'dict', path],
    enabled,
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
