import { useQuery } from '@tanstack/react-query'
import { fetchLegacyDocument, legacyMissingContentError, looksLikeLegacyLoginPageText, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'
import { cellText, periodValue, readClassicTable, readOptions, tableOf, type ClassicOption, type ClassicTable } from './receivablesClassic.data'
import { JSON_LOADERS } from './jsonReports.data'
import { usDate } from './reportFormat'

// Reports Center pages that have no JSON API and are read from the classic page itself with the classic session, the way the Receivables and Payables
// reports are. Read on newecuenta on 11 Nov 2026 (GET; the period boxes of the classic page, by page):
//   product/inventorysummary.php             table#inventoryMovementTable   newdatepicker=MM/DD/YYYY-MM/DD/YYYY
//   compta/resultat/best_product.php         table#withoutlastcolumn        GET ignores the period (the page opens on 01/01/2023-12/31/2026); a changed period is the page's own form POST
//   compta/resultat/best_service.php         table#withoutlastcolumn        no filter
//   compta/stats/turnovertprepo.php, cabyprodserv.php  table#example      modecompta=CREANCES-DETTES, no filter; cabyuser.php takes newdatepicker + multicurrency_code
//   takeposnew/stock_movement_report.php     table.smr-table                daterange=MM/DD/YYYY - MM/DD/YYYY, product_scope
//   product/stock/warehousesummaryreport.php table#example                  newdatepicker=MM/DD/YYYY - MM/DD/YYYY
//   product/stock/stockatdate.php            table#example                  newdatepicker=MM/DD/YYYY (one day), productid, search_fk_warehouse, action=filter
//   expensereport/expensereport.php          table#example                  newdatepicker, expence_name, search_user, search_status
//   product/listreportservices.php?type=1    table#example                  search_category_product_list[]
//   compta/resultat/incomeexpense.php, statementreport.php  form POST for the period (date_start / date_end and their day / month / year parts + token)
//   compta/resultat/profitloss.php           table.pnl-t                    newdatepicker=YYYY-MM-DD - YYYY-MM-DD, yearOnly
//   compta/resultat/balancesheet_horizontal.php / _vertical.php  table.bs-tbl  yearOnly
//   compta/stats/byratecountry.php           table#excelPrint
// The classic statement pages print each statement twice (a screen copy and a hidden print copy); only the visible copy is read.

export type PeriodMode = 'newdatepicker' | 'spaced' | 'daterange' | 'single' | 'post' | 'none'

export interface SelectFilterDef {
  name: string
  label: string
  blank: string
  skip: string[]
}

export interface TableReportDef {
  key: string
  path: string
  fixed?: Record<string, string>
  table: string
  title: string
  heading: string
  period: PeriodMode
  // the period the classic page opens on; 'page' = the page's own default, nothing is sent until the user picks one (Stock Movement and Invoiced By Internal User
  // open unfiltered although their date box shows the month: 45 movements, not the 3 of November)
  initial: 'today' | 'month' | 'week' | 'page'
  filters?: SelectFilterDef[]
  // one count, shown under the heading
  caption?: string
  // 'json': the page has a JSON endpoint and reads that (jsonReports.data.ts) instead of the classic page
  source?: 'json'
}

export const TABLE_REPORTS: Record<string, TableReportDef> = {
  'stock-movement': { key: 'stock-movement', path: '/product/inventorysummary.php', table: '#inventoryMovementTable', title: 'Stock Movement', heading: 'List of stock movements', period: 'newdatepicker', initial: 'page', source: 'json' },
  'best-products': { key: 'best-products', path: '/compta/resultat/best_product.php', table: '#withoutlastcolumn', title: 'Best Selling Products', heading: 'Best product', period: 'post', initial: 'page' },
  'best-services': { key: 'best-services', path: '/compta/resultat/best_service.php', table: '#withoutlastcolumn', title: 'Best selling services', heading: 'Best services', period: 'none', initial: 'page' },
  'turnover-third-parties': { key: 'turnover-third-parties', path: '/compta/stats/turnovertprepo.php', fixed: { modecompta: 'CREANCES-DETTES' }, table: '#example', title: 'Invoiced By Third Parties', heading: 'Turnover invoiced by third parties', period: 'none', initial: 'page' },
  'turnover-users': {
    key: 'turnover-users',
    path: '/compta/stats/cabyuser.php',
    fixed: { modecompta: 'CREANCES-DETTES' },
    table: '#example',
    title: 'Invoiced By Internal User',
    heading: 'Turnover invoiced, by invoice author',
    period: 'newdatepicker',
    initial: 'page',
    filters: [{ name: 'multicurrency_code', label: 'Currency', blank: '', skip: [''] }],
  },
  'turnover-products': { key: 'turnover-products', path: '/compta/stats/cabyprodserv.php', fixed: { modecompta: 'CREANCES-DETTES' }, table: '#example', title: 'By product and service', heading: 'Turnover invoiced, by product and service', period: 'none', initial: 'page' },
  'terminal-stock': {
    key: 'terminal-stock',
    path: '/takeposnew/stock_movement_report.php',
    table: '.smr-table',
    title: 'Terminal Wise Stock',
    heading: 'POS stock movement',
    period: 'daterange',
    initial: 'week',
    filters: [{ name: 'product_scope', label: 'Product scope', blank: '', skip: [''] }],
  },
  'warehouse-summary': { key: 'warehouse-summary', path: '/product/stock/warehousesummaryreport.php', table: '#example', title: 'Warehouse Summary', heading: 'List of warehouses', period: 'spaced', initial: 'today' },
  'stock-at-date': {
    key: 'stock-at-date',
    path: '/product/stock/stockatdate.php',
    fixed: { action: 'filter' },
    table: '#example',
    title: 'Stock at date',
    heading: 'Stocks at date',
    period: 'single',
    initial: 'today',
    source: 'json',
    filters: [
      { name: 'productid', label: 'Product', blank: 'All', skip: ['', '0'] },
      { name: 'search_fk_warehouse', label: 'Warehouse', blank: 'All', skip: ['', '-1'] },
    ],
  },
  'expense-reports': {
    key: 'expense-reports',
    path: '/expensereport/expensereport.php',
    table: '#example',
    title: 'List of expense reports',
    heading: 'List of expense reports',
    period: 'spaced',
    initial: 'page',
    filters: [
      { name: 'expence_name', label: 'Category Name', blank: 'All Category', skip: ['', '-1'] },
      { name: 'search_user', label: 'User Details', blank: 'Select a users', skip: ['', '-1'] },
      { name: 'search_status', label: 'Status', blank: 'All', skip: ['', '-1'] },
    ],
  },
  popularity: {
    key: 'popularity',
    path: '/product/fapi/popularity.php',
    table: '',
    title: 'Products/Services by popularity',
    heading: 'Products/Services by popularity',
    period: 'none',
    initial: 'page',
    source: 'json',
    filters: [{ name: 'mode', label: 'List of products/services by popularity', blank: 'Customer invoices', skip: ['', 'facture'] }],
  },
  // product/listreport.php?type=0: all 109 rows are in the page (Ref. with the product link, Label, Barcode, Selling price, Stock limit for alert, Physical Stock, Environment, Availability)
  'product-list': { key: 'product-list', path: '/product/listreport.php', fixed: { type: '0' }, table: '#example', title: 'Product List', heading: 'Product list', period: 'none', initial: 'page' },
  // Accountant (accountancy/fapi): the classic bookkeeping reports with their own columns
  'general-ledger': { key: 'general-ledger', path: '/accountancy/fapi/list.php', table: '', title: 'General Ledger', heading: 'Operations - View by accounting account (Ledger)', period: 'newdatepicker', initial: 'page', source: 'json' },
  'journal-purchase': { key: 'journal-purchase', path: '/accountancy/fapi/list.php', table: '', title: 'Purchase Journal', heading: 'Purchase - Journals', period: 'newdatepicker', initial: 'page', source: 'json' },
  'journal-sales': { key: 'journal-sales', path: '/accountancy/fapi/list.php', table: '', title: 'Sales Journal', heading: 'Sales - Journals', period: 'newdatepicker', initial: 'page', source: 'json' },
  'journal-expense': { key: 'journal-expense', path: '/accountancy/fapi/list.php', table: '', title: 'Expenses Journal', heading: 'Expense - Journals', period: 'newdatepicker', initial: 'page', source: 'json' },
  'journal-finance': { key: 'journal-finance', path: '/accountancy/fapi/list.php', table: '', title: 'Finance Journal', heading: 'Finance - Journals', period: 'newdatepicker', initial: 'page', source: 'json' },
  'chart-of-accounts': { key: 'chart-of-accounts', path: '/accountancy/fapi/coa.php', table: '', title: 'List of the accounting accounts', heading: 'List of the accounting accounts', period: 'none', initial: 'page', source: 'json' },
  'service-list': { key: 'service-list', path: '/product/listreportservices.php', fixed: { type: '1' }, table: '#example', title: 'Service list', heading: 'Service list', period: 'none', initial: 'page' },
  'income-expenditure': { key: 'income-expenditure', path: '/compta/resultat/incomeexpense.php', table: 'table.table-hover', title: 'Income & expenditure statement', heading: 'Income & expenditure statement', period: 'post', initial: 'page' },
}

export interface TableReportPage {
  table: ClassicTable
  options: Record<string, ClassicOption[]>
}

// The classic lists print a product as its name with "Ref: X" under it; read as text the two run together ("NAMERef: X"), so a space is put between them.
const spaceRef = (c: string) => c.replace(/(\S)(Ref: )/g, '$1 $2')

// A column with no heading and no cell content (the classic pages print an action column) is dropped.
function dropEmptyColumns(t: ClassicTable): ClassicTable {
  const keep = t.headers.map((h, i) => h !== '' || t.rows.some((r) => (r[i] ?? '') !== '') || t.footers.some((r) => (r[i] ?? '') !== ''))
  const pick = (r: string[]) => r.filter((_, i) => keep[i] !== false)
  const pickLink = (r: Array<string | null>) => r.filter((_, i) => keep[i] !== false)
  return { headers: pick(t.headers), rows: t.rows.map((r) => pick(r).map(spaceRef)), links: t.links?.map(pickLink), footers: t.footers.map(pick) }
}

export function readTableReport(doc: Document, def: TableReportDef): TableReportPage {
  const options: Record<string, ClassicOption[]> = {}
  for (const f of def.filters ?? []) options[f.name] = readOptions(doc, f.name)
  return { table: dropEmptyColumns(readClassicTable(tableOf(doc, def.table, `${def.title} table`))), options }
}

export interface ReportPeriod {
  start: string
  end: string
}

// The period the page opens on ('page' = none sent, so the classic page uses its own).
export function initialPeriod(def: TableReportDef, now = new Date()): ReportPeriod | null {
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  if (def.initial === 'page') return null
  if (def.initial === 'today') return { start: iso(now), end: iso(now) }
  if (def.initial === 'week') return { start: iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)), end: iso(now) }
  return { start: iso(new Date(now.getFullYear(), now.getMonth(), 1)), end: iso(new Date(now.getFullYear(), now.getMonth() + 1, 0)) }
}

export function tableReportParams(def: TableReportDef, period: ReportPeriod | null, filters: Record<string, string>): URLSearchParams {
  const p = new URLSearchParams(def.fixed ?? {})
  if (period) {
    if (def.period === 'newdatepicker') p.set('newdatepicker', periodValue(period.start, period.end))
    else if (def.period === 'spaced') p.set('newdatepicker', periodValue(period.start, period.end, ' - '))
    else if (def.period === 'daterange') p.set('daterange', periodValue(period.start, period.end, ' - '))
    else if (def.period === 'single') p.set('newdatepicker', usDate(period.start))
  }
  for (const f of def.filters ?? []) {
    const v = filters[f.name]
    if (v !== undefined && !f.skip.includes(v)) p.set(f.name, v)
  }
  return p
}

// The pages whose period only a form post changes: the page's own form is read for its hidden fields, then posted with the period.
export async function postPeriod(def: { path: string; fixed?: Record<string, string> }, period: ReportPeriod): Promise<Document> {
  const form = await fetchLegacyDocument(def.path, new URLSearchParams(def.fixed ?? {}))
  const file = def.path.split('/').pop() ?? def.path
  const formEl = Array.from(form.querySelectorAll('form')).find((f) => (f.getAttribute('action') ?? '').includes(file))
  const body = new URLSearchParams()
  formEl?.querySelectorAll('input[type="hidden"][name]').forEach((i) => body.set((i as HTMLInputElement).name, (i as HTMLInputElement).value))
  const [sy, sm, sd] = period.start.split('-')
  const [ey, em, ed] = period.end.split('-')
  body.set('date_startyear', sy)
  body.set('date_startmonth', sm)
  body.set('date_startday', sd)
  body.set('date_endyear', ey)
  body.set('date_endmonth', em)
  body.set('date_endday', ed)
  body.set('date_start', usDate(period.start))
  body.set('date_end', usDate(period.end))
  body.set('submit', 'View Report')
  const query = new URLSearchParams(def.fixed ?? {}).toString()
  const res = await fetch(query ? `${def.path}?${query}` : def.path, { method: 'POST', credentials: 'same-origin', body })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  const html = await res.text()
  if (looksLikeLegacyLoginPageText(html)) throw new Error(NOT_SIGNED_IN_MESSAGE)
  return new DOMParser().parseFromString(html, 'text/html')
}

export function useTableReport(def: TableReportDef, period: ReportPeriod | null, filters: Record<string, string>) {
  const params = tableReportParams(def, period, filters)
  const query = params.toString()
  const usePost = def.period === 'post' && period !== null
  return useQuery({
    queryKey: ['reports', 'classicReports', def.key, query, usePost ? `${period?.start}|${period?.end}` : ''],
    queryFn: async () => {
      if (def.source === 'json') return JSON_LOADERS[def.key](period, filters)
      return readTableReport(usePost && period ? await postPeriod(def, period) : await fetchLegacyDocument(def.path, new URLSearchParams(query)), def)
    },
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
}

// ---- Statement pages (Profit and Loss, Balance Sheets, Income Statement, Turnover by sale tax rate) ----------------------------------------------------

export interface StatementCell {
  text: string
  colSpan: number
  rowSpan: number
  head: boolean
}
export type StatementTable = StatementCell[][]

export interface StatementDef {
  key: string
  path: string
  fixed?: Record<string, string>
  table: string
  title: string
  heading: string
  // profit-loss: newdatepicker "YYYY-MM-DD - YYYY-MM-DD" + yearOnly; balance sheets: yearOnly; the others: period by form post; none
  period: 'profitLoss' | 'year' | 'post' | 'none'
}

export const STATEMENTS: Record<string, StatementDef> = {
  'profit-loss': { key: 'profit-loss', path: '/compta/resultat/profitloss.php', table: 'table.pnl-t', title: 'Profit and Loss', heading: 'Profit/Loss statement', period: 'profitLoss' },
  'balance-horizontal': { key: 'balance-horizontal', path: '/compta/resultat/balancesheet_horizontal.php', table: 'table.bs-tbl', title: 'Horizontal Balance Sheet', heading: 'Balance sheet', period: 'year' },
  'balance-vertical': { key: 'balance-vertical', path: '/compta/resultat/balancesheet_vertical.php', table: 'table.bs-tbl', title: 'Vertical Balance Sheet', heading: 'Balance sheet', period: 'year' },
  'income-statement': { key: 'income-statement', path: '/compta/resultat/statementreport.php', table: 'table.table-hover', title: 'Income Statement', heading: 'Income statement', period: 'post' },
  'turnover-tax-rate': { key: 'turnover-tax-rate', path: '/compta/stats/byratecountry.php', fixed: { modecompta: 'CREANCES-DETTES' }, table: 'table#excelPrint', title: 'Turnover invoiced by sale tax rate', heading: 'Turnover invoiced, by sale tax rate', period: 'none' },
}

function readStatementTable(table: Element): StatementTable {
  return Array.from(table.querySelectorAll('tr'))
    .map((tr) => Array.from(tr.children).map((c) => ({ text: cellText(c), colSpan: Number(c.getAttribute('colspan')) || 1, rowSpan: Number(c.getAttribute('rowspan')) || 1, head: c.tagName === 'TH' })))
    .filter((cells) => cells.length > 0 && cells.some((c) => c.text !== ''))
}

// The statement's tables in page order. The classic page also prints a copy of them inside a block it hides (#tableNewdet, display: none) for printing: that copy is skipped.
export function readStatement(doc: Document, def: StatementDef): StatementTable[] {
  const root = doc.querySelector('#id-right') ?? doc
  const seen = new Set<string>()
  const out: StatementTable[] = []
  for (const table of Array.from(root.querySelectorAll(def.table))) {
    if (table.closest('[style*="display: none"], [style*="display:none"]')) continue
    const t = readStatementTable(table)
    if (t.length === 0) continue
    const signature = t.map((r) => r.map((c) => c.text).join('|')).join('\n')
    if (seen.has(signature)) continue
    seen.add(signature)
    out.push(t)
  }
  if (out.length === 0) throw legacyMissingContentError(doc, `The ${def.title} was not found on the page.`)
  return out
}

// ---- Balance sheets (balancesheet_horizontal.php / balancesheet_vertical.php: the same markup, one grid column or two) --------------------------------------

export interface BalanceLine {
  cells: string[]
  // bs-section (a heading line), bs-subtotal (a total line), level-1 (indented one step); anything else is a plain account line
  kind: 'section' | 'subtotal' | 'line'
  indent: number
}

export interface BalanceSide {
  title: string
  amountLabel: string
  lines: BalanceLine[]
}

export interface BalanceSheet {
  title: string
  // "As At 31 Dec 2025 | COMPANY", "Period: ...", "Journals included: ..."
  subtitles: string[]
  sides: BalanceSide[]
  cards: Array<{ label: string; value: string }>
  footer: string
}

const squash = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim()

export function readBalanceSheet(doc: Document): BalanceSheet {
  const report = doc.querySelector('#bsReport')
  if (!report) throw legacyMissingContentError(doc, 'The balance sheet was not found on the page.')
  const sides: BalanceSide[] = Array.from(report.querySelectorAll('#bsTable .bs-side'))
    .filter((side) => !side.closest('[style*="display: none"], [style*="display:none"]'))
    .map((side) => {
      const spans = Array.from(side.querySelectorAll('.bs-side-title span')).map((s) => squash(s.textContent))
      const table = side.querySelector('table.bs-tbl')
      const lines: BalanceLine[] = Array.from(table?.querySelectorAll('tr') ?? [])
        .map((tr) => {
          const cells = Array.from(tr.children).map((c) => squash(c.textContent))
          const kind: BalanceLine['kind'] = tr.classList.contains('bs-subtotal') ? 'subtotal' : tr.classList.contains('bs-section') ? 'section' : 'line'
          return { cells, kind, indent: tr.classList.contains('level-1') ? 1 : 0 }
        })
        .filter((l) => l.cells.some((c) => c !== ''))
      return { title: spans[0] ?? '', amountLabel: spans[1] ?? '', lines }
    })
  if (sides.length === 0) throw legacyMissingContentError(doc, 'The balance sheet was not found on the page.')
  return {
    title: squash(report.querySelector('.bs-hdr h1')?.textContent) || 'Balance Sheet',
    subtitles: Array.from(report.querySelectorAll('.bs-hdr .sub')).map((s) => squash(s.textContent)),
    sides,
    cards: Array.from(report.querySelectorAll('.bs-summary .bs-card')).map((c) => ({ label: squash(c.querySelector('.lbl')?.textContent), value: squash(c.querySelector('.val')?.textContent) })),
    footer: squash(report.querySelector('.bs-body > p')?.textContent),
  }
}

export function balanceSheetPath(vertical: boolean) {
  return vertical ? '/compta/resultat/balancesheet_vertical.php' : '/compta/resultat/balancesheet_horizontal.php'
}

export function useBalanceSheet(vertical: boolean, year: string) {
  return useQuery({
    queryKey: ['reports', 'classicReports', 'balanceSheet', vertical ? 'v' : 'h', year],
    queryFn: async () => readBalanceSheet(await fetchLegacyDocument(balanceSheetPath(vertical), new URLSearchParams({ yearOnly: year }))),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
}

export function statementParams(def: StatementDef, period: ReportPeriod | null, year: string): URLSearchParams {
  const p = new URLSearchParams(def.fixed ?? {})
  if (def.period === 'profitLoss' && period) {
    p.set('newdatepicker', `${period.start} - ${period.end}`)
    p.set('yearOnly', year)
  }
  if (def.period === 'year') p.set('yearOnly', year)
  return p
}

export function useStatement(def: StatementDef, period: ReportPeriod | null, year: string) {
  const query = statementParams(def, period, year).toString()
  const usePost = def.period === 'post' && period !== null
  return useQuery({
    queryKey: ['reports', 'classicReports', 'statement', def.key, query, usePost ? `${period?.start}|${period?.end}` : ''],
    queryFn: async () => {
      const doc = usePost && period ? await postPeriod(def, period) : await fetchLegacyDocument(def.path, new URLSearchParams(query))
      return readStatement(doc, def)
    },
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
}
