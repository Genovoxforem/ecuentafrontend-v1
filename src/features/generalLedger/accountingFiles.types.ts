// The "Export accounting source documents" page (classic compta/accounting-files.php), filled from
// accountancy/fapi/accounting_files.php (accountingFilesFapi.ts): the kinds of document to pick, the listed documents with their
// attached files, the income / outcome / balance totals, and the fields the ZIP download posts.

export interface AccountingFileChoice {
  name: string
  label: string
  checked: boolean
}

export interface AccountingFileLink {
  text: string
  // Root-relative as printed.
  href: string | null
}

export interface AccountingFileRow {
  type: string
  date: string
  dateDue: string
  ref: AccountingFileLink
  // Files attached to the source document (each one a download link).
  documents: AccountingFileLink[]
  paid: string
  totalHt: string
  totalTtc: string
  totalVat: string
  thirdParty: string
  code: string
  country: string
  vatId: string
  currency: string
}

export interface AccountingFileTotal {
  label: string
  ht: string
  ttc: string
  vat: string
}

export interface AccountingFilesPage {
  // "(Environment :Master entity)"
  environment: string
  choices: AccountingFileChoice[]
  // A search has been made (the result block is printed).
  searched: boolean
  // "01/01/2026 - 12/31/2026" over the result.
  period: string
  headers: string[]
  rows: AccountingFileRow[]
  totals: AccountingFileTotal[]
  // The hidden fields of the download form (token, date_start, date_stop, the chosen kinds).
  downloadFields: Record<string, string>
}
