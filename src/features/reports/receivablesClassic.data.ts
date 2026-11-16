import { useQuery } from '@tanstack/react-query'
import { fetchLegacyDocument, legacyMissingContentError } from '../../shared/legacyHtmlFetch'
import { ROUTES } from '../../routes'
import { resolveLegacyRoute } from '../../shared/legacyRoute'
import { usDate } from './reportFormat'

// The Receivables reports of the Reports Center that have no JSON API: they are read from the classic page itself with the classic session (GET only),
// the way the Till Sales report is (tillClassic.data.ts). Read on newecuenta on 10-11 Nov 2026 (fixtures tests/fixtures/reports-classic-*.html). Every page
// takes its filters from the query string, the period as `newdatepicker=MM/DD/YYYY-MM/DD/YYYY`:
//   compta/resultat/creditnote_agingreport.php   table#example      Ref. | Receipt No | Invoice date | Age (Days) | Third-party | Payment Type | Payment Terms | Amount (inc. tax) | Author | Currency | Status, then tr.liste_total
//   compta/resultat/commissionreport.php         table#examplee     Entity | Sales Amount | Expense Amount | Profit Amount
//   compta/resultat/commission_det_report.php    table#excelPrint   sel_entity, sel_pay (expense | sales); headings, "Expense List" / "Sales List" blocks, tr.total, tr.all-total
//   compta/facture/customerduelist.php           table#excelPrint   socid, typent_id, custcats[], userid, object_status; the header row is made of td cells
//   compta/resultat/customer_report.php?type=c   table#example      user_cret (the creator)
//   compta/resultat/aging_summary.php            table#example      user_cret (a customer id, "all"); last row is a tr of th cells (Total)
//   compta/resultat/aging_details.php            table#example      user_cret (a customer id; -1 answers no row), convert_to_base=1
//   comm/propal/proposalreport.php, commande/listreport.php?type=salesorder   table#example   search_sale, search_user, search_product_category, search_categ_cus
// The rows are read as text (avatars dropped), so a link or a badge prints the words the classic page shows.

export interface ClassicOption {
  value: string
  label: string
}

export interface ClassicTable {
  headers: string[]
  rows: string[][]
  // The React page each cell of a row links to (null = plain text): the classic link of the cell, resolved to a page this app has (never a backend URL).
  links?: Array<Array<string | null>>
  // Total rows (a tr of th cells under the header, or tr.liste_total), cells aligned with the headers.
  footers: string[][]
}

const clean = (s: string | null | undefined) => (s ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim()

// The text of a cell without the round initials avatar the classic lists print in front of a name ("W" + "Walking").
export function cellText(cell: Element): string {
  const copy = cell.cloneNode(true) as Element
  copy.querySelectorAll('.avatar, script, style').forEach((e) => e.remove())
  return clean(copy.textContent)
}

// "2026-11-01", "2026-11-30" -> "11/01/2026-11/30/2026" (the value of the classic period box).
export function periodValue(start: string, end: string, separator = '-'): string {
  return `${usDate(start)}${separator}${usDate(end)}`
}

function expandRow(tr: Element): string[] {
  return Array.from(tr.children).flatMap((c) => {
    const span = Number(c.getAttribute('colspan')) || 1
    return [cellText(c), ...Array<string>(Math.max(0, span - 1)).fill('')]
  })
}

// The React route of the first link of a cell that this app has a page for.
function cellRoute(cell: Element): string | null {
  for (const a of Array.from(cell.querySelectorAll('a[href]'))) {
    // a customer payment's React page is keyed by its ref (PAY2611-0052), which is the link's own text
    if ((a.getAttribute('href') ?? '').includes('/compta/paiement/card.php')) {
      const ref = clean(a.textContent)
      if (ref) return ROUTES.paymentCard.replace(':ref', encodeURIComponent(ref))
    }
    const route = resolveLegacyRoute(a.getAttribute('href'))
    if (route) return route
  }
  return null
}

function expandLinks(tr: Element): Array<string | null> {
  return Array.from(tr.children).flatMap((c) => {
    const span = Number(c.getAttribute('colspan')) || 1
    return [cellRoute(c), ...Array<string | null>(Math.max(0, span - 1)).fill(null)]
  })
}

// A classic report table: the header (th cells, or the first row when the page prints it with td cells), the rows, and the total rows.
export function readClassicTable(table: Element): ClassicTable {
  let headers: string[] = []
  const rows: string[][] = []
  const links: Array<Array<string | null>> = []
  const footers: string[][] = []
  for (const tr of Array.from(table.querySelectorAll('tr'))) {
    const cells = Array.from(tr.children)
    if (cells.length === 0) continue
    // a one-cell row that spans the table is a title or a "no data" note, not a record
    if (cells.length === 1 && (Number(cells[0].getAttribute('colspan')) || 1) > 1) continue
    const allTh = cells.every((c) => c.tagName === 'TH')
    if (allTh && headers.length === 0) headers = expandRow(tr)
    else if (allTh || tr.classList.contains('liste_total') || tr.closest('tfoot')) footers.push(expandRow(tr))
    else {
      rows.push(expandRow(tr))
      links.push(expandLinks(tr))
    }
  }
  if (headers.length === 0 && rows.length > 0) {
    headers = rows.shift() ?? []
    links.shift()
  }
  return { headers, rows, links, footers }
}

// The first control of that name inside the page body ("#id-right"): the app shell's hidden forms reuse some names, so the whole document is the fallback only.
export function readOptions(doc: Document, name: string): ClassicOption[] {
  const select = doc.querySelector(`#id-right select[name="${name}"]`) ?? doc.querySelector(`select[name="${name}"]`)
  if (!(select instanceof HTMLSelectElement)) return []
  return Array.from(select.options, (o) => ({ value: o.value.trim(), label: clean((o.textContent ?? '').split('\n')[0]) || clean(o.textContent) }))
}

export function tableOf(doc: Document, selector: string, what: string): Element {
  const table = doc.querySelector(`#id-right ${selector}`) ?? doc.querySelector(selector)
  if (!table) throw legacyMissingContentError(doc, `The ${what} was not found on the page.`)
  return table
}

// Options of a classic select without its blank / "all" entries (the select adds its own blank option).
export function choices(options: ClassicOption[] | undefined, skip: string[] = ['']): ClassicOption[] {
  return (options ?? []).filter((o) => !skip.includes(o.value) && o.label !== '')
}

// Appends a filter to the query only when it has a value.
export function setIf(p: URLSearchParams, name: string, value: string | undefined, ignore: string[] = ['']) {
  if (value !== undefined && !ignore.includes(value)) p.set(name, value)
}

export function useClassicPage<T>(key: string, path: string, params: URLSearchParams, read: (doc: Document) => T, enabled = true) {
  const query = params.toString()
  return useQuery({
    queryKey: ['reports', 'receivablesClassic', key, query],
    queryFn: async () => read(await fetchLegacyDocument(path, query ? new URLSearchParams(query) : undefined)),
    staleTime: 30_000,
    enabled,
    placeholderData: (prev) => prev,
  })
}

// ---- Credit Note Aging Report ------------------------------------------------------------------------------------------------------------------------

export interface TablePage {
  table: ClassicTable
  options: Record<string, ClassicOption[]>
}

export function readCreditNoteAging(doc: Document): TablePage {
  return { table: readClassicTable(tableOf(doc, 'table#example', 'credit note aging table')), options: {} }
}

export function creditNoteAgingParams(start: string, end: string): URLSearchParams {
  return new URLSearchParams({ newdatepicker: periodValue(start, end) })
}

export function useCreditNoteAging(start: string, end: string) {
  return useClassicPage('creditNoteAging', '/compta/resultat/creditnote_agingreport.php', creditNoteAgingParams(start, end), readCreditNoteAging)
}

// ---- Combined Commission Report (and detailed) -------------------------------------------------------------------------------------------------------

export function readCommission(doc: Document): TablePage {
  return { table: readClassicTable(tableOf(doc, 'table#examplee', 'commission table')), options: {} }
}

export function useCommission(start: string, end: string) {
  return useClassicPage('commission', '/compta/resultat/commissionreport.php', new URLSearchParams({ newdatepicker: periodValue(start, end) }), readCommission)
}

export type CommissionBlock =
  | { kind: 'title'; text: string }
  | { kind: 'section'; text: string }
  | { kind: 'header'; cells: string[] }
  | { kind: 'row'; cells: string[] }
  | { kind: 'total'; cells: string[] }
  | { kind: 'grand'; cells: string[] }

export interface CommissionDetailPage {
  blocks: CommissionBlock[]
  entities: ClassicOption[]
  paymentTypes: ClassicOption[]
}

// The detailed report is one table whose rows are told apart by their markup: a one-cell title or section row, th cells for a header, tr.total for the
// total of a list and tr.all-total for the grand total; the white spacer rows are skipped.
export function readCommissionDetail(doc: Document): CommissionDetailPage {
  const table = tableOf(doc, 'table#excelPrint', 'detailed commission table')
  const blocks: CommissionBlock[] = []
  for (const tr of Array.from(table.querySelectorAll('tr'))) {
    const cells = Array.from(tr.children)
    const texts = expandRow(tr)
    if (cells.every((c) => !clean(c.textContent))) continue
    if (cells.length === 1) {
      // a heading row "For the period of ..." sits under the report title inside the same cell
      const first = cells[0].querySelector('b')
      const text = clean(first?.textContent ?? cells[0].textContent)
      blocks.push({ kind: cells[0].classList.contains('main-title') ? 'title' : 'section', text })
    } else if (cells.every((c) => c.tagName === 'TH')) blocks.push({ kind: 'header', cells: texts })
    else if (tr.classList.contains('all-total')) blocks.push({ kind: 'grand', cells: texts })
    else if (tr.classList.contains('total')) blocks.push({ kind: 'total', cells: texts })
    else blocks.push({ kind: 'row', cells: texts })
  }
  return { blocks, entities: readOptions(doc, 'sel_entity'), paymentTypes: readOptions(doc, 'sel_pay') }
}

export function useCommissionDetail(start: string, end: string, entity: string, paymentType: string) {
  const p = new URLSearchParams({ newdatepicker: periodValue(start, end) })
  setIf(p, 'sel_entity', entity)
  setIf(p, 'sel_pay', paymentType)
  return useClassicPage('commissionDetail', '/compta/resultat/commission_det_report.php', p, readCommissionDetail)
}

// ---- Due Customers ----------------------------------------------------------------------------------------------------------------------------------

export interface DueCustomersFilters {
  start: string
  end: string
  customer: string
  type: string
  tags: string[]
  user: string
  status: string
}

export function dueCustomersParams(f: DueCustomersFilters): URLSearchParams {
  // this page writes its period with spaces around the dash
  const p = new URLSearchParams({ newdatepicker: periodValue(f.start, f.end, ' - ') })
  setIf(p, 'socid', f.customer, ['', '-1'])
  setIf(p, 'typent_id', f.type)
  for (const tag of f.tags) p.append('custcats[]', tag)
  setIf(p, 'userid', f.user, ['', '-1'])
  setIf(p, 'object_status', f.status)
  return p
}

export interface DueCustomersPage extends TablePage {
  options: { customers: ClassicOption[]; types: ClassicOption[]; tags: ClassicOption[]; users: ClassicOption[]; statuses: ClassicOption[] } & Record<string, ClassicOption[]>
}

export function readDueCustomers(doc: Document): DueCustomersPage {
  return {
    table: readClassicTable(tableOf(doc, 'table#excelPrint', 'due customers table')),
    options: {
      customers: readOptions(doc, 'socid'),
      types: readOptions(doc, 'typent_id'),
      tags: readOptions(doc, 'custcats[]'),
      users: readOptions(doc, 'userid'),
      statuses: readOptions(doc, 'object_status'),
    },
  }
}

export function useDueCustomers(f: DueCustomersFilters) {
  return useClassicPage('dueCustomers', '/compta/facture/customerduelist.php', dueCustomersParams(f), readDueCustomers)
}

// ---- Customer Report (the classic third-party list of the period) --------------------------------------------------------------------------------------

export interface CustomerReportPage extends TablePage {
  options: { creators: ClassicOption[] } & Record<string, ClassicOption[]>
}

export function readCustomerReport(doc: Document): CustomerReportPage {
  return { table: readClassicTable(tableOf(doc, 'table#example', 'customer table')), options: { creators: readOptions(doc, 'user_cret') } }
}

// The classic page opens with no period applied (it lists every customer; the period filters on the creation date), so null sends none.
export function useCustomerReport(period: { start: string; end: string } | null, creator: string) {
  const p = new URLSearchParams({ type: 'c' })
  if (period) p.set('newdatepicker', periodValue(period.start, period.end))
  setIf(p, 'user_cret', creator)
  return useClassicPage('customerReport', '/compta/resultat/customer_report.php', p, readCustomerReport)
}

// ---- Customer aging (the classic pages: the figures of the classic aging rule) ------------------------------------------------------------------------

export interface AgingClassicPage extends TablePage {
  options: { customers: ClassicOption[] } & Record<string, ClassicOption[]>
}

export function readAgingClassic(doc: Document): AgingClassicPage {
  return { table: readClassicTable(tableOf(doc, 'table#example', 'aging table')), options: { customers: readOptions(doc, 'user_cret') } }
}

export function useAgingSummaryClassic(start: string, end: string, customer: string) {
  const p = new URLSearchParams({ newdatepicker: periodValue(start, end) })
  setIf(p, 'user_cret', customer, ['', 'all', '-1'])
  return useClassicPage('agingSummary', '/compta/resultat/aging_summary.php', p, readAgingClassic)
}

// "Convert to Base": the classic page converts every foreign-currency balance to the base currency when it is ticked (on newecuenta that is the
// 164.80 of the aging API; unticked the page prints 166.80).
export function useAgingDetailsClassic(start: string, end: string, customer: string, convertToBase: boolean) {
  const p = new URLSearchParams({ newdatepicker: periodValue(start, end) })
  setIf(p, 'user_cret', customer, ['', '-1'])
  if (convertToBase) p.set('convert_to_base', '1')
  return useClassicPage('agingDetails', '/compta/resultat/aging_details.php', p, readAgingClassic)
}

// ---- Proposal List and Sales Order List --------------------------------------------------------------------------------------------------------------

export interface ListingFilters {
  start: string
  end: string
  salesRep: string
  user: string
  productCategory: string
  customerCategory: string
}

export interface ListingPage extends TablePage {
  options: { salesReps: ClassicOption[]; users: ClassicOption[]; productCategories: ClassicOption[]; customerCategories: ClassicOption[] } & Record<string, ClassicOption[]>
}

export function listingParams(f: ListingFilters, extra: Record<string, string> = {}): URLSearchParams {
  const p = new URLSearchParams({ ...extra, newdatepicker: periodValue(f.start, f.end) })
  setIf(p, 'search_sale', f.salesRep, ['', '0'])
  setIf(p, 'search_user', f.user, ['', '-1'])
  setIf(p, 'search_product_category', f.productCategory, ['', '0'])
  setIf(p, 'search_categ_cus', f.customerCategory, ['', '0'])
  return p
}

export function readListing(doc: Document): ListingPage {
  return {
    table: readClassicTable(tableOf(doc, 'table#example', 'list table')),
    options: {
      salesReps: readOptions(doc, 'search_sale'),
      users: readOptions(doc, 'search_user'),
      productCategories: readOptions(doc, 'search_product_category'),
      customerCategories: readOptions(doc, 'search_categ_cus'),
    },
  }
}

export function useProposalList(f: ListingFilters) {
  return useClassicPage('proposalList', '/comm/propal/proposalreport.php', listingParams(f), readListing)
}

export function useSalesOrderListClassic(f: ListingFilters) {
  return useClassicPage('salesOrderList', '/commande/listreport.php', listingParams(f, { type: 'salesorder' }), readListing)
}
