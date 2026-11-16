// Types of the bindExpenseLines page. The HTML parser that used to sit next to them was removed on 12 Nov 2026: the page reads its JSON endpoint now.

// accountancy/expensereport/list.php — "Lines of expense reports to bind" (the
// expense report "ToDispatch" screen; 11 cells per row, the description cell
// keeps its full text in a tooltip): one POST form (hidden action=ventil +
// token, a Bind mass action) whose header is
//   Employee | Id line | Expense report | Date of line | Types of fees |
//   Description | Amount | Tax Rate | Accounting account suggested |
//   Bind line with the accounting account | [checkbox]
// Same architecture as customer/list.php: each line carries a select
// `codeventil<lineId>` pre-set to the suggested account and a checkbox
// `toselect[]`. Columns are found by header text.

export interface BindExpenseLine {
  lineId: string
  selectValue: string
  employee: string
  employeeId: string
  // The user's photo as the page prints it (`/viewimage.php?modulepart=userphoto…`), '' when there is none.
  employeePhoto: string
  reportId: string
  reportRef: string
  date: string
  feeType: string
  description: string
  amount: string
  taxRate: string
  suggestedAccount: string
  selectedAccount: string
  // The page prints the box already ticked for a line that has a suggested account.
  checked: boolean
}
export interface BindExpenseLinesPage {
  token: string
  info: string
  sortfield: string
  sortorder: string
  accounts: { value: string; label: string }[]
  rows: BindExpenseLine[]
}
