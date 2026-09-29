import { describe, expect, it } from 'vitest'
import { readAccountingFiles, stripPhpWarnings } from './accountingFilesParser'

const parse = (html: string) => new DOMParser().parseFromString(stripPhpWarnings(html), 'text/html')

const FORM = (checked: string[]) =>
  `<form autocomplete="off" name="searchfiles" action="?action=searchfiles" method="POST"><input type="hidden" name="token" value="tok1"><label class="form-label">Report period: </label><input type="text" name="newdatepicker" id="config-demo"><label class="form-label"><span class="marginleftonly opacitymedium">(Environment :Master entity)</span></label><div>` +
  [
    ['selectinvoices', 'Invoices'],
    ['selectsupplierinvoices', 'Vendor invoices'],
    ['selectloanspayment', 'Loan payment'],
  ]
    .map(([n, l]) => `<input type="checkbox" class="btn-check" id="${n}" name="${n}" value="1"${checked.includes(n) ? ' checked="checked"' : ''} autocomplete="off"><label class="btn btn-outline-primary" for="${n}">${l}</label>`)
    .join('') +
  `</div><input class="button" type="submit" name="search" value="Search"></form>`

// PHP warnings the way the dev backend prints them: one inside a cell (harmless) and one straight
// after a cell, inside the row, which would split the results table if it were not removed first.
const WARNING = `<br />
<font size='1'><table class='xdebug-error xe-warning' dir='ltr' border='1' cellspacing='0' cellpadding='1'>
<tr><th align='left' bgcolor='#f57900' colspan="5"><span>( ! )</span> Warning: Undefined array key "currency" in C:\\x\\accounting-files.php on line <i>677</i></th></tr>
<tr><th align='left' bgcolor='#e9b96e' colspan='5'>Call Stack</th></tr>
</table></font>
`

const RESULTS = `<div class="createLightBoxShadowDiv"><form autocomplete="off" name="dl" action="/compta/accounting-files.php?action=dl" method="POST"><input type="hidden" name="token" value="tokDL"><span class="dateSpace">01/01/2026 - 12/31/2026</span><input type="hidden" name="date_start" value="20260101" /><input type="hidden" name="date_stop"  value="20261231" /><input type="hidden" name="selectinvoices" value="1"><input type="hidden" name="selectsupplierinvoices" value=""><input class="butAction butDownload" type="submit" value="Download Report" /></form></div>
<div class="div-table-responsive"><table class="newCustomUItable"><tr><th class="nowrap" title="Type">Type</a></th><th title="Date">Date</a></th><th title="Due date">Due date</a></th><th title="Ref.">Ref.</th><td>Document</td><td>Paid</td><td align="right">Total (excl. tax) (ZMW)</td><td align="right">Total (inc. tax) (ZMW)</td><td align="right">Total tax (ZMW)</td><td>Third-party</td><td>Code</td><td>Country</td><td>VAT ID</td><td>Currency</td></tr>
<tr class="oddeven "><td>Vendor invoice</td><td>09/28/2026</td>
<td></td>
<td class="nowraponall">${WARNING}<a href="/fourn/purchase/card.php?id=183" class="classfortooltip"><span class="fas"></span>SI2609-0148</a></td><td></td>
<td aling="left">1</td><td align="right">-21.5515</td>
<td align="right">-25.00</td>
<td align="right">-3.4482</td>
<td class="tdoverflowmax150" title="AUTOWORLD LIMITED">AUTOWORLD LIMITED</td>
<td>SU2606-00028</td>
<td>ZM</td>
<td align="right"></td>
${WARNING}<td></td>
</tr>
<tr class="oddeven "><td>Invoice</td><td>09/27/2026</td><td>10/27/2026</td><td class="nowraponall"><a href="/compta/sales/card.php?facid=289" class="classfortooltip">SI2609-0150</a></td><td><a href="/document.php?modulepart=facture&amp;file=SI2609-0150%2FSI2609-0150.pdf" target="_blank">SI2609-0150.pdf</a>&nbsp;<a href="/document.php?modulepart=facture&amp;file=SI2609-0150%2FSI2609-0150.pdf" class="documentpreview"><span class="fa fa-search-plus"></span></a><br></td>
<td aling="left">0</td><td align="right">100.00</td><td align="right">116.00</td><td align="right">16.00</td><td>Customer1</td><td>CU250200001</td><td>ZM</td><td align="right"></td><td>ZMW</td></tr>
<tr class="totalRow"><td colspan="6" class="right">Total Income</td><td align="right">100.00</td><td align="right">116.00</td><td align="right">16.00</td><td colspan="4"></td><td></td></tr>
<tr class="totalRow"><td colspan="6" class="right">Total Expense</td><td align="right">-21.5515</td><td align="right">-25.00</td><td align="right">-3.4482</td><td colspan="4"></td><td></td></tr>
<tr class="totalRow"><td colspan="6" class="right">Total</td><td align="right">78.4485</td><td align="right">91.00</td><td align="right">12.5518</td><td colspan="4"></td><td></td></tr></table></div>`

describe('readAccountingFiles', () => {
  it('reads the kinds of document with their state, and shows no result before a search', () => {
    const page = readAccountingFiles(parse(FORM(['selectinvoices', 'selectloanspayment'])))
    expect(page.environment).toBe('(Environment :Master entity)')
    expect(page.choices).toEqual([
      { name: 'selectinvoices', label: 'Invoices', checked: true },
      { name: 'selectsupplierinvoices', label: 'Vendor invoices', checked: false },
      { name: 'selectloanspayment', label: 'Loan payment', checked: true },
    ])
    expect(page).toMatchObject({ searched: false, rows: [], totals: [], downloadFields: {} })
  })

  it('reads every result row even though the page prints PHP warnings inside the rows', () => {
    const page = readAccountingFiles(parse(FORM([]) + RESULTS))
    expect(page.searched).toBe(true)
    expect(page.period).toBe('01/01/2026 - 12/31/2026')
    expect(page.headers).toHaveLength(14)
    expect(page.rows).toHaveLength(2)
    expect(page.rows[0]).toMatchObject({
      type: 'Vendor invoice',
      date: '09/28/2026',
      dateDue: '',
      ref: { text: 'SI2609-0148', href: '/fourn/purchase/card.php?id=183' },
      documents: [],
      paid: '1',
      totalHt: '-21.5515',
      totalTtc: '-25.00',
      totalVat: '-3.4482',
      thirdParty: 'AUTOWORLD LIMITED',
      code: 'SU2606-00028',
      country: 'ZM',
    })
    expect(page.rows[1]).toMatchObject({ type: 'Invoice', ref: { text: 'SI2609-0150', href: '/compta/sales/card.php?facid=289' }, thirdParty: 'Customer1', currency: 'ZMW' })
  })

  it('keeps the file name links and drops the preview icon link', () => {
    const page = readAccountingFiles(parse(FORM([]) + RESULTS))
    expect(page.rows[1].documents).toEqual([{ text: 'SI2609-0150.pdf', href: '/document.php?modulepart=facture&file=SI2609-0150%2FSI2609-0150.pdf' }])
  })

  it('reads the three total rows and the download form fields', () => {
    const page = readAccountingFiles(parse(FORM([]) + RESULTS))
    expect(page.totals).toEqual([
      { label: 'Total Income', ht: '100.00', ttc: '116.00', vat: '16.00' },
      { label: 'Total Expense', ht: '-21.5515', ttc: '-25.00', vat: '-3.4482' },
      { label: 'Total', ht: '78.4485', ttc: '91.00', vat: '12.5518' },
    ])
    expect(page.downloadFields).toEqual({ token: 'tokDL', date_start: '20260101', date_stop: '20261231', selectinvoices: '1', selectsupplierinvoices: '' })
  })

  it('refuses a page without the form', () => {
    expect(() => readAccountingFiles(parse('<div>Access denied</div>'))).toThrow(/not recognised/)
  })
})

describe('stripPhpWarnings', () => {
  it('removes the warning tables and leaves the rest untouched', () => {
    expect(stripPhpWarnings(`<td>a</td>${WARNING}<td>b</td>`)).toBe('<td>a</td>\n<td>b</td>')
  })
})
