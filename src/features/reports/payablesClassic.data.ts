import { useQuery } from '@tanstack/react-query'
import { fetchLegacyDocument, legacyMissingContentError, looksLikeLegacyLoginPageText, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'
import {
  periodValue,
  readClassicTable,
  readOptions,
  setIf,
  tableOf,
  useClassicPage,
  type ClassicOption,
  type ClassicTable,
  type TablePage,
} from './receivablesClassic.data'

// The Payables reports of the Reports Center that have no JSON API: they are read from the classic page itself with the classic session, the way the
// Receivables reports are (receivablesClassic.data.ts). Read on newecuenta on 11 Nov 2026 (fixtures tests/fixtures/reports-payables-*.html). Every page
// takes its period as `newdatepicker=MM/DD/YYYY-MM/DD/YYYY` (the classic page opens on today, Vendor Report on the month) and answers a table#example:
//   fourn/commande/listreport.php            search_sale, search_user, search_product_category   Ref. | Ref. order vendor | Request author | Third-party | City | Order date | Planned date of delivery | Amount (excl. tax) | Amount(incl.tax) | Status
//   compta/resultat/vendor_report.php?type=f search_categ_sup, search_sale                       Third-party name | Alias Name | Barcode | Customer Code | Vendor Code | Sup. account. code | Address | Zip Code | Third-party type | Phone | VAT ID | (blank) | Environment | Status
//   compta/resultat/vendor_creditnote.php                                                        No | Ref | Customer | Credit Note | Invoice Date | Credit Note Date | Total Amount
//   compta/resultat/vendorcreditagereport.php                                                    No | Ref | Customer | Due Date | 30Days | 30Days | 60Days | 60Days | 180+ Days
//   compta/resultat/vendorrefund_history.php                                                     No | Ref | Customer | Credit Note | Invoice Date | Credit Note Date | Total Amount | Refund Amount | Status
// Vendor Balance (compta/resultat/vendor_balance.php) prints its result only when the form is posted (`submit`): it is a read-only report, its source runs
// SELECT queries only, so the page is asked the way the classic form asks: token, newdatepicker, vendor_name (a third-party id or "all"), submit.
// The instance has no vendor and no vendor invoice, so no row of any of these pages has been seen yet: the tables print whatever the classic page prints.

// ---- Purchase Order List ------------------------------------------------------------------------------------------------------------------------------

export interface PurchaseOrderFilters {
  start: string
  end: string
  salesRep: string
  user: string
  productCategory: string
}

export interface PurchaseOrderPage extends TablePage {
  options: { salesReps: ClassicOption[]; users: ClassicOption[]; productCategories: ClassicOption[] } & Record<string, ClassicOption[]>
}

export function purchaseOrderParams(f: PurchaseOrderFilters): URLSearchParams {
  const p = new URLSearchParams({ newdatepicker: periodValue(f.start, f.end) })
  setIf(p, 'search_sale', f.salesRep, ['', '0'])
  setIf(p, 'search_user', f.user, ['', '-1'])
  setIf(p, 'search_product_category', f.productCategory, ['', '-1', '0'])
  return p
}

export function readPurchaseOrders(doc: Document): PurchaseOrderPage {
  return {
    table: readClassicTable(tableOf(doc, 'table#example', 'purchase order table')),
    options: {
      salesReps: readOptions(doc, 'search_sale'),
      users: readOptions(doc, 'search_user'),
      productCategories: readOptions(doc, 'search_product_category'),
    },
  }
}

export function usePurchaseOrderList(f: PurchaseOrderFilters) {
  return useClassicPage('purchaseOrderList', '/fourn/commande/listreport.php', purchaseOrderParams(f), readPurchaseOrders)
}

// ---- Vendor Report (the classic third-party list of the period) ---------------------------------------------------------------------------------

export interface VendorReportPage extends TablePage {
  options: { tags: ClassicOption[]; salesReps: ClassicOption[] } & Record<string, ClassicOption[]>
}

export function vendorReportParams(start: string, end: string, tag: string, salesRep: string): URLSearchParams {
  const p = new URLSearchParams({ type: 'f', newdatepicker: periodValue(start, end) })
  setIf(p, 'search_categ_sup', tag, ['', '0'])
  setIf(p, 'search_sale', salesRep, ['', '0'])
  return p
}

export function readVendorReport(doc: Document): VendorReportPage {
  return {
    table: readClassicTable(tableOf(doc, 'table#example', 'vendor table')),
    options: { tags: readOptions(doc, 'search_categ_sup'), salesReps: readOptions(doc, 'search_sale') },
  }
}

export function useVendorReport(start: string, end: string, tag: string, salesRep: string) {
  return useClassicPage('vendorReport', '/compta/resultat/vendor_report.php', vendorReportParams(start, end, tag, salesRep), readVendorReport)
}

// ---- Vendor Credit Note Details, Vendor Credit Note Aging, Vendor Refund History -----------------------------------------------------------------

export function readPayablesTable(doc: Document, what: string): TablePage {
  return { table: readClassicTable(tableOf(doc, 'table#example', what)), options: {} }
}

export type PayablesListKind = 'creditNotes' | 'creditNoteAging' | 'refundHistory'

const LIST_PATH: Record<PayablesListKind, { path: string; what: string }> = {
  creditNotes: { path: '/compta/resultat/vendor_creditnote.php', what: 'vendor credit note table' },
  creditNoteAging: { path: '/compta/resultat/vendorcreditagereport.php', what: 'vendor credit note aging table' },
  refundHistory: { path: '/compta/resultat/vendorrefund_history.php', what: 'vendor refund history table' },
}

export function usePayablesList(kind: PayablesListKind, start: string, end: string) {
  const { path, what } = LIST_PATH[kind]
  return useClassicPage(kind, path, new URLSearchParams({ newdatepicker: periodValue(start, end) }), (doc) => readPayablesTable(doc, what))
}

// ---- Vendor Balance -----------------------------------------------------------------------------------------------------------------------------------

const BALANCE_PATH = '/compta/resultat/vendor_balance.php'

export interface VendorBalanceOptions {
  // "Select a Third Party" and "All" come with the page; the vendors follow.
  vendors: ClassicOption[]
}

export function readVendorBalanceOptions(doc: Document): VendorBalanceOptions {
  return { vendors: readOptions(doc, 'vendor_name') }
}

// The token of the page's own form (the app shell holds other hidden forms).
export function readFormToken(doc: Document, action: string): string {
  const own = doc.querySelector(`form[action*="${action}"] input[name="token"]`) ?? doc.querySelector('#id-right input[name="token"]') ?? doc.querySelector('input[name="token"]')
  return own instanceof HTMLInputElement ? own.value : ''
}

export interface VendorBalanceResult {
  // null = the page printed no report (a period with no invoice of that vendor).
  table: ClassicTable | null
}

export function readVendorBalanceResult(doc: Document): VendorBalanceResult {
  const table = doc.querySelector('#id-right table#example') ?? doc.querySelector('table#example')
  return { table: table ? readClassicTable(table) : null }
}

export function vendorBalanceBody(token: string, start: string, end: string, vendor: string): URLSearchParams {
  return new URLSearchParams({ token, newdatepicker: periodValue(start, end), vendor_name: vendor, modecompta: 'BOOKKEEPING', submit: 'View Report' })
}

export async function loadVendorBalance(start: string, end: string, vendor: string): Promise<VendorBalanceResult> {
  const form = await fetchLegacyDocument(BALANCE_PATH)
  const res = await fetch(BALANCE_PATH, { method: 'POST', credentials: 'same-origin', body: vendorBalanceBody(readFormToken(form, 'vendor_balance.php'), start, end, vendor) })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  const html = await res.text()
  if (looksLikeLegacyLoginPageText(html)) throw new Error(NOT_SIGNED_IN_MESSAGE)
  const doc = new DOMParser().parseFromString(html, 'text/html')
  if (!doc.querySelector('select[name="vendor_name"]') && !doc.querySelector('table#example')) throw legacyMissingContentError(doc, 'The vendor balance page was not found.')
  return readVendorBalanceResult(doc)
}

export function useVendorBalanceOptions() {
  return useClassicPage('vendorBalanceOptions', BALANCE_PATH, new URLSearchParams(), readVendorBalanceOptions)
}

export function useVendorBalance(start: string, end: string, vendor: string) {
  return useQuery({
    queryKey: ['reports', 'payablesClassic', 'vendorBalance', start, end, vendor],
    queryFn: () => loadVendorBalance(start, end, vendor),
    enabled: Boolean(start && end && vendor),
    staleTime: 30_000,
  })
}
