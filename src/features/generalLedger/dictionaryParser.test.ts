import { describe, expect, it } from 'vitest'
import { parseDictionary, parseDictionaryEditForm } from './dictionaryParser'

const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html')

// Shaped like the real dictionary 17 (expense report line types).
const ACCOUNT = '<select name="accountancy_code"><option value="&nbsp;">&nbsp;</option><option value="1">1 - ASSETS</option><option value="4">4 - EXPENSE</option></select>'

const ROW = (id: number, code: string, label: string, account: string, active = true) =>
  `<tr class="oddeven" id="rowid-${id}"><td class="tddict">${code}</td><td class="tddict">${label}</td><td class="tddict">${account}</td>` +
  `<td class="nowrap"><a href="/admin/dict.php?rowid=${id}&amp;id=17&amp;action=${active ? 'disable' : 'activate'}&amp;token=t1">s</a></td>` +
  `<td class="custumCenter"><a href="/admin/dict.php?rowid=${id}&amp;id=17&amp;action=edit&amp;token=t1">e</a></td>` +
  `<td><a href="/admin/dict.php?rowid=${id}&amp;id=17&amp;action=delete&amp;token=t1">d</a></td></tr>`

const PAGE = (rows: string) =>
  '<form action="/admin/dict.php?id=17" method="POST"><input type="hidden" name="token" value="tokD"><input type="hidden" name="from" value="accountancy"><input type="hidden" name="id" value="17">' +
  `<table><tr><td class="fieldrequired">Code</td><td>Label</td><td>Accounting Code</td><td></td></tr>` +
  `<tr class="oddeven"><td><input type="text" name="code"></td><td><input type="text" name="label"></td><td>${ACCOUNT}</td><td><input type="submit" name="actionadd" value="Add"></td></tr></table></form>` +
  `<form action="/admin/dict.php?id=17"><table><tr><td><input type="text" name="search_code" value="10"></td><td></td><td></td><td></td><td><button name="button_search_x">s</button></td></tr>` +
  `<tr><th title="Code">Code</th><th title="Label">Label</th><th title="Accounting Code">Accounting Code</th><th title="Status">Status</th><th></th><th></th></tr>${rows}</table></form>`

describe('parseDictionary', () => {
  it('discovers the fields, filters, columns and entries from the page', () => {
    const page = parseDictionary(parse(PAGE(ROW(110, '1001', 'Food Expense', '4') + ROW(111, '1002', 'Filing Tax', '405', false))))
    expect(page.token).toBe('tokD')
    expect(page.fields.map((f) => [f.name, f.label, f.required, f.kind, f.value])).toEqual([
      ['code', 'Code', true, 'text', ''],
      // the backend also refuses an empty label, though its header is not marked required
      ['label', 'Label', true, 'text', ''],
      // starts on the blank option
      ['accountancy_code', 'Accounting Code', false, 'select', ''],
    ])
    // the blank (nbsp) option is left out of the account list
    expect(page.fields[2].options).toEqual([
      { value: '1', label: '1 - ASSETS' },
      { value: '4', label: '4 - EXPENSE' },
    ])
    expect(page.filters).toEqual([{ name: 'search_code', label: 'Code', kind: 'text', options: [], value: '10' }])
    expect(page.columns).toEqual(['Code', 'Label', 'Accounting Code'])
    expect(page.rows.map((r) => [r.rowid, r.cells, r.active])).toEqual([
      ['110', ['1001', 'Food Expense', '4'], true],
      ['111', ['1002', 'Filing Tax', '405'], false],
    ])
    expect(page.rows[1].toggleUrl).toBe('/admin/dict.php?rowid=111&id=17&action=activate&token=t1')
    expect(page.rows[0].editUrl).toContain('action=edit')
    expect(page.rows[0].deleteUrl).toContain('action=delete')
  })

  it('still reads the columns and fields of an empty dictionary, and refuses a foreign page', () => {
    const page = parseDictionary(parse(PAGE('')))
    expect(page.rows).toEqual([])
    expect(page.columns).toEqual(['Code', 'Label', 'Accounting Code'])
    expect(page.fields).toHaveLength(3)
    expect(() => parseDictionary(parse('<div>Access denied</div>'))).toThrow(/not recognised/)
  })
})

describe('parseDictionaryEditForm', () => {
  it('reads the stored values of the entry, ignoring the filter control that shares the form', () => {
    const html =
      '<form method="POST"><input type="hidden" name="token" value="tokE"><input type="hidden" name="from" value="accountancy"><input type="hidden" name="page" value="0"><input type="hidden" name="rowid" value="110"><input type="hidden" name="entity" value="">' +
      `<input type="text" name="search_code" value=""><input type="text" name="code" value="1001"><input type="text" name="label" value="Food Expense">` +
      '<select name="accountancy_code"><option value="&nbsp;">&nbsp;</option><option value="4" selected="">4 - EXPENSE</option></select><input type="submit" name="actionmodify" value="Modify"></form>'
    expect(parseDictionaryEditForm(parse(html), ['code', 'label', 'accountancy_code'])).toEqual({
      token: 'tokE',
      rowid: '110',
      entity: '',
      page: '0',
      values: { code: '1001', label: 'Food Expense', accountancy_code: '4' },
    })
  })

  it('returns null when the page has no edit form', () => {
    expect(parseDictionaryEditForm(parse('<div>none</div>'), ['code'])).toBeNull()
  })
})
