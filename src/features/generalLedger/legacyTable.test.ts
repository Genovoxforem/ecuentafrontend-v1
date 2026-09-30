import { describe, expect, it } from 'vitest'
import { readLegacyTable, readAllLegacyTables } from './legacyTable'

const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html')

describe('readLegacyTable', () => {
  const stock = parse(`<table>
<tr class="liste_titre_filter"><td><input name="search_ref"></td><td><input name="month"><input name="year"></td><td><select name="search_warehouse"><option value="-1">Select</option><option value="1">MAIN</option></select></td><td></td></tr>
<tr><th><input type="checkbox" name="prodetall"> REF</th><th>Date</th><th>Warehouse</th><th>ZRA Status</th></tr>
<tr class="oddeven"><td><input type="checkbox" class="productCheckbox" data-id="225">225</td><td>09/16/2026</td><td><a href="/product/stock/card.php?id=1">MAIN</a></td><td>Error</td></tr>
<tr class="oddeven"><td><input type="checkbox" class="productCheckbox" data-id="203">203</td><td>09/11/2026</td><td>M1</td><td>Error</td></tr>
</table>`)

  it('finds the header, the rows and each row selection id', () => {
    const t = readLegacyTable(stock, /^REF/)!
    expect(t.headers).toEqual(['REF', 'Date', 'Warehouse', 'ZRA Status'])
    expect(t.rows.map((r) => r[0].checkId)).toEqual(['225', '203'])
    expect(t.rows[0].map((c) => c.text)).toEqual(['225', '09/16/2026', 'MAIN', 'Error'])
    expect(t.rows[0][2].href).toBe('/product/stock/card.php?id=1')
  })

  it('keeps text and select filters but not the date parts', () => {
    const t = readLegacyTable(stock, /^REF/)!
    expect(t.filters[0]).toMatchObject({ name: 'search_ref', kind: 'text' })
    expect(t.filters[1]).toBeNull()
    expect(t.filters[2]).toMatchObject({ name: 'search_warehouse', kind: 'select' })
  })

  it('treats rows without the oddeven class as data when the page never uses it', () => {
    const t = readLegacyTable(parse('<table><tr><th>Account</th><th>Debit</th></tr><tr><td>1087</td><td>10.00</td></tr><tr><td>2072</td><td>5.00</td></tr></table>'), /^Account/)!
    expect(t.rows.map((r) => r[0].text)).toEqual(['1087', '2072'])
  })

  it('reads every table with the same first header when asked', () => {
    const doc = parse(`<table><tr><th>Account</th><th>Jan</th></tr><tr class="oddeven"><td>A</td><td>1</td></tr></table>
<table><tr><th>Account</th><th>Jan</th></tr><tr class="oddeven"><td>B</td><td>2</td></tr></table>
<table><tr><th>Account</th><th>Amount</th></tr><tr class="oddeven"><td>C</td><td>3</td></tr></table>`)
    const all = readAllLegacyTables(doc, /^Account/, Infinity, /^Jan$/)
    expect(all.map((t) => t.rows[0][0].text)).toEqual(['A', 'B'])
  })
})
