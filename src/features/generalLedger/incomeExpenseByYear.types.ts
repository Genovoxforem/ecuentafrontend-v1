// The "Balance of income and expenses, by year" report (Reporting > income and expenses). Data: compta/resultat/fapi/reporting_area.php,
// mapped to these display values by mapReportingArea (reportsFapi.ts). The screen is a read-only table: a two-level header (each year spans
// an Expense and an Income column), 12 month rows, a Total row and an "Accounting result" row with one value per year. The last year shown
// and the accounting basis (BOOKKEEPING, RECETTES-DEPENSES or CREANCES-DETTES) are the two request parameters.

/** One month of the report; `values` has one entry per year, in the order of `IncomeExpenseByYear.years`. */
export interface IncomeExpenseMonthRow {
  month: string
  values: { expense: string; income: string }[]
}

export interface IncomeExpenseByYear {
  title: string
  period: string
  years: string[]
  months: IncomeExpenseMonthRow[]
  totalLabel: string
  totals: { expense: string; income: string }[]
  resultLabel: string
  results: string[]
}
