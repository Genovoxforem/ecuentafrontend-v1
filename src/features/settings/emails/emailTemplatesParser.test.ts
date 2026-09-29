import { describe, expect, it } from 'vitest'
import { parseEmailTemplateEdit, parseEmailTemplatesPage } from './emailTemplatesParser'

const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html')

const ADD_FORM = `<form method="POST"><input type="hidden" name="token" value="tokT">
<table><tr class="oddeven"><td><input type="text" name="label" value=""></td>
<td><select name="langcode"><option value="0">Select a language</option><option value="en_US">English</option></select></td>
<td><select name="type_template"><option value="&nbsp;">&nbsp;</option><option value="all">-- All --</option><option value="thirdparty">Third parties</option></select></td>
<td><select name="fk_user"><option value="-1">Select a users</option><option value="4">Bar worker</option></select></td>
<td><select name="private"><option value="&nbsp;"></option><option value="1">Yes</option><option value="0">No</option></select></td>
<td><input type="text" name="position" value=""></td></tr>
<tr><td><input type="text" name="topic" value=""><input type="text" name="joinfiles" value="1"><textarea name="content"></textarea><input type="submit" name="actionadd" value="Add"></td></tr></table></form>`

// Rows copied from the real list response (two active, one disabled), trimmed.
const ROW = (id: number, label: string, type: string, position: string, subject: string, active: boolean) =>
  `<tr class="oddeven" id="rowid-${id}"><!-- label --><td class="tddict">${label}</td><!-- lang --><td class="tddict"></td><!-- type --><td class="tddict center"><span class="fa"></span>${type}</td>` +
  `<td class="tddict"></td><td class="tddict center"></td><td class="tddict center">${position}</td><td class="tddict">${subject}</td><td class="tddict center"></td>` +
  `<td class="center nowrap"><a href="/admin/mails_templates.php?rowid=${id}&amp;id=25&amp;action=${active ? 'disable' : 'activate'}"><span></span></a></td>` +
  `<td class="center"><a href="/admin/mails_templates.php?rowid=${id}&amp;id=25&amp;action=edit&amp;token=x">e</a><a href="/admin/mails_templates.php?rowid=${id}&amp;id=25&amp;action=delete&amp;token=x">d</a></td></tr>`

describe('parseEmailTemplatesPage', () => {
  it('reads the templates, their status and the add form options', () => {
    const page = parseEmailTemplatesPage(
      parse(`<table>${ROW(19, '(SendingReminder)', 'Vendor invoices', '100', '[__X__] - __(SupplierInvoice)__', true)}${ROW(1, '(YourSEPAMandate)', 'Third parties', '1', '__(YourSEPAMandate)__', false)}</table>${ADD_FORM}`),
    )
    expect(page.token).toBe('tokT')
    expect(page.rows).toEqual([
      { rowId: '19', label: '(SendingReminder)', language: '', type: 'Vendor invoices', owner: '', isPrivate: '', position: '100', subject: '[__X__] - __(SupplierInvoice)__', attachFiles: '', active: true },
      { rowId: '1', label: '(YourSEPAMandate)', language: '', type: 'Third parties', owner: '', isPrivate: '', position: '1', subject: '__(YourSEPAMandate)__', attachFiles: '', active: false },
    ])
    expect(page.typeOptions).toEqual([
      { value: 'all', label: '-- All --' },
      { value: 'thirdparty', label: 'Third parties' },
    ])
    expect(page.ownerOptions).toEqual([{ value: '-1', label: 'Select a users' }, { value: '4', label: 'Bar worker' }])
    expect(page.privateOptions.map((o) => o.value)).toEqual(['1', '0'])
    expect(page.languageOptions?.map((o) => o.value)).toEqual(['0', 'en_US'])
    expect(page.attachDefault).toBe('1')
  })

  it('reports no language list when the backend is not multilingual, and refuses a foreign page', () => {
    const page = parseEmailTemplatesPage(parse(ADD_FORM.replace(/<select name="langcode">.*?<\/select>/, '<input type="hidden" name="langcode" value="">')))
    expect(page.languageOptions).toBeNull()
    expect(page.rows).toEqual([])
    expect(() => parseEmailTemplatesPage(parse('<div>Access denied</div>'))).toThrow(/not recognised/)
  })
})

describe('parseEmailTemplateEdit', () => {
  it('reads the edited row, ignoring same-named controls of other forms in the page', () => {
    const html =
      '<form><table><tr class="oddeven" id="rowid-8">' +
      '<td><input name="label" value="(AnswerCandidature)"></td><td><select name="langcode"><option value="0">Any</option><option value="en_US" selected="">EN</option></select></td>' +
      '<td><select name="type_template"><option value="recruitment" selected="">Recruitment</option></select></td><td><select name="fk_user"><option value="-1">None</option><option value="4">Bar worker</option></select></td>' +
      '<td><select name="private"><option value="1" selected="">Yes</option></select></td><td><input name="position" value="100"></td></tr>' +
      '<tr><td><input name="topic-8" value="Hello"><input name="joinfiles-8" value="1"><textarea name="content-8">Body <b>text</b></textarea></td></tr></table></form>' +
      // another form of the layout, later in the page, that reuses the names
      '<form><input id="blabel" name="label" value=""><input name="position" value=""></form>'
    expect(parseEmailTemplateEdit(parse(html), '8')).toEqual({
      rowId: '8',
      label: '(AnswerCandidature)',
      language: 'en_US',
      type: 'recruitment',
      owner: '-1',
      isPrivate: '1',
      position: '100',
      subject: 'Hello',
      attachFiles: '1',
      content: 'Body <b>text</b>',
    })
  })

  it('refuses a page that has no edit row for the id', () => {
    expect(() => parseEmailTemplateEdit(parse('<form><input name="topic-3" value="x"></form>'), '8')).toThrow(/could not be read/)
  })
})
