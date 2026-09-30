import { describe, expect, it } from 'vitest'
import { readVatByCustomer } from './vatByCustomerParser'

const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html')

// Trimmed from the live page (172.16.5.10): the period caption, both sections (a customer line has
// the VAT rate in its 4th cell, a vendor line the vendor), group totals and "Total to pay".
const PAGE = `<div class="print_value"><div class="div_subhead">Report by customer-Sales tax</div><div class="sub_head"> For The Period of 01-04-2026&nbsp;To&nbsp;30-06-2026</div></div>
<table class="table bd_border" width="100%"><tr class="liste_titre"><td class="left">Customers invoices</td><td class="left">Invoice date</td><td class="left">Date of payment</td><td class="right"></td><td class="left">Description</td><td class="right">Amount (excl. tax)</td><td class="right">Payment (%/invoice)</td><td class="right">Net collected</td><td class="right">Tax received</td></tr>
<tr><td class="tax_rate text-center" colspan="9">Third-party: <a href="/societe/card.php?socid=5" class="classforajaxtooltip"><div class="avatar-circle">CU</div>customer1</a><br><small class="text-muted">Voxforem Technologies</small></td></tr>
<tr class="oddeven"><td class="nowrap left"><a href="/compta/sales/card.php?facid=1"><span class="fa-bill"></span>INV-26-0001</a></td><td class="left">05/18/2026</td><td class="left"></td><td class="right">16.000</td><td class="left"><a href="/productinfo/index.php?id=1" class="nowraponall"><div class="d-flex"><span><i class="fa fa-box"></i></span><div class="d-flex flex-column"><span class="small text-muted">Ref: 001</span></div></div></a> - 001 - Product1</td><td class="nowrap right"><span class="amount">431.0345</span></td><td class="nowrap right">NA</td><td class="nowrap right"><span class="amount">431.0345</span></td><td class="nowrap right"><span class="amount">68.9655</span></td></tr>
<tr class="liste_total"><td class="liste_total">Total:</td><td>&nbsp;</td><td>&nbsp;</td><td class="liste_total"></td><td></td><td class="liste_total nowrap right">3,877.3296</td><td></td><td class="liste_total nowrap right">628.6704</td></tr>
<tr><td colspan="9">&nbsp;</td></tr>
<tr class="liste_titre liste_titre_topborder"><td class="left">Vendors invoices</td><td class="left">Invoice date</td><td class="left">Date of payment</td><td class="right"></td><td class="left">Description</td><td class="right">Amount (excl. tax)</td><td class="right">Payment (%/invoice)</td><td class="right">Net paid</td><td class="right">Tax paid</td></tr>
<tr><td class="tax_rate" colspan="9">Third-party: <a href="/societe/card.php?socid=1972"><div class="avatar-circle">RA</div>RAHUL</a></td></tr>
<tr class="oddeven"><td class="nowrap left"><a href="/fourn/purchase/card.php?id=48">SI2604-0045</a></td><td class="left">04/01/2026</td><td class="left"></td><td class="tdmaxoverflow150"><a href="/societe/card.php?socid=1972"><div class="avatar-circle">RA</div>RAHUL</a></td><td class="left"><a href="/productinfo/index.php?id=169"><div><span class="small text-muted">Ref: Milk</span></div></a> - Milk - Milk</td><td class="nowrap right"><span class="amount">86.2069</span></td><td class="nowrap right">NA</td><td class="nowrap right"><span class="amount">86.2069</span></td><td class="nowrap right"><span class="amount">13.7931</span></td></tr>
<tr class="liste_total"><td class="liste_total">Total:</td><td>&nbsp;</td><td>&nbsp;</td><td></td><td></td><td class="right">1,862.0689</td><td></td><td class="right">297.9309</td></tr>
<tr class="liste_total"><td class="liste_total" colspan="8">Total to pay</td><td class="liste_total nowrap right"><b>8,305.3258</b></td></tr></table>
<input type="text" name="min" value="1000">`

describe('readVatByCustomer', () => {
  it('reads the period and the two sections with their headers', () => {
    const page = readVatByCustomer(parse(PAGE))
    expect(page).toMatchObject({ dateStart: '2026-04-01', dateEnd: '2026-06-30', min: '1000', totalToPay: '8,305.3258' })
    expect(page.sections).toHaveLength(2)
    expect(page.sections[0].headers[0]).toBe('Customers invoices')
    expect(page.sections[0].headers[8]).toBe('Tax received')
    expect(page.sections[1].headers[0]).toBe('Vendors invoices')
    expect(page.sections[1].headers[7]).toBe('Net paid')
  })

  it('reads a customer group: the party without its avatar letters, its lines and its total', () => {
    const [group] = readVatByCustomer(parse(PAGE)).sections[0].groups
    expect(group.party).toEqual({ text: 'customer1', href: '/societe/card.php?socid=5' })
    expect(group.note).toBe('Voxforem Technologies')
    expect(group).toMatchObject({ totalNet: '3,877.3296', totalTax: '628.6704' })
    expect(group.lines).toHaveLength(1)
    expect(group.lines[0]).toEqual({
      ref: { text: 'INV-26-0001', href: '/compta/sales/card.php?facid=1' },
      date: '05/18/2026',
      datePayment: '',
      rateOrParty: { text: '16.000', href: null },
      productRef: 'Ref: 001',
      productHref: '/productinfo/index.php?id=1',
      description: '001 - Product1',
      amount: '431.0345',
      payment: 'NA',
      net: '431.0345',
      tax: '68.9655',
    })
  })

  it('reads a vendor line, whose 4th cell is the vendor', () => {
    const line = readVatByCustomer(parse(PAGE)).sections[1].groups[0].lines[0]
    expect(line.ref.href).toBe('/fourn/purchase/card.php?id=48')
    expect(line.rateOrParty).toEqual({ text: 'RAHUL', href: '/societe/card.php?socid=1972' })
    expect(line.description).toBe('Milk - Milk')
  })

  it('refuses a page without the report', () => {
    expect(() => readVatByCustomer(parse('<div>Access denied</div>'))).toThrow(/not recognised/)
  })
})
