import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import { fetchLegacyText, looksLikeLegacyLoginPageText, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'
import { toastMessages } from './bindLines.queries'
import { readAccountingFiles, stripPhpWarnings, type AccountingFilesPage } from './accountingFilesParser'

// compta/accounting-files.php — see accountingFilesParser.ts. Searching is read-only; the download
// is the page's own `dl` form and only builds a ZIP.
const PATH = '/compta/accounting-files.php'

export interface AccountingFilesSearch {
  // yyyy-mm-dd
  dateStart: string
  dateEnd: string
  // Names of the kinds of document to list (`selectinvoices`, …).
  kinds: string[]
}

export interface AccountingFilesResult extends AccountingFilesPage {
  // What the page said when it refused the search (no dates, no kind ticked).
  errors: string[]
}

// The period goes as day / month / year, so the last day counts to its end (a bare date would stop
// at its first second).
function dateParts(prefix: 'date_start' | 'date_stop', iso: string): [string, string][] {
  const [y, m, d] = iso.split('-').map(Number)
  return y && m && d ? [[`${prefix}day`, String(d)], [`${prefix}month`, String(m)], [`${prefix}year`, String(y)]] : []
}

export function accountingFilesParams(search: AccountingFilesSearch): URLSearchParams {
  const params = new URLSearchParams({ action: 'searchfiles' })
  for (const [k, v] of [...dateParts('date_start', search.dateStart), ...dateParts('date_stop', search.dateEnd)]) params.set(k, v)
  for (const kind of search.kinds) params.set(kind, '1')
  params.set('search', 'Search')
  return params
}

// `search` null loads the form alone (every kind ticked, as the page opens).
async function fetchAccountingFiles(search: AccountingFilesSearch | null): Promise<AccountingFilesResult> {
  const html = stripPhpWarnings(await fetchLegacyText(search ? `${PATH}?${accountingFilesParams(search)}` : PATH))
  const page = readAccountingFiles(new DOMParser().parseFromString(html, 'text/html'))
  return { ...page, errors: toastMessages(html).filter((t) => t.type === 'error').map((t) => t.message) }
}

export function useAccountingFiles(search: AccountingFilesSearch | null) {
  return useQuery({ queryKey: ['generalLedger', 'accountingFiles', search], queryFn: () => fetchAccountingFiles(search), staleTime: 0, placeholderData: keepPreviousData })
}

// Where the ZIP starts in a response body, -1 when there is none. A backend that prints PHP warnings
// before it sends its headers can no longer label the answer a ZIP: the warnings (HTML) come first
// and the archive follows them, still intact, so it is picked out by its "PK" signature.
export function findZipStart(bytes: Uint8Array): number {
  for (let i = 0; i + 3 < bytes.length; i++) {
    if (bytes[i] === 0x50 && bytes[i + 1] === 0x4b && bytes[i + 2] === 0x03 && bytes[i + 3] === 0x04) return i
  }
  return -1
}

// "Download Report": the `dl` form posted as it is (token, the period, the kinds), answered with a ZIP.
export function useDownloadAccountingFiles() {
  return useMutation({
    mutationFn: async ({ fields, search }: { fields: Record<string, string>; search: AccountingFilesSearch }): Promise<string> => {
      const body = new URLSearchParams(fields)
      // Same end-of-day period as the list that was searched.
      for (const [k, v] of [...dateParts('date_start', search.dateStart), ...dateParts('date_stop', search.dateEnd)]) body.set(k, v)
      const res = await fetch(`${PATH}?action=dl`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      let bytes = new Uint8Array(await res.arrayBuffer())
      if (!/zip/i.test(res.headers.get('content-type') ?? '')) {
        const start = findZipStart(bytes)
        if (start < 0) {
          const html = new TextDecoder().decode(bytes)
          if (looksLikeLegacyLoginPageText(html)) throw new Error(NOT_SIGNED_IN_MESSAGE)
          throw new Error(toastMessages(html).find((t) => t.type === 'error')?.message ?? 'The backend did not return a ZIP file. Nothing matched the search, or its ZIP support is off.')
        }
        bytes = bytes.subarray(start)
      }
      const fromHeader = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(res.headers.get('content-disposition') ?? '')?.[1]
      const name = fromHeader ? decodeURIComponent(fromHeader) : `${search.dateStart}-${search.dateEnd}_export.zip`
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/zip' }))
      const link = document.createElement('a')
      link.href = url
      link.download = name
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      return name
    },
  })
}
