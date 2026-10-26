// The YTD earnings and deductions report, as payroll/fapi/ytd_earnings_deductions.php answers it (mapped in
// payrollLists.queries.ts): a heading, an optional grouped header row (Allowances / Deductions with a column span), the
// column labels, and one row per employee with its values. The columns come from whatever the backend returned, not from a
// fixed list. The classic report page used to be parsed for this; that parser has been removed.

export interface YtdEarningsDeductionsGroup {
  label: string
  colSpan: number
}

export interface YtdEarningsDeductionsRow {
  employeeName: string
  values: string[]
}

export interface YtdEarningsDeductionsReport {
  heading: string
  groups: YtdEarningsDeductionsGroup[]
  columns: string[]
  rows: YtdEarningsDeductionsRow[]
}
