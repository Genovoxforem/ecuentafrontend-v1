// Shared shape definitions for the General Ledger's Ledger/Journals reports.
// Both are now backed by the real accountancy/bookkeeping/listbyaccount_ajax_api.php
// JSON endpoint (see generalLedger.queries.ts) — this file used to also hold
// DOMParser-based HTML scraping for Journals (list.php had no JSON API at
// the time), which violated this project's "no HTML-scraping, real API data
// only" rule. Removed once the real endpoint was found to carry everything
// Journals needs; only the type definitions remain here.

import { ROUTES } from '../../routes'

// Resolves a real "Accounting Doc." link for a ledger/journal/piece row —
// the real backend renders that column as a clickable link (with a small
// file icon) whenever the API's own doc_url is non-empty, straight to the
// source document's classic card page (confirmed live:
// doc_type "customer_invoice" → /compta/facture/card.php?facid=<fk_doc>;
// doc_type "supplier_invoice" → /fourn/facture/card.php?facid=<fk_doc>;
// doc_type "bank" has doc_url = "" — no card page of its own, stays plain
// text). fk_doc is the exact same facid each native detail page fetches by
// (InvoiceDetail.tsx for customer_invoice, VendorInvoiceDetail.tsx for
// supplier_invoice — both live-verified end to end). These two doc_types
// route to their native pages instead of the real external one; every
// other doc_type (e.g. expense_report) falls back to the real external
// doc_url since no native page exists yet for it, and entries with no
// doc_url at all render as plain text exactly like the real page does.
export function resolveDocLink(docType: string, fkDoc: string, docUrl: string | null): { href: string; external: boolean } | null {
  if (docType === 'customer_invoice' && fkDoc) {
    return { href: ROUTES.invoiceDetail.replace(':id', fkDoc), external: false }
  }
  if (docType === 'supplier_invoice' && fkDoc) {
    return { href: ROUTES.vendorInvoiceDetail.replace(':id', fkDoc), external: false }
  }
  if (docUrl) {
    return { href: docUrl, external: true }
  }
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

export interface JournalRow {
  transactionNum: string
  cardUrl: string | null
  journal: string
  date: string
  accountingDoc: string
  accountCode: string
  subledgerAccount: string
  label: string
  debit: number
  credit: number
  dateExport: string
  letteringCode: string
  docType: string
  fkDoc: string
  docUrl: string | null
  canEdit: boolean
  editUrl: string | null
  canDelete: boolean
  deleteUrl: string | null
}

export interface JournalsReport {
  rows: JournalRow[]
  totalDebit: number
  totalCredit: number
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
