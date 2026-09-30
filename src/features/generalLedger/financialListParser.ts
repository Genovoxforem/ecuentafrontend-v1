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

const clean = (value: string | null | undefined) => (value ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim()

const cellsOf = (tr: Element): FinancialListCell[] => Array.from(tr.children).map((c) => ({ text: clean(c.textContent), span: Number(c.getAttribute('colspan')) || 1 }))

export function parseFinancialList(doc: Document): FinancialListPage {
  const table = doc.querySelector('table#chartOfAccountsTable')
  if (!table) throw new Error('The financial list on this backend page was not recognised.')

  // "<label> :<value>" lines.
  const lines = new Map<string, string>()
  doc.querySelectorAll('h4').forEach((h) => {
    const m = clean(h.textContent).match(/^([^:]+?)\s*:\s*(.*)$/)
    if (m) lines.set(m[1].toLowerCase(), m[2])
  })
  const line = (label: string) => lines.get(label) ?? ''

  return {
    year: doc.querySelector<HTMLInputElement>('input[name="year"]')?.getAttribute('value') ?? '',
    createdBy: line('created by'),
    approvedBy: line('approved by'),
    date: line('date'),
    comments: line('comments'),
    invoices: { sales: line('total sales'), purchase: line('total purchase'), expense: line('total expences'), bank: line('total bank entries') },
    headers: Array.from(table.querySelectorAll('thead th')).map((th) => clean(th.textContent)),
    rows: Array.from(table.querySelectorAll('tbody tr')).map(cellsOf),
    grandTotal: cellsOf(table.querySelector('tfoot tr') ?? table),
  }
}
