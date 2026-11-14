// Types of the financialList page. The HTML parser that used to sit next to them was removed on 12 Nov 2026: the page reads its JSON endpoint now.

// accountancy/closure/financiallist.php?year=YYYY — "Financial List". Verified against the dev
// backends and the page's own PHP. Server-rendered, no JSON:
//   - a "Creation Details" card of `<h4>` lines "Created BY :…", "Approved BY :…", "Date :…",
//     "Comments :…" (the closing recorded for the year, blank when there is none);
//   - an "Invoices Created" card of `<h4>` lines "Total Sales :<a onclick="loadInvoices('sales',
//     YYYY)">0 Bills - 0.00</a>" (also Purchase, Expences and Bank Entries "57 Entries - D: … / C: …");
//     the links open the page's own invoice list, which is a separate JSON endpoint;
//   - `table#chartOfAccountsTable`: account number, name, journal code, total debit, total credit,
//     balance per account and journal, an "Opening Balance (Previous Years)" row whose label spans
//     three columns, and a `tfoot` "Grand Total" row spanning the same way.

export type FinancialListInvoiceType = 'sales' | 'purchase' | 'expense' | 'bank'
export interface FinancialListCell {
  text: string
  span: number
}
export interface FinancialListPage {
  year: string
  createdBy: string
  approvedBy: string
  date: string
  comments: string
  // The text of each "Total …" link, e.g. "5 Bills - 600.00".
  invoices: Record<FinancialListInvoiceType, string>
  headers: string[]
  rows: FinancialListCell[][]
  grandTotal: FinancialListCell[]
}
