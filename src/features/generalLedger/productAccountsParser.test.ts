import { describe, expect, it } from 'vitest'
import { parseProductAccounts } from './productAccountsParser'

const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html')

// Trimmed from the real page: intro alert, the Options table with one radio per mode, the filter
// row, then a product row with its account select and checkbox.
const PAGE =
  '<div class="alert alert-info mt-3">This page can be used to initialize an accounting account.</div>' +
  '<form><input type="hidden" name="token" value="tokP">' +
  '<table><tr><td>Options</td><td>Description</td></tr>' +
  '<tr class="oddeven"><td><input type="radio" name="accounting_product_mode" value="ACCOUNTANCY_SELL" checked=""> Mode sales</td><td>Show all products with accounting account for sales.</td></tr>' +
  '<tr class="oddeven"><td><input type="radio" name="accounting_product_mode" value="ACCOUNTANCY_BUY"> Mode purchases</td><td>Show all products with accounting account for purchases.</td></tr></table>' +
  '<table><tr><th>Ref.</th><th>Label</th><th>Tax Rate</th><th>For Sale</th><th>Current Dedicated Account</th><th>New Account To Assign</th></tr>' +
  '<tr><td><a href="/product/card.php?id=7">Coca Cola<span class="small">Ref: B-001</span></a></td><td>Coca Cola</td><td>0</td><td><span title="On Sell"></span></td><td></td>' +
  '<td><select name="codeventil_7"><option value="5017" selected="">5017 - Sales</option></select></td><td><input type="checkbox" name="chk_prod[]" value="7"></td></tr></table></form>'

describe('parseProductAccounts', () => {
  it('reads the intro note, each mode with its description, and the products', () => {
    const page = parseProductAccounts(parse(PAGE))
    expect(page.token).toBe('tokP')
    expect(page.intro).toBe('This page can be used to initialize an accounting account.')
    expect(page.mode).toBe('ACCOUNTANCY_SELL')
    expect(page.modes).toEqual([
      { value: 'ACCOUNTANCY_SELL', label: 'Mode sales', description: 'Show all products with accounting account for sales.' },
      { value: 'ACCOUNTANCY_BUY', label: 'Mode purchases', description: 'Show all products with accounting account for purchases.' },
    ])
    expect(page.rows).toHaveLength(1)
    expect(page.rows[0]).toMatchObject({ id: '7', ref: 'B-001', label: 'Coca Cola', taxRate: '0', forSale: 'On Sell', selectedAccount: '5017' })
  })
})
