import { describe, expect, it } from 'vitest'
import { parseTranslationOverwritesPage, parseTranslationSearchPage } from './translationParser'

const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html')

const HEADER = (value: 0 | 1, mode: string) =>
  `<div class="titre_right"><a class="reposition" href="/admin/translation.php?action=setMAIN_ENABLE_OVERWRITE_TRANSLATION&amp;token=tokX&amp;value=${value}&amp;mode=${mode}">x</a></div>` +
  '<span class="opacitymedium">Current user language:</span> <strong><img src="/f.png"> en_US</strong>'

const FORM_OPEN = (mode: string) => `<form method="POST"><input type="hidden" name="token" value="tokX"><input type="hidden" id="mode" name="mode" value="${mode}">`

const LANG_SELECT = '<select name="langcode"><option value="0">Select a language</option><option value="en_US">English (United States)</option><option value="fr_FR">French</option></select>'

// Result rows follow the real markup: language, key, string, then the action cell.
const ROW = (key: string, value: string, actions: string) => `<tr class="oddeven"><td>en_US</td><td>${key}</td><td>${value}</td><td class="right">${actions}</td></tr>`
const OVERWRITE_LINK = (key: string) => `<a href="/admin/translation.php?mode=overwrite&amp;langcode=en_US&amp;transkey=${key}"><img title="Overwrite"></a><a href="https://example.test/x" target="transifex">t</a>`
const OVERWRITTEN = (id: number) =>
  `<a class="editfielda" href="/admin/translation.php?rowid=${id}&amp;entity=1&amp;mode=overwrite&amp;action=edit">e</a>` +
  `<a href="/admin/translation.php?rowid=${id}&amp;entity=1&amp;mode=searchkey&amp;action=delete&amp;mode=overwrite&amp;token=t">d</a>` +
  '<span class="classfortooltip" title="Original value was &lt;i&gt;Accounting area&lt;/i&gt;">i</span>'

const SEARCH_ROW = '<tr class="oddeven"><td>' + LANG_SELECT + '</td><td><input name="transkey" value="Acc"></td><td><input name="transvalue" value=""></td><td><button>s</button></td></tr>'

describe('parseTranslationSearchPage', () => {
  it('reads the counts, the switch, the languages and each result row with its state', () => {
    const html =
      HEADER(0, 'searchkey') + '<span class="titlewithicon">Search a translation key or string <span class="opacitymedium colorblack">(23 / 12759 - 100 Files)</span></span>' +
      FORM_OPEN('searchkey') + '<table><tr><th>Language</th></tr>' + SEARCH_ROW +
      ROW('AccountancyArea', 'Accounting area', OVERWRITE_LINK('AccountancyArea')) +
      ROW('Balance', 'Sheet of balance', OVERWRITTEN(4)) +
      ROW('Orphan', 'Text', '<span class="classfortooltip" title="No original value">w</span>') +
      '</table></form>'
    const page = parseTranslationSearchPage(parse(html))
    expect(page).toMatchObject({ token: 'tokX', enabled: true, currentLanguage: 'en_US', matches: 23, totalStrings: 12759, files: 100 })
    expect(page.languageOptions).toEqual([
      { value: 'en_US', label: 'English (United States)' },
      { value: 'fr_FR', label: 'French' },
    ])
    expect(page.rows).toEqual([
      { language: 'en_US', key: 'AccountancyArea', value: 'Accounting area', overwriteId: null, overwriteEntity: '', originalValue: null, canOverwrite: true },
      { language: 'en_US', key: 'Balance', value: 'Sheet of balance', overwriteId: '4', overwriteEntity: '1', originalValue: 'Accounting area', canOverwrite: false },
      { language: 'en_US', key: 'Orphan', value: 'Text', overwriteId: null, overwriteEntity: '', originalValue: null, canOverwrite: false },
    ])
  })

  it('reports no counts and no rows when nothing matched, and the switch as off', () => {
    const html = HEADER(1, 'searchkey') + FORM_OPEN('searchkey') + '<table>' + SEARCH_ROW + '</table></form>'
    const page = parseTranslationSearchPage(parse(html))
    expect(page).toMatchObject({ enabled: false, matches: 0, totalStrings: 0, rows: [] })
  })

  it('refuses a page that is not the translation page', () => {
    expect(() => parseTranslationSearchPage(parse('<div>Access denied</div>'))).toThrow(/not recognised/)
  })
})

describe('parseTranslationOverwritesPage', () => {
  const ADD_ROW = '<tr class="oddeven"><td>' + LANG_SELECT + '</td><td><input name="transkey" value=""></td><td><input name="transvalue" value=""></td><td><input type="hidden" name="entity" value="1"><input type="submit" name="add" value="Add"></td></tr>'

  it('reads the overwritten strings with their record ids', () => {
    const html = HEADER(0, 'overwrite') + FORM_OPEN('overwrite') + '<table><tr><th>Language</th></tr>' + ADD_ROW + ROW('Balance', 'My balance', OVERWRITTEN(4)) + '</table></form>'
    const page = parseTranslationOverwritesPage(parse(html))
    expect(page.enabled).toBe(true)
    expect(page.rows).toEqual([{ rowId: '4', language: 'en_US', key: 'Balance', value: 'My balance', entity: '1' }])
  })

  it('returns no rows for an empty list', () => {
    const html = HEADER(1, 'overwrite') + FORM_OPEN('overwrite') + '<table>' + ADD_ROW + '</table></form>'
    expect(parseTranslationOverwritesPage(parse(html)).rows).toEqual([])
  })
})
