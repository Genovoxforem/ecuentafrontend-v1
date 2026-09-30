import { describe, expect, it } from 'vitest'
import { parseDefaultValuesPage } from './defaultValuesParser'

const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html')

// Built from the real page's markup (toggle and add row copied from a live response; the rule
// rows follow the page's own PHP, since the dev backends had none to copy).
const PAGE = (mode: string, enabledValue: 0 | 1, withValue: boolean, rules: string) =>
  `<div class="ec-title-btn-container">Enable customization <a class="reposition" href="/admin/defaultvalues.php?action=setMAIN_ENABLE_DEFAULT_VALUES&amp;token=tok9&amp;value=${enabledValue}&mode=${mode}">x</a></div>` +
  '<form action="/admin/defaultvalues.php" method="POST"><input type="hidden" name="token" value="tok9"><input type="hidden" id="mode" name="mode" value="' + mode + '">' +
  '<table><tr><th><span>Relative URL</span></th><th><span>Field</span></th>' +
  (withValue ? '<th><div>Value</div><div>__DAY__ -> 26<br>…</div></th>' : '') +
  '<th title="Environment">Environment</th><th></th></tr>' +
  '<tr class="oddeven"><td><input type="text" name="defaulturl" value=""></td><td><input name="defaultkey"></td>' +
  (withValue ? '<td><input name="defaultvalue"></td>' : '') +
  '<td><input type="text" disabled name="entity" value="1"></td><td><input type="submit" name="add" value="Add"></td></tr>' +
  rules +
  '</table></form>'

const rule = (id: number, page: string, field: string, value: string | null, mode: string) =>
  `<tr class="oddeven"><td>${page}</td><td>${field}</td>${value === null ? '' : `<td>${value}</td>`}<td></td>` +
  `<td><a class="editfielda" href="/admin/defaultvalues.php?rowid=${id}&entity=1&mode=${mode}&action=edit&token=tok9">e</a>` +
  `<a href="/admin/defaultvalues.php?rowid=${id}&entity=1&mode=${mode}&action=delete&token=tok9">d</a></td></tr>`

describe('parseDefaultValuesPage', () => {
  it('reads the switch and the rules of a mode with a value column', () => {
    const p = parseDefaultValuesPage(parse(PAGE('createform', 0, true, rule(4, 'societe/card.php', 'country_id', '117', 'createform') + rule(6, 'comm/propal/card.php', 'note', 'hello', 'createform'))))
    expect(p.token).toBe('tok9')
    expect(p.mode).toBe('createform')
    expect(p.enabled).toBe(true)
    expect(p.hasValue).toBe(true)
    expect(p.rules).toEqual([
      { rowId: '4', page: 'societe/card.php', field: 'country_id', value: '117', entity: '1' },
      { rowId: '6', page: 'comm/propal/card.php', field: 'note', value: 'hello', entity: '1' },
    ])
  })

  it('reads a mode without a value column, and the switch when customization is off', () => {
    const p = parseDefaultValuesPage(parse(PAGE('focus', 1, false, rule(9, 'societe/card.php', 'name', null, 'focus'))))
    expect(p.enabled).toBe(false)
    expect(p.hasValue).toBe(false)
    expect(p.rules).toEqual([{ rowId: '9', page: 'societe/card.php', field: 'name', value: null, entity: '1' }])
  })

  it('returns no rules for an empty page and refuses a page that is not this one', () => {
    expect(parseDefaultValuesPage(parse(PAGE('filters', 0, true, ''))).rules).toEqual([])
    expect(() => parseDefaultValuesPage(parse('<div>Access denied</div>'))).toThrow(/not recognised/)
  })
})
