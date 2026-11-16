// Types of the bindLines page. The HTML parser that used to sit next to them was removed on 12 Nov 2026: the page reads its JSON endpoint now.

// accountancy/customer/list.php — "Lines of invoices to bind" (the customer
// "ToDispatch" screen). One form (POST, hidden action=ventil + token) around
// a table where every unbound invoice line has: a select `codeventil<lineId>`
// pre-set to the suggested account, and a checkbox `toselect[]` with value
// "<lineId>_0". Choosing massaction "Bind" and pressing Confirm binds the
// ticked lines. `limit` and `page` are plain GET params; the page embeds all
// ~370 account options in every row (megabytes per page), so the option
// list is read once from the first row.

export interface BindLine {
  lineId: string
  selectValue: string // the checkbox value as printed ("<lineId>_<row index>")
  invoiceId: string
  invoiceRef: string
  date: string
  productId: string
  productName: string
  productRef: string
  description: string
  amount: string
  taxRate: string
  thirdPartyId: string
  thirdParty: string
  country: string
  vatId: string
  defaultAccount: string
  productAccount: string // "" when the backend says "Not defined"
  selectedAccount: string // option value pre-selected by the backend
}
export interface BindLinesPage {
  token: string
  info: string
  limit: number
  page: number
  pageCount: number
  sortfield: string
  sortorder: string
  accounts: { value: string; label: string }[]
  rows: BindLine[]
}
