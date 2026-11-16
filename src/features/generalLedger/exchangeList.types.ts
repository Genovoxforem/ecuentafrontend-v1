// Types of the exchangeList page. The HTML parser that used to sit next to them was removed on 12 Nov 2026: the page reads its JSON endpoint now.

// accountancy/bookkeeping/exchange_list.php ("Foreign currency revaluation for General ledger").
// A report, not a form: it lists ledger lines and revalues each one at today's exchange rate.
// From the page's own PHP and markup:
//   - filters: `search_currency_code`, the period as one text `newdatepicker` ("mm/dd/yyyy-mm/dd/yyyy",
//     split on "-"), `search_accountancy_code_end` (the account chosen is an upper bound) and an
//     "exchange revaluation date" (`exchange_date`) that the page itself then ignores — it always
//     revalues at today's rate;
//   - each line prints the entered amounts with the amount in the account currency below, then the
//     new amount at today's rate (with that rate below) and the unrealized gain/loss with an arrow
//     (green up = gain, red down = loss, amber = nothing).

export interface ExchangeRow {
  pieceNum: string
  journal: string
  date: string
  docRef: string
  account: string
  currency: string
  rate: string
  debit: string
  debitConverted: string
  credit: string
  creditConverted: string
  newAmount: string
  revaluationRate: string
  gainLoss: string
  trend: 'up' | 'down' | 'none'
}
export interface ExchangeOption {
  value: string
  label: string
}
export interface ExchangeList {
  // Header cells as the page prints them (amount headers name the currency).
  headers: string[]
  rows: ExchangeRow[]
  // Page totals for the debit and credit columns.
  totals: { debit: string; credit: string } | null
  filters: { currency: string; dateStart: string; dateEnd: string; account: string; exchangeDate: string }
  accountOptions: ExchangeOption[]
  limit: number
  limitOptions: number[]
  page: number
  hasPrev: boolean
  hasNext: boolean
  // "For the period of … To …" as the page prints it under its title.
  period: string
}
