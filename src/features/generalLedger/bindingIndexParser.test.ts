import { describe, expect, it } from 'vitest'
import { readBindingIndex } from './bindingIndexParser'

const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html')

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const head = (first: string) => `<tr class="tbold">${first}${MONTHS.map((m) => `<td width="60">${m}</td>`).join('')}<td width="60" class="right"><b>Total</b></td></tr>`
const amounts = (over: Record<number, string>) => MONTHS.map((_, i) => `<td class="nowrap right">${over[i] ?? '0.00'}</td>`).join('')
const title = (text: string, button = '') => `<div class="ecnta-title"><div class="row titre"><div class="col-title"><div class="titre inline-block"><span class="titlewithicon">${text}</span></div></div><div class="titre_right"><div class="ec-title-btn-container">${button}</div></div></div></div>`

// Trimmed from the live customer overview (172.16.5.10).
const PAGE = `<div class="ecnta-title"><span class="titlewithicon"><i class="fas fa-link"></i> Customer invoice binding <a href="?year=2025">&lt;</a> Year 2026 &nbsp;<a href="?year=2027">&gt;</a></span></div>
<div class="container-fluid"><div class="alert alert-info">Consult here the list of customer invoice lines bound (or not)<br>Just in one click with the button <b>"Bind Automatically"</b>. Or use the menu "<b>Lines to bind</b>".</div>
${title('Overview of amount of lines not bound to an accounting account', '<a class="button small" href="/accountancy/customer/index.php?action=validatehistory&token=tok9&year=2026"><span class="fas fa-link"></span>Bind Automatically</a>')}
<div class="div-table-responsive-no-min"><table class="table table-bordered">${head('<td width="200">Account</td><td width="200" class="left">Label</td>')}<tr class="oddeven"><td>Unknown</td><td class="left">Lines not yet bound, use menu <a href="/accountancy/customer/list.php?search_year=2026">Lines to bind</a> to make the binding manually</td>${amounts({ 4: '3,769.2591' })}<td class="nowrap right"><b>3,769.2591</b></td></tr></table></div>
${title('Overview of amount of lines already bound to an accounting account')}
<div class="div-table-responsive-no-min"><table class="table table-bordered">${head('<td width="200">Account</td><td width="200" class="left">Label</td>')}<tr class="oddeven"><td>5017</td><td class="left">Sales</td>${amounts({ 4: '862.069' })}<td class="nowrap right"><b>862.069</b></td></tr></table></div>
${title('Other information')}
<div class="div-table-responsive-no-min"><table class="table table-bordered">${head('<td width="400" class="left">Total turnover before tax</td>')}<tr><td>Total turnover before tax</td>${amounts({ 4: '4,631.3281' })}<td class="nowrap right"><b>4,631.3281</b></td></tr></table></div>
<div class="div-table-responsive-no-min"><table class="table table-bordered">${head('<td width="400">Total sales margin</td>')}<tr><td>-</td>${amounts({})}<td class="nowrap right"><b>0.00</b></td></tr></table></div></div>`

describe('readBindingIndex', () => {
  it('reads the year and the info box with its bold phrases and lines', () => {
    const page = readBindingIndex(parse(PAGE))
    expect(page.year).toBe(2026)
    expect(page.info).toHaveLength(2)
    expect(page.info[0][0].text).toBe('Consult here the list of customer invoice lines bound (or not)')
    expect(page.info[1].filter((s) => s.bold).map((s) => s.text)).toEqual(['"Bind Automatically"', 'Lines to bind'])
  })

  it('reads the sections, the Bind Automatically link and the tables', () => {
    const page = readBindingIndex(parse(PAGE))
    expect(page.sections.map((s) => s.title)).toEqual(['Overview of amount of lines not bound to an accounting account', 'Overview of amount of lines already bound to an accounting account', 'Other information'])
    expect(page.sections[0].action).toEqual({ label: 'Bind Automatically', href: '/accountancy/customer/index.php?action=validatehistory&token=tok9&year=2026' })
    expect(page.sections[1].action).toBeNull()
    expect(page.sections[2].tables).toHaveLength(2)
    const [table] = page.sections[0].tables
    expect(table.headers).toEqual(['Account', 'Label', ...MONTHS, 'Total'])
    expect(table.rows).toHaveLength(1)
    expect(table.rows[0][0].text).toBe('Unknown')
    expect(table.rows[0][6].text).toBe('3,769.2591')
    expect(table.rows[0][14]).toMatchObject({ text: '3,769.2591', bold: true })
  })

  it('keeps the "Lines to bind" link inside its label cell', () => {
    const cell = readBindingIndex(parse(PAGE)).sections[0].tables[0].rows[0][1]
    expect(cell.segments.map((s) => s.text.trim())).toEqual(['Lines not yet bound, use menu', 'Lines to bind', 'to make the binding manually'])
    expect(cell.segments[1].href).toBe('/accountancy/customer/list.php?search_year=2026')
  })

  it('refuses a page without the overview', () => {
    expect(() => readBindingIndex(parse('<div>Access denied</div>'))).toThrow(/not recognised/)
  })
})
