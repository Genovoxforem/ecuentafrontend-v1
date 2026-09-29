import { describe, expect, it } from 'vitest'
import { readValidateMovements } from './validateMovementsParser'

const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html')

// Trimmed from the live page (172.16.5.55): title with the year stepper, the description, the
// untranslated heading, and the count table with a checkbox under each count.
const PAGE = (button: string) => `<div class="ecnta-title"><span class="titlewithicon"><i class="fas fa-file-archive"></i> Validate movements <a href="/accountancy/closure/validate.php?year=2025"><span class="fa fa-chevron-left"></span></a> Year 2026 &nbsp;<a href="?year=2027"></a></span></div>
<div class="createLightBoxShadowDiv customPaddingInside boxpadding"><div class="createLightBoxShadowDiv customPaddingInside mb-15">Any modification or deletion of writing, lettering and deletes will be prohibited. All entries for an exercise must be validated otherwise closing will not be possible</div>
<table class="ecnta-event-details paddingDiv validatehide w-100"><tr><td><div class="titre inline-block"><span class="titlewithicon">SelectMonthAndValidate</span></div></td></tr></table>
<div class="div-table-responsive-no-min"><table class="newCustomUItable"><tr class="oddeven"><td>Jan</td><td>Feb</td><td>Mar</td><td>Apr</td><td>May</td><td>Jun</td><td>Jul</td><td>Aug</td><td>Sep</td><td>Oct</td><td>Nov</td><td>Dec</td><td><b>Total</b></td></tr>
<tr class="oddeven">${['0', '0', '0', '0', '0', '0', '0', '20', '890', '0', '0', '0'].map((n) => `<td class="nowrap">${n}<br><br><input id="cb${n}" class="flat checkforselect" type="checkbox" name="toselect[]" value="${n}"></td>`).join('')}<td class="valigntop"><b>910</b></td></tr></table>
${button}</div></div>`

const BUTTON = '<div class="inline-block divButAction"><a class="butAction" href="/accountancy/closure/validate.php?month=2026&action=validate"">Validate movements</a></div>'

describe('readValidateMovements', () => {
  it('reads the year, the description, the counts by month and the total', () => {
    const page = readValidateMovements(parse(PAGE(BUTTON)))
    expect(page.year).toBe(2026)
    expect(page.description).toMatch(/^Any modification or deletion of writing/)
    expect(page.heading).toBe('Select Month And Validate')
    expect(page.months).toHaveLength(12)
    expect(page.months[7]).toEqual({ label: 'Aug', count: '20' })
    expect(page.months[8]).toEqual({ label: 'Sep', count: '890' })
    expect(page.total).toBe('910')
    expect(page.canValidate).toBe(true)
  })

  it('has no validate action when the page prints no link', () => {
    expect(readValidateMovements(parse(PAGE(''))).canValidate).toBe(false)
  })

  it('refuses a page without the table', () => {
    expect(() => readValidateMovements(parse('<div>Access denied</div>'))).toThrow(/not recognised/)
  })
})
