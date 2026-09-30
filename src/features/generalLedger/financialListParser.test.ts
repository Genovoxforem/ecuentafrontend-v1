import { describe, expect, it } from 'vitest'
import { parseFinancialList } from './financialListParser'

const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html')

// Shaped like the real financiallist.php.
const PAGE = (created: string) =>
  '<form><input name="year" value="2026"></form>' +
  `<h2>Creation Details</h2><h4>Created BY  \t:${created}</h4><h4>Approved BY  \t:${created}</h4><h4>Date            :${created ? '01/20/2026' : ''} </h4><h4>Comments        :</h4>` +
  '<h2>Invoices Created</h2>' +
  `<h4>Total Sales \t\t:<a onclick="loadInvoices('sales', 2026)">0 Bills - 0.00</a></h4><h4>Total Purchase \t\t:<a onclick="loadInvoices('purchase', 2026)">0 Bills - 0.00</a></h4>` +
  `<h4>Total Expences \t\t:<a onclick="loadInvoices('expense', 2026)">5 Bills - 600.00</a></h4><h4>Total Bank Entries \t:<a onclick="loadInvoices('bank', 2026)">57 Entries - D: 913,005.72 / C: 913,005.72</a></h4>` +
  '<table id="chartOfAccountsTable"><thead><tr><th>Account Number</th><th>Account Name</th><th>Journal Code</th><th>Total Debit</th><th>Total Credit</th><th>Balance</th></tr></thead><tbody>' +
  '<tr><td colspan="3">Opening Balance (Previous Years)</td><td>0.00</td><td>0.00</td><td>0.00</td></tr>' +
  '<tr><td>10</td><td>Non-current assets</td><td>AC</td><td>100.00</td><td>0.00</td><td>100.00</td></tr></tbody>' +
  '<tfoot><tr><th colspan="3">Grand Total</th><th>1,454,068.62</th><th>1,454,068.57</th><th>0.05</th></tr></tfoot></table>'

describe('parseFinancialList', () => {
  it('reads the creation details, the invoice totals and the debit/credit summary', () => {
    const page = parseFinancialList(parse(PAGE('Sayuj v')))
    expect(page).toMatchObject({ year: '2026', createdBy: 'Sayuj v', approvedBy: 'Sayuj v', date: '01/20/2026', comments: '' })
    expect(page.invoices).toEqual({ sales: '0 Bills - 0.00', purchase: '0 Bills - 0.00', expense: '5 Bills - 600.00', bank: '57 Entries - D: 913,005.72 / C: 913,005.72' })
    expect(page.headers).toEqual(['Account Number', 'Account Name', 'Journal Code', 'Total Debit', 'Total Credit', 'Balance'])
    expect(page.rows).toHaveLength(2)
    // the opening balance label spans the first three columns
    expect(page.rows[0].map((c) => [c.text, c.span])).toEqual([['Opening Balance (Previous Years)', 3], ['0.00', 1], ['0.00', 1], ['0.00', 1]])
    expect(page.rows[1].map((c) => c.text)).toEqual(['10', 'Non-current assets', 'AC', '100.00', '0.00', '100.00'])
    expect(page.grandTotal.map((c) => [c.text, c.span])).toEqual([['Grand Total', 3], ['1,454,068.62', 1], ['1,454,068.57', 1], ['0.05', 1]])
  })

  it('leaves the creation details blank for a year with no closing, and refuses a foreign page', () => {
    const page = parseFinancialList(parse(PAGE('')))
    expect(page).toMatchObject({ createdBy: '', approvedBy: '', date: '' })
    expect(() => parseFinancialList(parse('<div>Access denied</div>'))).toThrow(/not recognised/)
  })
})
