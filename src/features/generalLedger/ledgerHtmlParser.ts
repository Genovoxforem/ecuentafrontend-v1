// Shared shape definitions for the General Ledger's Ledger/Journals reports.
// Both are now backed by the real accountancy/bookkeeping/listbyaccount_ajax_api.php
// JSON endpoint (see generalLedger.queries.ts) — this file used to also hold
// DOMParser-based HTML scraping for Journals (list.php had no JSON API at
// the time), which violated this project's "no HTML-scraping, real API data
// only" rule. Removed once the real endpoint was found to carry everything
// Journals needs; only the type definitions remain here.

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
  periodMovements: LedgerMovement | null
  closingBalance: LedgerMovement | null
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
}

export interface JournalsReport {
  rows: JournalRow[]
  totalDebit: number
  totalCredit: number
}
