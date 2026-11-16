// Types of the boundExpenseLines page. The HTML parser that used to sit next to them was removed on 12 Nov 2026: the page reads its JSON endpoint now.

// accountancy/expensereport/lines.php — "Bound lines of expense reports" (the
// expense report "Dispatched" screen). The PHP source shows the row template.
// Same architecture as the customer lines.php: one POST form (token) around
// a table with a `changeaccount[]` checkbox per bound line; "Change the
// binding" posts the ticked ids plus account_parent and runs UPDATE
// expensereport_det SET fk_code_ventilation. Only approved/closed expense
// reports are listed. Columns are mapped by header text because the
// optional "Validation date" column may be present.

export interface BoundExpenseLine {
  lineId: string
  employee: string
  employeeId: string
  employeePhoto: string
  reportId: string
  reportRef: string
  validationDate: string
  date: string
  feeType: string
  description: string
  amount: string
  taxRate: string
  account: string
}
export interface BoundExpenseLinesPage {
  token: string
  info: string
  limit: number
  page: number
  pageCount: number
  accounts: { value: string; label: string }[] // includes "0" = --- None ---
  rows: BoundExpenseLine[]
}
