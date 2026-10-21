// Shapes the invoice screens share: the two notes of an invoice and the accounting (ledger) entries of an invoice,
// vendor or customer. They are filled from compta/sales/api and fourn/facture/fapi; nothing here parses HTML.

export interface InvoiceNotes {
  notePublic: string
  notePrivate: string
  notePublicEditUrl: string
  notePrivateEditUrl: string
}

export interface InvoiceLedgerEntryRow {
  date: string
  accountingDoc: string
  ref: string
  codeJournal: string
  account: string
  label: string
  debit: string
  credit: string
  amount: string
}

export interface InvoiceLedgerEntryData {
  rows: InvoiceLedgerEntryRow[]
  totalDebit: string
  totalCredit: string
  balance: string
}
