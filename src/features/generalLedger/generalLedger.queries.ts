import { useQuery } from '@tanstack/react-query'
import { parseJournalsDocument, looksLikeLegacyLoginPage, type LedgerReport, type LedgerAccountGroup, type JournalsReport } from './ledgerHtmlParser'

// Journals still has no REST API on this backend (only the old PHP-rendered
// list.php report page does) — that hook still scrapes it directly,
// same-origin, relying on the DOLSESSID cookie established by
// establishLegacySession at login time (see legacySession.ts), parsed via
// ledgerHtmlParser.ts.
//
// View by Account (useLedgerReport, below) is DIFFERENT: this session's
// audit of the General Ledger module found a real, complete, already-built
// JSON API sitting unused right next to the scraped page —
// accountancy/bookkeeping/listbyaccount_ajax_api.php. Confirmed by reading
// its PHP directly (real filtering/sorting/pagination, grouped-by-account
// output with subtotals and opening/period/closing balances, real per-line
// edit/delete URLs and permission flags) and live-tested (real fiscal year,
// real account groups, 112 real total records). Neither listbyaccount.php
// nor listbysubaccount.php actually calls this endpoint themselves — it was
// built and never wired into the legacy page's own UI. Replaced the scrape
// with this real API; see mapApiResponseToLedgerReport() below for the
// shape conversion (kept identical to the old HTML-parsed LedgerReport so
// LedgerModule.tsx needed zero changes).

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

interface RawLedgerApiEntry {
  id: number
  piece_num: string
  code_journal: string
  doc_date: string | null
  doc_ref: string
  label_operation: string
  currency_code: string
  currency_amo: number
  cur_montant: number
  debit: number
  credit: number
}
interface RawLedgerApiGroup {
  account_number: string
  account_label: string
  subtotal_debit: number
  subtotal_credit: number
  balance: number
  entries: RawLedgerApiEntry[]
}
interface RawLedgerApiResponse {
  summary: {
    period: { debit: number; credit: number }
    closing: { debit: number; credit: number; balance: number }
  }
  groups: RawLedgerApiGroup[]
  error?: string
}

function toMovement(debit: number, credit: number): { debit: number; credit: number; balance: number; balanceSide: 'Dr' | 'Cr' } {
  const balance = debit - credit
  return { debit, credit, balance: Math.abs(balance), balanceSide: balance >= 0 ? 'Dr' : 'Cr' }
}

function mapApiResponseToLedgerReport(data: RawLedgerApiResponse): LedgerReport {
  const groups: LedgerAccountGroup[] = data.groups.map((g) => {
    const balance = g.subtotal_debit - g.subtotal_credit
    return {
      accountCode: g.account_number,
      accountLabel: g.account_label,
      totalDebit: g.subtotal_debit,
      totalCredit: g.subtotal_credit,
      balance: Math.abs(balance),
      balanceSide: balance >= 0 ? 'Dr' : 'Cr',
      rows: g.entries.map((e) => ({
        transactionNum: e.piece_num,
        cardUrl: `/accountancy/bookkeeping/card.php?piece_num=${encodeURIComponent(e.piece_num)}`,
        journal: e.code_journal,
        date: e.doc_date ?? '',
        accountingDoc: e.doc_ref,
        label: e.label_operation,
        currencyCode: e.currency_code,
        // The real API doesn't expose a computed exchange-rate value (only
        // the HTML page's own text does) — left honestly blank rather than
        // guessed. cur_montant is the real foreign-currency original amount.
        conversionAmount: e.cur_montant ? String(e.cur_montant) : '',
        exchangeRate: '',
        debit: e.debit,
        credit: e.credit,
      })),
    }
  })
  return {
    groups,
    grandTotalDebit: data.summary.period.debit,
    grandTotalCredit: data.summary.period.credit,
    periodMovements: toMovement(data.summary.period.debit, data.summary.period.credit),
    closingBalance: toMovement(data.summary.closing.debit, data.summary.closing.credit),
  }
}

export function useLedgerReport(filters: LedgerFilters) {
  return useQuery({
    queryKey: ['generalLedger', 'byAccount', filters],
    queryFn: async (): Promise<LedgerReport> => {
      const params = buildParams(filters)
      params.set('limit', '200')
      const res = await fetch(`/accountancy/bookkeeping/listbyaccount_ajax_api.php?${params.toString()}`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const data: RawLedgerApiResponse = await res.json()
      if (data.error) throw new Error(data.error)
      return mapApiResponseToLedgerReport(data)
    },
    staleTime: 1000 * 30,
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
