import { describe, expect, it } from 'vitest'
import { parseSenderProfileForm, parseSenderProfilesPage } from './senderProfilesParser'

const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html')

const LIST = (rows: string) =>
  `<form id="searchFormList" method="POST"><input type="hidden" name="token" value="tokS"><table><tr><td><input name="search_label" value=""></td></tr>${rows}</table></form>`

const ROW = (id: number, label: string, email: string, position: string, status: string) =>
  `<tr class="oddeven"><td>${label}</td><td>${email}</td><td class="right">${position}</td><td class="center"><span class="badge"></span> ${status}</td>` +
  `<td class="nowrap"><a class="editfielda" href="/admin/mails_senderprofile_list.php?id=${id}&action=edit&rowid=${id}">e</a><a href="/admin/mails_senderprofile_list.php?id=${id}&action=delete&token=x">d</a></td></tr>`

describe('parseSenderProfilesPage', () => {
  it('reads the profiles with their ids and status', () => {
    const page = parseSenderProfilesPage(parse(LIST(ROW(3, 'Sales', 'sales@example.test', '10', 'Enabled') + ROW(5, 'Old', 'old@example.test', '', 'Disabled'))))
    expect(page.token).toBe('tokS')
    expect(page.rows).toEqual([
      { id: '3', label: 'Sales', email: 'sales@example.test', position: '10', active: true },
      { id: '5', label: 'Old', email: 'old@example.test', position: '', active: false },
    ])
  })

  it('returns no rows for an empty list and refuses a page that is not the list', () => {
    expect(parseSenderProfilesPage(parse(LIST(''))).rows).toEqual([])
    expect(() => parseSenderProfilesPage(parse('<div>Access denied</div>'))).toThrow(/not recognised/)
  })
})

describe('parseSenderProfileForm', () => {
  const FORM = (action: string, label: string, active: string) =>
    `<form method="POST"><input type="hidden" name="token" value="tokF"><input type="hidden" name="action" value="${action}">` +
    `<input type="text" name="label" value="${label}"><input type="text" name="email" value="a@example.test"><textarea name="signature">Regards</textarea>` +
    `<select name="private"><option value="-1">Select a users</option><option value="4" selected="">Bar worker</option></select>` +
    `<input name="position" value="7"><select name="active"><option value="0">Disabled</option><option value="1"${active === '1' ? ' selected=""' : ''}>Enabled</option></select></form>`

  it('reads the values and options of an edit form', () => {
    const form = parseSenderProfileForm(parse(FORM('update', 'Sales', '1')))
    expect(form).toMatchObject({ token: 'tokF', label: 'Sales', email: 'a@example.test', signature: 'Regards', user: '4', position: '7', active: '1' })
    expect(form.userOptions).toEqual([{ value: '-1', label: 'Select a users' }, { value: '4', label: 'Bar worker' }])
    expect(form.activeOptions.map((o) => o.value)).toEqual(['0', '1'])
  })

  it('ignores same-named controls of other forms in the page layout', () => {
    const html = FORM('update', 'Sales', '1') + '<form><input id="blabel" name="label" value="layout"><input name="position" value="layout"></form>'
    expect(parseSenderProfileForm(parse(html))).toMatchObject({ label: 'Sales', position: '7' })
  })

  it('accepts the create form and refuses a page without the form', () => {
    expect(parseSenderProfileForm(parse(FORM('add', '', '1'))).label).toBe('')
    expect(() => parseSenderProfileForm(parse('<div>nope</div>'))).toThrow(/not recognised/)
  })
})
