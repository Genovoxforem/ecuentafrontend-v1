import { describe, expect, it } from 'vitest'
import { parseBoundLines } from './boundLinesParser'

const head = (cols: string[]) => `<tr class="liste_titre"><th>${cols.join('</th><th>')}</th><th><input type="checkbox" class="checkforselect"></th></tr>`

const page = (cols: string[], cells: string[]) => `<form method="POST"><input type="hidden" name="token" value="tok"><input type="hidden" name="page" value="0">
<select name="account_parent"><option value="0">--- None ---</option><option value="5">1084 - Purchase of goods</option></select>
<table>${head(cols)}<tr class="oddeven">${cells.map((c) => `<td>${c}</td>`).join('')}<td><input type="checkbox" name="changeaccount[]" value="7"></td></tr></table></form>`

const common = {
  prod: '<a href="/product/card.php?id=3687"><span class="small">Ref: RW-015</span> Zonnebloem Shiraz</a>',
  soc: '<a href="/societe/card.php?socid=1"><span>W</span> walkingvendor</a>',
}

describe('parseBoundLines column mapping', () => {
  it('reads the customer layout (no invoice label column)', () => {
    const cols = ['Id line', 'Invoice', 'Date', 'ProductRef', 'Description', 'Amount', 'Tax Rate', 'Third-party', 'Country', 'VAT Intra', 'Accounting account']
    const cells = ['7', '<a href="/compta/facture/card.php?facid=9">FA1</a>', '01/02/2026', common.prod, 'desc', '10.00', '16', common.soc, 'Zambia', 'VAT1', '1084 - X <a href="#">edit</a>']
    const r = parseBoundLines(new DOMParser().parseFromString(page(cols, cells), 'text/html')).rows[0]
    expect(r).toMatchObject({ lineId: '7', invoiceId: '9', invoiceRef: 'FA1', date: '01/02/2026', productId: '3687', productRef: 'RW-015', amount: '10.00', taxRate: '16', thirdPartyId: '1', thirdParty: 'walkingvendor', country: 'Zambia', vatId: 'VAT1', account: '1084 - X' })
  })

  it('reads the vendor layout (extra Invoice label column)', () => {
    const cols = ['Id line', 'Invoice', 'Invoice label', 'Date', 'ProductRef', 'Description', 'Amount', 'Tax Rate', 'ThirdParty', 'Country', 'VATIntra', 'Accounting account']
    const cells = ['7', '<a href="/fourn/purchase/card.php?facid=2">SI2609-0001</a>', 'Some label', '09/25/2026', common.prod, 'desc', '482.7586', '16 (B)', common.soc, 'Zambia', 'VAT1', '1084 - X <a href="#">edit</a>']
    const r = parseBoundLines(new DOMParser().parseFromString(page(cols, cells), 'text/html')).rows[0]
    expect(r).toMatchObject({ lineId: '7', invoiceId: '2', invoiceRef: 'SI2609-0001', date: '09/25/2026', productId: '3687', productRef: 'RW-015', description: 'desc', amount: '482.7586', taxRate: '16 (B)', thirdPartyId: '1', thirdParty: 'walkingvendor', country: 'Zambia', vatId: 'VAT1', account: '1084 - X' })
  })
})
