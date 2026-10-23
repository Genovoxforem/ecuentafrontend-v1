import { fapi } from '../../api/axios'
import { fapiGet, fapiPost } from '../../api/fapiEnvelope'
import { formatMoney } from '../../utils/format'
import { loadBindableAccounts } from './bindingFapi'
import type { JournalCell, JournalColumn, JournalRow, JournalsList } from './journalsListParser'
import type { JournalsRequest } from './journalsList.queries'

// The ledger list on accountancy/fapi/list.php (one row per ledger line) with its per-user column picker (action=columns) and export
// (action=export), 22-23 Oct 2026. The list and the columns answers were captured from newecuenta on 23 Oct 2026
// (tests/fixtures/accountancy-ledger-list.json, accountancy-list-columns.json). Filters checked live: the date range, journal, document,
// account range, subledger range (search_accountancy_aux_code_start / _end), label (search_mvt_label is accepted for search_label_operation),
// debit, credit and transaction number all narrow the list; the creation, modification and export date ranges and "not reconciled" do not
// (BUG-23), so the page no longer offers them.

export interface FapiLedgerLine {
  id: number
  piece_num: string
  piece_url: string
  code_journal: string
  doc_date: string | null
  doc_ref: string
  doc_url: string
  numero_compte: string
  subledger_account: string
  label_operation: string
  debit: number
  credit: number
  date_creation: string | null
  date_modification: string | null
  date_export: string | null
  can_edit: boolean
  can_delete: boolean
}
export interface FapiLedgerList {
  items: FapiLedgerLine[]
  pagination: { page: number; limit: number; total: number; pages: number }
  totals: { debit: number; credit: number; balance: number }
  filters: Record<string, string | null>
}
export interface FapiListColumns {
  available: Array<{ key: string; label: string; selected: boolean }>
  selected: string[]
}

const LIMITS = [10, 25, 50, 100, 200]
const REEXPORT_KEY = 'ecuenta:ledger-journals:include-exported'

// "Include docs already exported": the endpoint hides exported lines unless include_exported=1 is sent, so the choice is kept by the app.
export const readReexport = (): boolean => {
  try {
    return localStorage.getItem(REEXPORT_KEY) === '1'
  } catch {
    return false
  }
}
export const writeReexport = (on: boolean) => {
  try {
    localStorage.setItem(REEXPORT_KEY, on ? '1' : '0')
  } catch {
    /* the choice just does not persist */
  }
}

const day = (iso: string | null) => (iso ? iso.slice(0, 10) : '')

// The page's own filter names -> the endpoint's. Dates are ISO already; an emptied date range turns the fiscal-year default off.
export function listParams(req: JournalsRequest): Record<string, string | number | undefined> {
  const f = req.filters
  const params: Record<string, string | number | undefined> = { limit: req.limit ?? 25, page: req.page }
  if (readReexport()) params.include_exported = 1
  if (!f) return params
  const take = (name: string, to = name) => {
    if (f[name]) params[to] = f[name]
  }
  take('search_date_start')
  take('search_date_end')
  for (const n of ['search_mvt_num', 'search_ledger_code', 'search_doc_ref', 'search_accountancy_code_start', 'search_accountancy_code_end', 'search_accountancy_aux_code_start', 'search_accountancy_aux_code_end', 'search_debit', 'search_credit', 'search_lettering_code']) take(n)
  take('search_mvt_label', 'search_label_operation')
  if (!f.search_date_start && !f.search_date_end) params.nofiscalyear = 1
  return params
}

const text = (t: string): JournalCell => ({ text: t, href: null })

export function mapLedgerList(d: FapiLedgerList, cols: FapiListColumns, accounts: Array<{ value: string; label: string }>): JournalsList {
  const columns: JournalColumn[] = cols.available.map((c) => ({ key: c.key, label: c.label, visible: cols.selected.includes(c.key) }))
  const visible = columns.filter((c) => c.visible)
  const cell = (key: string, l: FapiLedgerLine): JournalCell => {
    switch (key) {
      case 't.piece_num': return { text: l.piece_num, href: l.piece_url || null }
      case 't.code_journal': return text(l.code_journal)
      case 't.doc_date': return text(day(l.doc_date))
      case 't.doc_ref': return { text: l.doc_ref, href: l.doc_url || null }
      case 't.numero_compte': return text(l.numero_compte)
      case 't.subledger_account': return text(l.subledger_account)
      case 't.label_operation': return text(l.label_operation)
      case 't.debit': return text(formatMoney(l.debit))
      case 't.credit': return text(formatMoney(l.credit))
      case 't.date_creation': return text(day(l.date_creation))
      case 't.tms': return text(day(l.date_modification))
      case 't.date_export': return text(day(l.date_export))
      default: return text('')
    }
  }
  const rows: JournalRow[] = d.items.map((l) => ({ pieceNum: l.piece_num, cells: Object.fromEntries(visible.map((c) => [c.key, cell(c.key, l)])), canEdit: l.can_edit, canDelete: l.can_delete }))
  // What the backend applied is what the filter row shows (the default fiscal year comes back in search_date_start / _end).
  const echoed = Object.fromEntries(Object.entries(d.filters).map(([k, v]) => [k, v ?? '']))
  const filters: Record<string, string> = { ...echoed, search_mvt_label: echoed.search_label_operation ?? '' }
  delete filters.search_label_operation
  return {
    columns,
    rows,
    totals: { 't.debit': formatMoney(d.totals.debit), 't.credit': formatMoney(d.totals.credit) },
    filters,
    accountOptions: accounts,
    limit: d.pagination.limit,
    limitOptions: LIMITS,
    page: d.pagination.page,
    hasPrev: d.pagination.page > 0,
    hasNext: d.pagination.page + 1 < d.pagination.pages,
    reexport: readReexport(),
    token: '',
    exportTitle: 'Export the listed lines',
  }
}

export async function loadJournalsList(req: JournalsRequest): Promise<JournalsList> {
  const [list, cols, accounts] = await Promise.all([
    fapiGet<FapiLedgerList>('/accountancy/fapi/list.php', listParams(req)),
    fapiGet<FapiListColumns>('/accountancy/fapi/list.php', { action: 'columns' }),
    loadBindableAccounts().then((a) => a.map((o) => ({ value: o.label.split(' - ')[0], label: o.label }))),
  ])
  return mapLedgerList(list, cols, accounts)
}

// Saves the shown columns (the same per-user setting the classic page uses) and resolves to what the backend now holds.
export async function saveJournalColumns(keys: string[]): Promise<string[]> {
  const res = await fapiPost<FapiListColumns>('/accountancy/fapi/list.php', { selected: keys }, { action: 'columns' })
  return res.selected
}

// Streams the configured accountancy export for the filtered lines and marks them exported. A refusal (no export model, no right) answers JSON.
export async function exportJournals(filters: Record<string, string>): Promise<string> {
  // Every line matching the filters is exported, so no page or limit is sent.
  const { limit: _limit, page: _page, ...params } = listParams({ filters, limit: null, page: 0 })
  const res = await fapi.get<Blob>('/accountancy/fapi/list.php', { params: { ...params, action: 'export' }, responseType: 'blob' })
  const type = String(res.headers['content-type'] ?? '')
  if (/json|html/i.test(type)) {
    let message = 'The backend did not return an export file.'
    try {
      message = (JSON.parse(await res.data.text()) as { message?: string }).message || message
    } catch {
      /* keep the generic text */
    }
    throw new Error(message)
  }
  const name = decodeURIComponent(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(String(res.headers['content-disposition'] ?? ''))?.[1] ?? 'ledger-export.csv')
  const url = URL.createObjectURL(res.data)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
  return name
}
