import { useQuery } from '@tanstack/react-query'
import { parseLedgerDocument, parseJournalsDocument, looksLikeLegacyLoginPage, type LedgerReport, type JournalsReport } from './ledgerHtmlParser'

// No REST API exists for accounting/bookkeeping data on this app's backend
// (only the old PHP-rendered Ledger/Journals report pages do) — so these
// hooks fetch those pages directly, same-origin, relying on the DOLSESSID
// cookie established by establishLegacySession at login time (see
// legacySession.ts), and parse the returned HTML client-side via
// ledgerHtmlParser.ts. See that file's header comment for how the selectors
// were derived (verified against real fetched HTML, not guessed).

export interface LedgerFilters {
  dateStart: string // yyyy-mm-dd
  dateEnd: string // yyyy-mm-dd
  accountCode: string
}

export function defaultLedgerFilters(): LedgerFilters {
  const year = new Date().getFullYear()
  return { dateStart: `${year}-01-01`, dateEnd: `${year}-12-31`, accountCode: '' }
}

function dateParams(prefix: 'start' | 'end', iso: string): [string, string][] {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return []
  return [
    [`search_date_${prefix}day`, String(d)],
    [`search_date_${prefix}month`, String(m)],
    [`search_date_${prefix}year`, String(y)],
  ]
}

function buildParams(filters: LedgerFilters): URLSearchParams {
  const params = new URLSearchParams()
  for (const [k, v] of dateParams('start', filters.dateStart)) params.set(k, v)
  for (const [k, v] of dateParams('end', filters.dateEnd)) params.set(k, v)
  if (filters.accountCode.trim()) params.set('search_accountancy_code_start', filters.accountCode.trim())
  return params
}

const NOT_SIGNED_IN_MESSAGE =
  'Not signed into the legacy accounting backend. This report has no REST API and reads the real Dolibarr page directly — log out and back in to refresh that session, then retry.'

async function fetchLegacyDoc(path: string, params: URLSearchParams): Promise<Document> {
  const res = await fetch(`${path}?${params.toString()}`, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`Legacy accounting backend returned ${res.status}.`)
  const html = await res.text()
  const doc = new DOMParser().parseFromString(html, 'text/html')
  if (looksLikeLegacyLoginPage(doc)) throw new Error(NOT_SIGNED_IN_MESSAGE)
  return doc
}

export function useLedgerReport(filters: LedgerFilters) {
  return useQuery({
    queryKey: ['generalLedger', 'byAccount', filters],
    queryFn: async (): Promise<LedgerReport> => {
      const doc = await fetchLegacyDoc('/accountancy/bookkeeping/listbyaccount.php', buildParams(filters))
      return parseLedgerDocument(doc)
    },
    staleTime: 1000 * 30,
    retry: false,
  })
}

export function useJournalsReport(filters: LedgerFilters) {
  return useQuery({
    queryKey: ['generalLedger', 'journals', filters],
    queryFn: async (): Promise<JournalsReport> => {
      const doc = await fetchLegacyDoc('/accountancy/bookkeeping/list.php', buildParams(filters))
      return parseJournalsDocument(doc)
    },
    staleTime: 1000 * 30,
    retry: false,
  })
}

export type { LedgerReport, LedgerAccountGroup, LedgerRow, LedgerMovement, JournalsReport, JournalRow } from './ledgerHtmlParser'
