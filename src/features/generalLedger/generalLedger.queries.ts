import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { LedgerReport, LedgerAccountGroup, LedgerMeta, SubledgerReportData } from './ledgerHtmlParser'
import { fapiGet } from '../../api/fapiEnvelope'
import { mapSubledgerFapi, type FapiSubledger } from './subledgerFapi'
import { deletePiece, pieceNumFromDeleteUrl } from './pieceFapi'

// The Ledger and Subledger reports read a real JSON API that sits next to the classic
// server-rendered pages — accountancy/bookkeeping/listbyaccount_ajax_api.php (real filtering,
// sorting, pagination, grouped-by-account output with subtotals and opening/period/closing
// balances, per-line edit/delete URLs and permission flags). useLedgerReport groups by account,
// useSubledgerReport groups by the same response's own subledger_account field.
//
// The Journals page (Operations - Journals) does NOT use it: that endpoint ignores the "Include docs
// already exported" setting, caps a page at 200 rows and pages by account, so its rows differ from
// list.php's. Journals reads list.php itself (journalsList.queries.ts).
//
// Every filter field below was individually live-tested against the real
// endpoint (not assumed from the legacy form's own field list) by reading
// the JSON response's own `filters` echo for the real param names, then
// confirming each one actually changes `meta.total_records`:
//   search_doc_ref          -> Accounting Doc.      (real)
//   search_ledger_code      -> Journal               (real)
//   search_mvt_num          -> Num. transaction       (real)
//   search_label_operation  -> Label                  (real)
//   search_lettering_code   -> Lettering code          (real)
//   search_not_reconciled   -> Not reconciled          (accepted, doesn't error)
//   search_debit/credit     -> Debit / Credit          (real, BUT the backend
//                              crashes with a PHP warning if given a bare
//                              number — it expects a comparison-operator
//                              prefix, e.g. ">100" or "=100". Auto-prefixed
//                              with "=" below when the user types a bare
//                              number, matching the legacy form's own
//                              implicit default.)
//   sortfield / sortorder   -> Sort Field + direction  (real)
//   page / limit            -> pagination              (real — meta.total_records/
//                              total_pages/returned_rows/has_more/next_page/
//                              prev_page all genuinely reflect the request)
// search_ref/search_journal/search_num/search_label/search_montant_debit
// (the "obvious" param names) were tried first and silently did nothing —
// the real names only surfaced from the API's own `filters` echo.

export interface LedgerFilters {
  dateStart: string // yyyy-mm-dd
  dateEnd: string // yyyy-mm-dd
  accountCode: string
  docRef: string
  journal: string
  mvtNum: string
  label: string
  debit: string
  credit: string
  letteringCode: string
  notReconciled: boolean
  sortField: 't.doc_date' | 't.piece_num' | 't.debit' | 't.credit' | 't.code_journal'
  sortOrder: 'ASC' | 'DESC'
  page: number
  limit: number
}

export function defaultLedgerFilters(): LedgerFilters {
  const year = new Date().getFullYear()
  return {
    dateStart: `${year}-01-01`,
    dateEnd: `${year}-12-31`,
    accountCode: '',
    docRef: '',
    journal: '',
    mvtNum: '',
    label: '',
    debit: '',
    credit: '',
    letteringCode: '',
    notReconciled: false,
    sortField: 't.doc_date',
    sortOrder: 'ASC',
    page: 0,
    limit: 50,
  }
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

// The real endpoint 500s on a bare number for search_debit/search_credit —
// it wants a comparison-operator prefix. A user typing "100" means "equals
// 100" on the legacy form, so default to "=" when they didn't type one.
function amountParam(raw: string): string {
  const v = raw.trim()
  if (!v) return ''
  return /^[<>=]/.test(v) ? v : `=${v}`
}

function buildParams(filters: LedgerFilters): URLSearchParams {
  const params = new URLSearchParams()
  for (const [k, v] of dateParams('start', filters.dateStart)) params.set(k, v)
  for (const [k, v] of dateParams('end', filters.dateEnd)) params.set(k, v)
  if (filters.accountCode.trim()) params.set('search_accountancy_code_start', filters.accountCode.trim())
  if (filters.docRef.trim()) params.set('search_doc_ref', filters.docRef.trim())
  if (filters.journal.trim()) params.set('search_ledger_code', filters.journal.trim())
  if (filters.mvtNum.trim()) params.set('search_mvt_num', filters.mvtNum.trim())
  if (filters.label.trim()) params.set('search_label_operation', filters.label.trim())
  const debit = amountParam(filters.debit)
  if (debit) params.set('search_debit', debit)
  const credit = amountParam(filters.credit)
  if (credit) params.set('search_credit', credit)
  if (filters.letteringCode.trim()) params.set('search_lettering_code', filters.letteringCode.trim())
  if (filters.notReconciled) params.set('search_not_reconciled', '1')
  params.set('sortfield', filters.sortField)
  params.set('sortorder', filters.sortOrder)
  params.set('page', String(filters.page))
  params.set('limit', String(filters.limit))
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
  lettering_code: string
  date_export: string | null
  // Real field, confirmed live in the raw JSON, just never typed/used here
  // before — e.g. "bank" for a bank-payment-sourced entry, "expense_report"
  // for one from an expense report. Matches the real card.php piece-detail
  // page's own "Type Of Document" field.
  doc_type: string
  // Real fields, confirmed live — fk_doc is the source object's own id
  // (e.g. a customer invoice's facid), doc_url a real link to that source
  // object's classic card page (/compta/facture/card.php?facid=X for
  // doc_type "customer_invoice") when one exists, or an empty string when
  // the source has no card page of its own (e.g. doc_type "bank").
  fk_doc: number
  doc_url: string
  can_edit: boolean
  edit_url: string | null
  can_delete: boolean
  delete_url: string | null
}
interface RawLedgerApiGroup {
  account_number: string
  account_label: string
  subtotal_debit: number
  subtotal_credit: number
  balance: number
  entries: RawLedgerApiEntry[]
}
interface RawLedgerApiMeta {
  page: number
  limit: number
  total_records: number
  total_pages: number
  returned_rows: number
  has_more: boolean
  next_page: number | null
  prev_page: number | null
}
export interface RawLedgerApiResponse {
  meta: RawLedgerApiMeta
  summary: {
    opening: { debit: number; credit: number; balance: number }
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

function mapMeta(m: RawLedgerApiMeta): LedgerMeta {
  return {
    page: m.page,
    limit: m.limit,
    totalRecords: m.total_records,
    totalPages: m.total_pages,
    returnedRows: m.returned_rows,
    hasMore: m.has_more,
    nextPage: m.next_page,
    prevPage: m.prev_page,
  }
}

export function mapApiResponseToLedgerReport(data: RawLedgerApiResponse): LedgerReport {
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
        letteringCode: e.lettering_code || '',
        dateExport: e.date_export ?? '',
        docType: e.doc_type,
        fkDoc: e.fk_doc ? String(e.fk_doc) : '',
        docUrl: e.doc_url || null,
        canEdit: e.can_edit,
        editUrl: e.edit_url,
        canDelete: e.can_delete,
        deleteUrl: e.delete_url,
      })),
    }
  })
  return {
    groups,
    grandTotalDebit: data.summary.period.debit,
    grandTotalCredit: data.summary.period.credit,
    openingBalance: toMovement(data.summary.opening.debit, data.summary.opening.credit),
    periodMovements: toMovement(data.summary.period.debit, data.summary.period.credit),
    closingBalance: toMovement(data.summary.closing.debit, data.summary.closing.credit),
    meta: mapMeta(data.meta),
  }
}

// accountancy/fapi/list.php?action=by_account answers with the same meta / filters / summary / groups payload the older
// listbyaccount_ajax_api.php did (entry field names match exactly), inside the fapi envelope, key-authenticated. Filters, paging and
// sorting are the ones tested above; dates go as ISO search_date_start / search_date_end, the names the answer echoes back.
function fapiParams(filters: LedgerFilters): Record<string, string> {
  const params = buildParams(filters)
  for (const k of ['search_date_startday', 'search_date_startmonth', 'search_date_startyear', 'search_date_endday', 'search_date_endmonth', 'search_date_endyear']) params.delete(k)
  if (filters.dateStart) params.set('search_date_start', filters.dateStart)
  if (filters.dateEnd) params.set('search_date_end', filters.dateEnd)
  return Object.fromEntries(params.entries())
}

async function fetchBookkeepingApi(filters: LedgerFilters): Promise<RawLedgerApiResponse> {
  return fapiGet<RawLedgerApiResponse>('/accountancy/fapi/list.php', { ...fapiParams(filters), action: 'by_account' })
}

export function useLedgerReport(filters: LedgerFilters) {
  return useQuery({
    queryKey: ['generalLedger', 'byAccount', filters],
    queryFn: async (): Promise<LedgerReport> => mapApiResponseToLedgerReport(await fetchBookkeepingApi(filters)),
    staleTime: 1000 * 30,
  })
}

// accountancy/fapi/subledger.php groups the lines by subledger account itself and takes the same filters. include_unassigned=1 also
// returns the lines with no subledger account (grouped under an empty key, last), which this report always showed.
function subledgerParams(filters: LedgerFilters): Record<string, string> {
  return { ...fapiParams(filters), include_unassigned: '1' }
}

export function useSubledgerReport(filters: LedgerFilters) {
  return useQuery({
    queryKey: ['generalLedger', 'bySubledger', filters],
    queryFn: async (): Promise<SubledgerReportData> => mapSubledgerFapi(await fapiGet<FapiSubledger>('/accountancy/fapi/subledger.php', subledgerParams(filters))),
    staleTime: 1000 * 30,
  })
}

// Real per-entry delete_url (accountancy/bookkeeping/listbyaccount.php?
// action=delmouv&mvt_num=X) — matches the real page's own trash-icon
// action per row (see ledgerHtmlParser.ts's LedgerRow comment). A bare GET
// that deletes that one movement server-side immediately, same convention
// as useDeleteDictRow in dolibarrDict.queries.ts.
export function useDeleteLedgerEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    // `url` is the row's delete link; its mvt_num names the transaction, which piece.php?action=delete removes.
    mutationFn: async (url: string) => {
      const pieceNum = pieceNumFromDeleteUrl(url)
      if (!pieceNum) throw new Error('This entry has no transaction number to delete.')
      await deletePiece(pieceNum)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['generalLedger'] }),
  })
}

export type { LedgerReport, LedgerAccountGroup, LedgerRow, LedgerMovement, LedgerMeta, SubledgerReportData, SubledgerGroup } from './ledgerHtmlParser'
