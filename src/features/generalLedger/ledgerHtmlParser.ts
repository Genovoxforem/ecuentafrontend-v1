// Shared shape definitions for the General Ledger's Ledger/Journals reports.
// Both are now backed by the real accountancy/bookkeeping/listbyaccount_ajax_api.php
// JSON endpoint (see generalLedger.queries.ts) — this file used to also hold
// DOMParser-based HTML scraping for Journals (list.php had no JSON API at
// the time), which violated this project's "no HTML-scraping, real API data
// only" rule. Removed once the real endpoint was found to carry everything
// Journals needs; only the type definitions remain here.

import { ROUTES } from '../../routes'

// Resolves the "Accounting Doc." link for a ledger/journal/piece row to a
// React route — never to a backend PHP page. doc_type + fk_doc name the source
// document: customer_invoice and supplier_invoice open the native invoice
// detail pages, expense_report opens the native expense report page (fk_doc is
// the same id each page fetches by). Every other doc_type (bank, member,
// donation, …) has no React page of its own, so it renders as plain text.
export function resolveDocLink(docType: string, fkDoc: string, _docUrl: string | null): string | null {
  if (!fkDoc) return null
  if (docType === 'customer_invoice') return ROUTES.invoiceDetail.replace(':id', fkDoc)
  if (docType === 'supplier_invoice') return ROUTES.vendorInvoiceDetail.replace(':id', fkDoc)
  if (docType === 'expense_report') return ROUTES.expenseReportDetail.replace(':id', fkDoc)
  return null
}

export interface LedgerRow {
  transactionNum: string
  cardUrl: string | null
  journal: string
  date: string
  accountingDoc: string
  label: string
  currencyCode: string
  conversionAmount: string
  exchangeRate: string
  debit: number
  credit: number
  letteringCode: string
  // Real, but only actually displayed on the Subledger view — the real
  // Ledger page (listbyaccount_ajax.php) has no "Date export" column at
  // all, confirmed live; the real Subledger page (listbysubaccount.php)
  // does, in place of Currency/Conversion/Lettering code, which THAT real
  // page doesn't have either — two genuinely different real column
  // templates sharing this one entry shape for convenience.
  dateExport: string
  // Real doc_type/fk_doc/doc_url straight off the API — for entries sourced
  // from a real linkable object (e.g. doc_type "customer_invoice", fk_doc
  // the invoice's own facid), doc_url is a real link to that source
  // document's classic page (confirmed live: /compta/facture/card.php?
  // facid=X); entries sourced from something with no card page of its own
  // (e.g. doc_type "bank") have doc_url as an empty string instead.
  docType: string
  fkDoc: string
  docUrl: string | null
  // Real per-entry edit + delete links straight off the API (edit_url/
  // can_edit, delete_url/can_delete) — confirmed live. edit_url is the same
  // classic accountancy/bookkeeping/card.php?piece_num=X page as cardUrl,
  // surfaced as its own field since the real page renders it as a
  // dedicated pencil-icon action rather than making the whole row/num
  // clickable. delete_url is a real bare GET link
  // (listbyaccount.php?action=delmouv&mvt_num=X) that deletes that one
  // movement server-side — matches the real page's own trash-icon action
  // (confirm-gated in the UI, since the link itself deletes immediately).
  canEdit: boolean
  editUrl: string | null
  canDelete: boolean
  deleteUrl: string | null
}

export interface LedgerAccountGroup {
  accountCode: string
  accountLabel: string
  rows: LedgerRow[]
  totalDebit: number
  totalCredit: number
  balance: number
  balanceSide: 'Dr' | 'Cr' | null
}

export interface LedgerMovement {
  debit: number
  credit: number
  balance: number
  balanceSide: 'Dr' | 'Cr'
}

export interface LedgerReport {
  groups: LedgerAccountGroup[]
  grandTotalDebit: number
  grandTotalCredit: number
  openingBalance: LedgerMovement | null
  periodMovements: LedgerMovement | null
  closingBalance: LedgerMovement | null
  meta: LedgerMeta
}

// Real pagination straight off the API's own `meta` block (page/limit/
// offset/sortfield/sortorder/total_records/total_pages/returned_rows/
// has_more/next_page/prev_page) — confirmed live, not derived/guessed.
export interface LedgerMeta {
  page: number
  limit: number
  totalRecords: number
  totalPages: number
  returnedRows: number
  hasMore: boolean
  nextPage: number | null
  prevPage: number | null
}

export interface SubledgerGroup {
  subledgerAccount: string
  rows: LedgerRow[]
  totalDebit: number
  totalCredit: number
  balance: number
  balanceSide: 'Dr' | 'Cr' | null
}

export interface SubledgerReportData {
  groups: SubledgerGroup[]
  grandTotalDebit: number
  grandTotalCredit: number
  meta: LedgerMeta
}
