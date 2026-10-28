// The "Bank entries by category" report (classic compta/bank/budget.php): count, total and average of
// the bank entries per transaction tag. Filled from compta/bank/fapi/by_category.php (bankingFapi.ts).
export interface BankBudgetRow {
  category: string
  count: string
  total: string
  average: string
}

export interface BankBudget {
  rows: BankBudgetRow[]
  // The classic totals row shows Total and Average only, no total for the Nb column.
  totalTotal: string
  totalAverage: string
}
