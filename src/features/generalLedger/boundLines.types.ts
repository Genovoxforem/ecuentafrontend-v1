// Types of the boundLines page. The HTML parser that used to sit next to them was removed on 12 Nov 2026: the page reads its JSON endpoint now.

// accountancy/customer/lines.php — "Bound lines of invoices" (the customer
// "Dispatched" screen): one POST form (token) around a table where every
// bound invoice line has a `changeaccount[]` checkbox (value = facturedet
// rowid). The bulk "Change the binding" button posts the ticked ids plus
// `account_parent` (an account option value, "0" = none) and runs
// UPDATE facturedet SET fk_code_ventilation=… — a single-line edit uses the
// same request with one id. `limit` / `page` are plain GET params.

export interface BoundLine {
  lineId: string
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
  account: string
}
export interface BoundLinesPage {
  token: string
  info: string
  limit: number
  page: number
  pageCount: number
  accounts: { value: string; label: string }[] // includes "0" = --- None ---
  rows: BoundLine[]
}
