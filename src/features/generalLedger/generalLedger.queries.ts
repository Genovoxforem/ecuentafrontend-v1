import { useQuery } from '@tanstack/react-query'
import type { LedgerReport, LedgerAccountGroup, JournalsReport, JournalRow } from './ledgerHtmlParser'

// This session's audit of the General Ledger module found a real, complete,
// already-built JSON API sitting unused right next to the classic
// server-rendered report pages — accountancy/bookkeeping/listbyaccount_ajax_api.php.
// Confirmed by reading its PHP directly (real filtering/sorting/pagination,
// grouped-by-account output with subtotals and opening/period/closing
// balances, real per-line edit/delete URLs and permission flags) and
// live-tested (real fiscal year, real account groups, 112 real total
// records). Neither listbyaccount.php, listbysubaccount.php, nor list.php
// (Journals) actually calls this endpoint themselves — it was built and
// never wired into any legacy page's own UI. Both hooks below share it:
// useLedgerReport groups its response by account (mapApiResponseToLedgerReport);
// useJournalsReport flattens the same real entries and re-sorts them by
// date/piece instead (mapApiResponseToJournalsReport) — this used to scrape
// list.php's HTML with DOMParser (see ledgerHtmlParser.ts's now-unused
// parseJournalsDocument/looksLikeLegacyLoginPage), which violated this
// project's "no HTML-scraping, real API data only" rule; replaced once this
// real endpoint was found to carry everything Journals needs
// (code_journal/doc_date/doc_ref/label_operation/debit/credit per entry).

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

interface RawLedgerApiEntry {
  id: number
  piece_num: string
  piece_url: string
  code_journal: string
  doc_date: string | null
  doc_ref: string
  subledger_account: string
  label_operation: string
  currency_code: string
  currency_amo: number
  cur_montant: number
  debit: number
  credit: number
  date_export: string | null
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
        cardUrl: e.piece_url,
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

function mapApiResponseToJournalsReport(data: RawLedgerApiResponse): JournalsReport {
  const rows: JournalRow[] = data.groups
    .flatMap((g) =>
      g.entries.map(
        (e): JournalRow => ({
          transactionNum: e.piece_num,
          cardUrl: e.piece_url,
          journal: e.code_journal,
          date: e.doc_date ?? '',
          accountingDoc: e.doc_ref,
          accountCode: g.account_number,
          subledgerAccount: e.subledger_account,
          label: e.label_operation,
          debit: e.debit,
          credit: e.credit,
          dateExport: e.date_export ?? '',
        }),
      ),
    )
    // The API groups by account for the Ledger view; Journals wants the
    // same real entries in chronological/piece order instead.
    .sort((a, b) => a.date.localeCompare(b.date) || a.transactionNum.localeCompare(b.transactionNum))
  return { rows, totalDebit: data.summary.period.debit, totalCredit: data.summary.period.credit }
}

async function fetchBookkeepingApi(filters: LedgerFilters, limit = 200): Promise<RawLedgerApiResponse> {
  const params = buildParams(filters)
  params.set('limit', String(limit))
  const res = await fetch(`/accountancy/bookkeeping/listbyaccount_ajax_api.php?${params.toString()}`, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  const data: RawLedgerApiResponse = await res.json()
  if (data.error) throw new Error(data.error)
  return data
}

export function useLedgerReport(filters: LedgerFilters) {
  return useQuery({
    queryKey: ['generalLedger', 'byAccount', filters],
    queryFn: async (): Promise<LedgerReport> => mapApiResponseToLedgerReport(await fetchBookkeepingApi(filters)),
    staleTime: 1000 * 30,
  })
}

export function useJournalsReport(filters: LedgerFilters) {
  return useQuery({
    queryKey: ['generalLedger', 'journals', filters],
    queryFn: async (): Promise<JournalsReport> => mapApiResponseToJournalsReport(await fetchBookkeepingApi(filters)),
    staleTime: 1000 * 30,
  })
}

export interface PieceLine {
  accountCode: string
  accountLabel: string
  subledgerAccount: string
  journal: string
  date: string
  accountingDoc: string
  label: string
  debit: number
  credit: number
}

// Every journal-entry row's real `piece_url` (Ledger/Journals' "view
// source" link) points at the exact same generic accountancy/bookkeeping/
// card.php?piece_num=X — not a per-object link into the invoice/order/bank
// entry that generated it, confirmed live (sampled real entries across
// every journal code present on this instance: OD/BQ/ER all resolved to
// that one URL shape). That page is classic HTML with no JSON of its own,
// but every real field it would show (account/label/journal/date/debit/
// credit per line of the balanced entry) is already sitting in the same
// listbyaccount_ajax_api.php response Ledger/Journals already fetch — so
// this refetches that same real endpoint over a wide date range and
// filters client-side to the one piece, rather than linking out to the
// classic page or scraping it.
export function usePieceDetail(pieceNum: string | undefined) {
  return useQuery({
    queryKey: ['generalLedger', 'piece', pieceNum],
    queryFn: async (): Promise<PieceLine[]> => {
      const data = await fetchBookkeepingApi({ dateStart: '2000-01-01', dateEnd: '2100-12-31', accountCode: '' }, 5000)
      const lines: PieceLine[] = []
      for (const g of data.groups) {
        for (const e of g.entries) {
          if (e.piece_num === pieceNum) {
            lines.push({
              accountCode: g.account_number,
              accountLabel: g.account_label,
              subledgerAccount: e.subledger_account,
              journal: e.code_journal,
              date: e.doc_date ?? '',
              accountingDoc: e.doc_ref,
              label: e.label_operation,
              debit: e.debit,
              credit: e.credit,
            })
          }
        }
      }
      return lines
    },
    enabled: !!pieceNum,
    staleTime: 1000 * 30,
  })
}

export type { LedgerReport, LedgerAccountGroup, LedgerRow, LedgerMovement, JournalsReport, JournalRow } from './ledgerHtmlParser'
