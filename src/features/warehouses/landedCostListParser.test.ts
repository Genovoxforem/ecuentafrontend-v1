import { describe, expect, it } from 'vitest'
import { parseLandedCostList } from './landedCostListParser'

const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html')

const SELECT = '<select name="product_id"><option value="">-- Select Product --</option><option value="7">Chicken Korma</option><option value="9">Naan</option></select>'
const HEAD = '<thead><tr><th>Date</th><th>Ref</th><th>Product</th><th>Vendor</th><th>service/expense</th><th>Amount</th><th>Allocated Amount</th><th>Unallocated Amount</th></tr></thead>'

const INVOICE = (id: number, ref: string) => `<td><a href="/fourn/purchase/card.php?facid=${id}&amp;save_lastsearch_values=1" class="classfortooltip"><span></span>${ref}</a></td>`
const VENDOR = (id: number, name: string) => `<td><a href="/societe/card.php?socid=${id}&amp;save_lastsearch_values=1" class="refurl"><div class="avatar-circle">WA</div>${name}</a></td>`

// The row exactly as the real page prints it before PHP dies: 7 cells, then an unclosed comment.
const BROKEN_ROW =
  `<tr> <td>2026-09-22 16:21:19</td> ${INVOICE(11, 'SI2609-0008')} <td>Chicken Korma</td> ${VENDOR(1, 'walkingvendor')} <td>Chicken Korma</td> <td>0.00</td> <td>25.00</td> ` +
  "<!-- <td><br /> <font size='1'><table class='xdebug-error'><tr><th>( ! )</th><th>Fatal error: Uncaught TypeError: Unsupported operand types: string - null</th></tr>"

describe('parseLandedCostList', () => {
  it('reads the row the backend prints before it fails, and reports the list as incomplete', () => {
    const data = parseLandedCostList(parse(`${SELECT}<table id="example">${HEAD}<tbody>${BROKEN_ROW}`))
    expect(data.incomplete).toBe(true)
    expect(data.products).toEqual([
      { id: '7', label: 'Chicken Korma' },
      { id: '9', label: 'Naan' },
    ])
    expect(data.rows).toEqual([
      {
        key: '0',
        date: '2026-09-22 16:21:19',
        invoiceRef: 'SI2609-0008',
        invoiceId: '11',
        product: 'Chicken Korma',
        vendor: 'walkingvendor',
        vendorId: '1',
        expense: 'Chicken Korma',
        amount: 0,
        allocated: 25,
        // the cell the page never printed: landed cost - allocated
        unallocated: -25,
      },
    ])
  })

  it('reads a complete list with all eight cells', () => {
    const row = (id: number, alloc: string, unalloc: string) =>
      `<tr><td>2026-09-2${id}</td>${INVOICE(id, `SI-${id}`)}<td>Naan</td>${VENDOR(2, 'Acme')}<td>Freight</td><td>1,200.50</td><td>${alloc}</td><td>${unalloc}</td></tr>`
    const data = parseLandedCostList(parse(`<table id="example">${HEAD}<tbody>${row(1, '200.00', '1,000.50')}${row(2, '0.00', '1,200.50')}</tbody></table>`))
    expect(data.incomplete).toBe(false)
    expect(data.rows.map((r) => [r.invoiceRef, r.amount, r.allocated, r.unallocated])).toEqual([
      ['SI-1', 1200.5, 200, 1000.5],
      ['SI-2', 1200.5, 0, 1200.5],
    ])
  })

  it('finds the vendor by its link when the invoice has no product cell', () => {
    const noProduct = `<tr><td>2026-09-25</td>${INVOICE(5, 'SI-5')}${VENDOR(3, 'Solo')}<td>Duty</td><td>50.00</td><td>10.00</td><td>40.00</td></tr>`
    const data = parseLandedCostList(parse(`<table id="example">${HEAD}<tbody>${noProduct}</tbody></table>`))
    expect(data.rows[0]).toMatchObject({ product: '', vendor: 'Solo', vendorId: '3', expense: 'Duty', amount: 50, allocated: 10, unallocated: 40 })
  })

  it('returns no rows for an empty list and refuses a page that is not the list', () => {
    expect(parseLandedCostList(parse(`<table id="example">${HEAD}<tbody></tbody></table>`)).rows).toEqual([])
    expect(() => parseLandedCostList(parse('<div>Access denied</div>'))).toThrow(/not recognised/)
  })
})
