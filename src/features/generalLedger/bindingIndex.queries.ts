import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchLegacyDocument } from '../../shared/legacyHtmlFetch'
import { legacyAdminSend } from '../settings/legacyAdminRequest'
import { toastMessages } from './bindLines.queries'
import { readBindingIndex } from './bindingIndexParser'

// accountancy/{customer,supplier,expensereport}/index.php — see bindingIndexParser.ts.
export function useBindingIndex(path: string, year: number) {
  return useQuery({
    queryKey: ['generalLedger', 'bindingIndex', path, year],
    queryFn: async () => readBindingIndex(await fetchLegacyDocument(path, new URLSearchParams({ year: String(year) }))),
    staleTime: 0,
    placeholderData: keepPreviousData,
  })
}

// "Bind Automatically": the page's own link (`action=validatehistory`, with the page's token),
// taken from the freshly read page. The backend binds every line whose product has an accounting
// account and answers with the same page and a message; that message is what is reported.
export function useBindAutomatically(path: string, year: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (): Promise<string> => {
      const page = readBindingIndex(await fetchLegacyDocument(path, new URLSearchParams({ year: String(year) })))
      const href = page.sections.find((s) => s.action)?.action?.href
      if (!href) throw new Error('You are not allowed to bind automatically.')
      const html = await legacyAdminSend(href, { method: 'GET' })
      return toastMessages(html)
        .map((m) => m.message)
        .join('\n')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['generalLedger'] }),
  })
}
