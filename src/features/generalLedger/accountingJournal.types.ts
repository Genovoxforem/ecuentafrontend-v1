// Types of the accountingJournal page. The HTML parser that used to sit next to them was removed on 12 Nov 2026: the page reads its JSON endpoint now.

// accountancy/journal/{bankjournal,expensereportsjournal,sellsjournal,
// purchasesjournal}.php — Dolibarr's four per-type journal reports. All
// four share one layout — a POST/GET form (token, action, date_start/
// date_end as MM/dd/yyyy plus hidden day/month/year triplets,
// in_bookkeeping select, submit=Refresh) inside a "Filter" card (Name /
// Report period / Status / Description), two JS buttons that re-submit
// that form with action=exportcsv / action=writebookkeeping, and one
// transaction table. The table's CSS class differs per page
// (`table-sm align-middle noborderRemove` vs `newCustomUItable
// noborderRemove`), so it is found by its header instead, and columns are
// mapped by header text because the Finance journal has an extra "Payment
// Type" column the other three lack.

export interface JournalRow {
  date: string
  doc: string
  account: string
  subledger: string
  label: string
  partyName: string // customer/supplier shown at the end of the label cell
  partyId: string
  paymentType: string
  debit: number
  credit: number
  // As the page prints them (thousands separators, up to four decimals).
  debitText: string
  creditText: string
}
// A setup warning box of the page, and the menu entry it points at (the bold phrase, e.g.
// "Accounting-Setup-Bank accounts"), so the screen can link that phrase to the native setup page.
export interface JournalWarning {
  text: string
  link: string
}
export interface JournalPage {
  title: string
  name: string
  description: string
  token: string
  dateStart: string // MM/dd/yyyy, as the real form holds it
  dateEnd: string
  inBookkeeping: string
  inBookkeepingOptions: { value: string; label: string }[]
  warnings: JournalWarning[]
  docHeader: string
  hasPaymentType: boolean
  rows: JournalRow[]
}
