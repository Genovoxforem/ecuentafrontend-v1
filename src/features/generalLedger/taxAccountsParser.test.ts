import { describe, expect, it } from 'vitest'
import { parseTaxAccounts } from './taxAccountsParser'

const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html')

const ROW = (id: number, code: string, active: boolean) =>
  `<tr class="oddeven" id="rowid-${id}"><td class="tddict">${code}</td><td class="tddict">Wrong quantity</td><td class="tddict">ZM - Zambia</td><td class="tddict">0%</td><td class="tddict">Reason</td><td class="tddict">67</td><td class="tddict">0</td><td class="tddict">Yes</td>` +
  `<td><a href="/admin/dict.php?rowid=${id}&amp;id=7&amp;action=${active ? 'disable' : 'activate'}&amp;token=t1">s</a></td>` +
  `<td><a href="/admin/dict.php?rowid=${id}&amp;id=7&amp;action=edit&amp;token=t1">e</a></td><td><a href="/admin/dict.php?rowid=${id}&amp;id=7&amp;action=delete&amp;token=t1">d</a></td></tr>`

describe('parseTaxAccounts', () => {
  it('reads each row with its status and the links of the row', () => {
    const page = parseTaxAccounts(parse(`<form><input name="token" value="tokT"><table><tr class="oddeven"><td><input name="actionadd" type="submit"></td></tr>${ROW(1, '01', true)}${ROW(2, '02', false)}</table></form>`))
    expect(page.rows.map((r) => [r.rowid, r.code, r.active])).toEqual([
      ['1', '01', true],
      ['2', '02', false],
    ])
    expect(page.rows[0].toggleUrl).toContain('action=disable')
    // dict.php switches a row back on with `activate`; it must be recognised so the row can be re-enabled
    expect(page.rows[1].toggleUrl).toContain('action=activate')
    expect(page.rows[1].editUrl).toContain('action=edit')
    expect(page.rows[1].deleteUrl).toContain('action=delete')
  })
})
