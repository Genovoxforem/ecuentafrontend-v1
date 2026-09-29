import { describe, expect, it } from 'vitest'
import { dictConfirmDeleteUrl } from './dictLinks'
import { parseVatAccountEditForm, parseVatAccounts } from './vatAccountsParser'

const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html')

const SELECTS =
  '<select name="country"><option value="0">Select Country</option><option value="239">Zambia (ZM)</option><option value="28">Australia (AU)</option></select>' +
  '<select name="localtax1_type"><option value="0">No</option><option value="1">Yes (Type 1)</option></select>' +
  '<select name="localtax2_type"><option value="0">No</option><option value="1">Yes (Type 1)</option></select>' +
  '<select name="recuperableonly"><option value="1">Yes</option><option value="0">No</option></select>' +
  '<select name="accountancy_code_sell"><option value="&nbsp;">&nbsp;</option><option value="1">1 - ASSETS</option><option value="2072">2072 - Sales Tax payable</option></select>'

// The page: filter form (country + code), add form, then rows as in the real markup.
const ROW = (id: number, code: string, rate: string, note: string, active: boolean) =>
  `<tr class="oddeven" id="rowid-${id}"><td class="tddict">ZM - Zambia</td><td class="tddict">${code}</td><td class="center tddict">${rate}</td><td class="center tddict nowrap"></td><td class="center tddict">0</td>` +
  '<td class="center tddict nowrap"></td><td class="center tddict">0</td><td class="center tddict">No</td><td class="tddict">0</td><td class="tddict">0</td>' +
  `<td class="tddict tdoverflowmax200remove">${note}</td><td class="nowrap"><a href="/admin/dict.php?rowid=${id}&amp;code=${code}&amp;id=10&amp;search_country_id=239&amp;action=${active ? 'disable' : 'activate'}&amp;token=t1">s</a></td>` +
  `<td class="custumCenter"><a href="/admin/dict.php?rowid=${id}&amp;code=${code}&amp;id=10&amp;search_country_id=239&amp;action=edit&amp;token=t1">e</a></td>` +
  `<td><a href="/admin/dict.php?rowid=${id}&amp;code=${code}&amp;id=10&amp;search_country_id=239&amp;action=delete&amp;token=t1">d</a></td></tr>`

const PAGE = (rows: string) =>
  '<form action="/admin/dict.php?id=10"><select name="search_country_id"><option value="0">Select Country</option><option value="239" selected="">Zambia (ZM)</option></select>' +
  '<input name="search_code" value="A"><button name="button_search_x">s</button></form>' +
  `<form action="/admin/dict.php?id=10" method="POST"><input type="hidden" name="token" value="tokV"><input type="hidden" name="from" value="accountancy"><table><tr class="oddeven">${SELECTS}<input name="code"><input type="submit" name="actionadd" value="Add"></tr>${rows}</table></form>`

describe('parseVatAccounts', () => {
  it('reads the rows, their status and links, the filters and the add-form options', () => {
    const page = parseVatAccounts(parse(PAGE(ROW(1, 'A', '16', 'Standard Rated(16%)', true) + ROW(2, 'B', '0', 'Minimum', false))))
    expect(page.token).toBe('tokV')
    expect(page.filters).toEqual({ country: '239', code: 'A' })
    expect(page.countries.map((o) => o.value)).toEqual(['0', '239', '28'])
    expect(page.localTaxTypes.map((o) => o.value)).toEqual(['0', '1'])
    expect(page.nprOptions.map((o) => o.value)).toEqual(['1', '0'])
    // the blank option (an nbsp value) is dropped from the account list
    expect(page.accounts).toEqual([
      { value: '1', label: '1 - ASSETS' },
      { value: '2072', label: '2072 - Sales Tax payable' },
    ])
    expect(page.rows).toHaveLength(2)
    expect(page.rows[0]).toMatchObject({ rowid: '1', country: 'ZM - Zambia', code: 'A', rate: '16', localTax1Type: '', localTax1: '0', npr: 'No', saleAccount: '0', purchaseAccount: '0', note: 'Standard Rated(16%)', active: true })
    expect(page.rows[0].toggleUrl).toBe('/admin/dict.php?rowid=1&code=A&id=10&search_country_id=239&action=disable&token=t1')
    expect(page.rows[0].editUrl).toContain('action=edit')
    expect(page.rows[0].deleteUrl).toContain('action=delete')
    // a disabled row is switched back on with `activate`
    expect(page.rows[1].active).toBe(false)
    expect(page.rows[1].toggleUrl).toContain('action=activate')
  })

  it('returns no rows for an empty list and refuses a page that is not the dictionary', () => {
    expect(parseVatAccounts(parse(PAGE(''))).rows).toEqual([])
    expect(() => parseVatAccounts(parse('<div>Access denied</div>'))).toThrow(/not recognised/)
  })
})

describe('parseVatAccountEditForm', () => {
  it('reads the row being edited, ignoring the filter controls that share the form', () => {
    const html =
      '<form method="POST"><input type="hidden" name="token" value="tokE"><input type="hidden" name="from" value="accountancy"><input type="hidden" name="page" value="0"><input type="hidden" name="rowid" value="1"><input type="hidden" name="entity" value="">' +
      '<select name="search_country_id"><option value="0">All</option><option value="239" selected="">Zambia</option></select><input name="search_code" value="">' +
      `<select name="country"><option value="0">Select</option><option value="239" selected="">Zambia (ZM)</option></select><input name="code" value="A"><input name="taux" value="16">` +
      '<select name="localtax1_type"><option value="0">No</option><option value="1">Yes</option></select><input name="localtax1" value="0"><select name="localtax2_type"><option value="0">No</option></select><input name="localtax2" value="0">' +
      '<select name="recuperableonly"><option value="1">Yes</option><option value="0" selected="">No</option></select>' +
      '<select name="accountancy_code_sell"><option value="&nbsp;" selected="">&nbsp;</option><option value="2072">2072</option></select>' +
      '<select name="accountancy_code_buy"><option value="&nbsp;" selected="">&nbsp;</option></select><input name="note" value="Standard Rated(16%)"><input type="submit" name="actionmodify" value="Modify"></form>'
    expect(parseVatAccountEditForm(parse(html))).toEqual({
      token: 'tokE',
      rowid: '1',
      entity: '',
      page: '0',
      values: { country: '239', code: 'A', taux: '16', localtax1_type: '0', localtax1: '0', localtax2_type: '0', localtax2: '0', recuperableonly: '0', accountancy_code_sell: '', accountancy_code_buy: '', note: 'Standard Rated(16%)' },
    })
  })

  it('returns null when the page has no edit form', () => {
    expect(parseVatAccountEditForm(parse('<div>none</div>'))).toBeNull()
  })
})

describe('dictConfirmDeleteUrl', () => {
  it('turns the row delete link into the request that actually deletes', () => {
    expect(dictConfirmDeleteUrl('/admin/dict.php?rowid=1&code=A&id=10&action=delete&token=t1')).toBe('/admin/dict.php?rowid=1&code=A&id=10&action=confirm_delete&confirm=yes&token=t1')
  })

  it('refuses a link that is not a delete link', () => {
    expect(() => dictConfirmDeleteUrl('/admin/dict.php?rowid=1&action=edit')).toThrow(/no delete link/)
  })
})
