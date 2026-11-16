import { fapiGet } from '../../api/fapiEnvelope'
import { loadRemainingPages } from '../../api/paging'
import { getProductPopularity, getStockAtDate, type PopularityMode } from '../../api/products'
import { ROUTES } from '../../routes'
import { loadAllAccounts } from '../generalLedger/accountList.data'
import { formatDateTimeAmPm } from '../../utils/format'
import type { ClassicOption } from './receivablesClassic.data'
import type { ReportPeriod, TableReportPage } from './classicReports.data'

// Reports Center pages that have a JSON endpoint: they read it (key-authenticated, no classic session) and print the columns of the classic page.
//   Stock Movement      product/stock/fapi/movements.php   date_from / date_to, or period=all (the classic page opens on every movement)
//   Stock at date       product/stock/fapi/stock_at_date.php   date, product, warehouse
//   Products by popularity  product/fapi/popularity.php    mode = facture | commande | propal | all
// Read live on newecuenta on 11 Nov 2026. The classic Stock Movement list also prints an "Environment" column (the entity of the movement); the JSON
// rows carry no entity, so that column is not shown (master report).

const PAGE = 200

async function allPages<T>(read: (page: number) => Promise<{ items: T[]; pages: number }>): Promise<T[]> {
  const first = await read(1)
  const rest = await loadRemainingPages(first.pages, async (page) => (await read(page)).items)
  return first.items.concat(...rest)
}

// ---- Stock Movement -------------------------------------------------------------------------------------------------------------------------------

interface FapiMovementRow {
  id: number
  date: string
  product_id: number
  product_ref: string
  product_label: string
  warehouse_id: number
  warehouse_ref: string
  qty: number
  type_label: string
  label: string
  inventory_code: string | null
  batch: string | null
  origin_ref: string | null
  origin_route: string | null
}

export async function loadStockMovements(period: ReportPeriod | null): Promise<TableReportPage> {
  const scope = period ? { date_from: period.start, date_to: period.end } : { period: 'all' }
  const rows = await allPages(async (page) => {
    const d = await fapiGet<{ items: FapiMovementRow[]; pagination: { pages: number } }>('/product/stock/fapi/movements.php', { ...scope, limit: PAGE, page })
    return { items: d.items, pages: d.pagination.pages }
  })
  // the classic list prints the oldest movement first
  const sorted = [...rows].sort((a, b) => a.id - b.id)
  return {
    table: {
      headers: ['Ref.', 'Date', 'Product ref.', 'Product label', 'Lot/Serial', 'Warehouse', 'Inv./Mov. code', 'Label of movement', 'Type of movement', 'Origin', 'Qty'],
      rows: sorted.map((m) => [String(m.id), formatDateTimeAmPm(m.date), `${m.product_label} Ref: ${m.product_ref}`, m.product_label, m.batch ?? '', m.warehouse_ref, m.inventory_code ?? '', m.label, m.type_label, m.origin_ref ?? '', String(m.qty)]),
      links: sorted.map((m) => [null, null, ROUTES.productDetail.replace(':id', String(m.product_id)) + '?tab=Stock', null, null, ROUTES.warehouseDetail.replace(':id', String(m.warehouse_id)), null, null, null, m.origin_route, null]),
      footers: [],
    },
    options: {},
  }
}

// ---- Stock at date --------------------------------------------------------------------------------------------------------------------------------

const money = (n: number | null | undefined) => (typeof n === 'number' ? n.toFixed(2) : '')

export async function loadStockAtDate(period: ReportPeriod | null, filters: Record<string, string>): Promise<TableReportPage> {
  const date = period?.start ?? new Date().toISOString().slice(0, 10)
  const params = { date, product: filters.productid ? Number(filters.productid) : undefined, warehouse: filters.search_fk_warehouse || undefined }
  const [items, warehouses, products] = await Promise.all([
    allPages(async (page) => {
      const d = await getStockAtDate({ ...params, page, limit: 500 })
      return { items: d.items, pages: d.pagination.pages }
    }),
    fapiGet<{ items: Array<{ id: number; ref: string }> }>('/product/stock/fapi/warehouses.php', { limit: 200 }),
    fapiGet<{ items: Array<{ id: number; ref: string; label: string }> }>('/product/fapi/list.php', { limit: 500 }),
  ])
  const options: Record<string, ClassicOption[]> = {
    productid: products.items.map((p) => ({ value: String(p.id), label: `${p.ref} - ${p.label}` })),
    search_fk_warehouse: warehouses.items.map((w) => ({ value: String(w.id), label: w.ref })),
  }
  return {
    table: {
      headers: ['Product ref.', 'Label', 'Stocks at date', 'Input stock value', 'Value for sell', 'Current stock'],
      rows: items.map((i) => [`${i.label} Ref: ${i.ref}`, i.label, money(i.stock_at_date), money(i.value_at_pmp), money(i.sell_value), money(i.current_stock)]),
      links: items.map((i) => [ROUTES.productDetail.replace(':id', String(i.id)), null, null, null, null, null]),
      footers: [],
    },
    options,
  }
}

// ---- Products/Services by popularity ----------------------------------------------------------------------------------------------------------------

export async function loadPopularity(filters: Record<string, string>): Promise<TableReportPage> {
  const mode = (filters.mode || 'facture') as PopularityMode
  const first = await getProductPopularity({ mode, page: 1, limit: 200 })
  const rest = await loadRemainingPages(first.pagination.pages, async (page) => (await getProductPopularity({ mode, page, limit: 200 })).items)
  const items = first.items.concat(...rest)
  const modes = (first as unknown as { modes?: Record<string, string> }).modes ?? {}
  return {
    table: {
      headers: ['Ref.', 'Type', 'Label', 'Qty'],
      rows: items.map((i) => [i.ref, i.type === 1 ? 'Service' : 'Product', i.label, String(i.qty)]),
      links: items.map((i) => [ROUTES.productDetail.replace(':id', String(i.product_id)), null, null, null]),
      footers: [],
    },
    options: { mode: Object.entries(modes).map(([value, label]) => ({ value, label })) },
  }
}

// ---- Accountant: General Ledger, the four journals and the list of accounting accounts ----------------------------------------------------------------------
// accountancy/fapi/list.php (one row per ledger line: piece_num, code_journal, doc_date, doc_ref, numero_compte, subledger_account, label_operation, debit,
// credit, cur_debit, cur_credit, currency_code, currency_amo, date_export) and accountancy/fapi/coa.php?action=list. The classic reports print these columns;
// with no period chosen the page lists every line (nofiscalyear), as the classic page does.

interface FapiLedgerReportLine {
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
  cur_debit: number
  cur_credit: number
  currency_code: string
  currency_amo: number
  date_export: string | null
}

const day = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : '')
const amount = (n: number | null | undefined) => (typeof n === 'number' ? n.toFixed(2) : '')

async function ledgerLines(period: ReportPeriod | null, journal?: string): Promise<FapiLedgerReportLine[]> {
  const scope: Record<string, string | number> = period ? { search_date_start: period.start, search_date_end: period.end } : { nofiscalyear: 1 }
  if (journal) scope.search_ledger_code = journal
  return allPages(async (page) => {
    const d = await fapiGet<{ items: FapiLedgerReportLine[]; pagination: { page: number; pages: number } }>('/accountancy/fapi/list.php', { ...scope, limit: 200, page: page - 1 })
    return { items: d.items, pages: d.pagination.pages }
  })
}

const pieceRoute = (l: FapiLedgerReportLine) => (l.piece_num ? ROUTES.ledgerPieceDetail.replace(':pieceNum', l.piece_num) : null)

export async function loadGeneralLedger(period: ReportPeriod | null): Promise<TableReportPage> {
  const lines = await ledgerLines(period)
  return {
    table: {
      headers: ['Num. transaction', 'Journal', 'Date', 'Accounting Doc.', 'Label', 'Conversion Debit', 'Conversion Credit', 'currency Code', 'Currency Amount', 'Debit(ZMW)', 'Credit(ZMW)', 'Date export'],
      rows: lines.map((l) => [l.piece_num, l.code_journal, day(l.doc_date), l.doc_ref, `${l.numero_compte} ${l.label_operation}`.trim(), amount(l.cur_debit), amount(l.cur_credit), l.currency_code, amount(l.currency_amo), amount(l.debit), amount(l.credit), day(l.date_export)]),
      links: lines.map((l) => [pieceRoute(l), null, null, null, null, null, null, null, null, null, null, null]),
      footers: [],
    },
    options: {},
  }
}

export async function loadJournalReport(journal: string, period: ReportPeriod | null): Promise<TableReportPage> {
  const lines = await ledgerLines(period, journal)
  return {
    table: {
      headers: ['Num. transaction', 'Journal', 'Date', 'Accounting Doc.', 'Account', 'Subledger account', 'Label', 'Debit', 'Credit'],
      rows: lines.map((l) => [l.piece_num, l.code_journal, day(l.doc_date), l.doc_ref, l.numero_compte, l.subledger_account, l.label_operation, amount(l.debit), amount(l.credit)]),
      links: lines.map((l) => [pieceRoute(l), null, null, null, null, null, null, null, null]),
      footers: [],
    },
    options: {},
  }
}

// The classic list prints Account number | Label | Short label | Parentcategory | Group of account | Reconcilable. Parentcategory (the sub-group, "Non-current assets-Fixed
// assets") is not in coa.php?action=list, so that column is left out rather than filled with the parent account (which an earlier version printed under that
// heading); Group of account is the answer's pcg_type (ASSETS, EXPENSE ...) as in the classic list.
export async function loadChartOfAccounts(): Promise<TableReportPage> {
  const rows = await loadAllAccounts()
  return {
    table: {
      headers: ['Account number', 'Label', 'Short label', 'Group of account', 'Reconcilable'],
      rows: rows.map((a) => [a.account_number, a.label, a.labelshort, a.pcg_type, a.reconcilable ? 'Yes' : 'No']),
      links: rows.map((a) => [ROUTES.ledgerAccountCard.replace(':id', String(a.id)), null, null, null, null]),
      footers: [],
    },
    options: {},
  }
}

// The JSON loaders of the Reports Center pages, by report key (see TABLE_REPORTS).
export const JSON_LOADERS: Record<string, (period: ReportPeriod | null, filters: Record<string, string>) => Promise<TableReportPage>> = {
  'stock-movement': (period) => loadStockMovements(period),
  'stock-at-date': (period, filters) => loadStockAtDate(period, filters),
  popularity: (_period, filters) => loadPopularity(filters),
  'general-ledger': (period) => loadGeneralLedger(period),
  'journal-purchase': (period) => loadJournalReport('AC', period),
  'journal-sales': (period) => loadJournalReport('VT', period),
  'journal-expense': (period) => loadJournalReport('ER', period),
  'journal-finance': (period) => loadJournalReport('BQ', period),
  'chart-of-accounts': () => loadChartOfAccounts(),
}
