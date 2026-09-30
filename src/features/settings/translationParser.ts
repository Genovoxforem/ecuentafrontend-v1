// Parses admin/translation.php (Setup > Translation), which has two modes. Verified against the
// dev backend's markup (search results, empty overwrite list) and the page's own PHP:
//   - `?mode=searchkey&action=search&langcode=&transkey=&transvalue=&limit=&page=` lists the
//     translation strings read from the backend's language files, one page at a time; the
//     title carries "(<matches> / <all strings> - <files> Files)". A row's last cell has an
//     edit + delete link (`…?rowid=N&entity=E&mode=overwrite&action=edit|delete`) and an info
//     tooltip "Original value was <i>…</i>" when the string is overwritten, an "Overwrite" link
//     (`?mode=overwrite&langcode=…&transkey=…`) while it can be, and neither otherwise;
//   - `?mode=overwrite` lists the overwritten strings (`tr.oddeven` after the add row, with the
//     same edit/delete links) above/below the add form (`langcode`, `transkey`, `transvalue`);
//   - both carry the "enable usage of overwritten translation" switch, a GET link whose `value`
//     is the state it would switch TO (value=0 while enabled).

export interface TranslationOption {
  value: string
  label: string
}

interface TranslationPageBase {
  token: string
  enabled: boolean
  currentLanguage: string
  languageOptions: TranslationOption[]
}

export interface TranslationSearchRow {
  language: string
  key: string
  value: string
  // Set when the string is currently overwritten (edit/delete then act on this record).
  overwriteId: string | null
  overwriteEntity: string
  originalValue: string | null
  canOverwrite: boolean
}

export interface TranslationSearchPage extends TranslationPageBase {
  matches: number
  totalStrings: number
  files: number
  rows: TranslationSearchRow[]
}

export interface TranslationOverride {
  rowId: string
  language: string
  key: string
  value: string
  entity: string
}

export interface TranslationOverwritesPage extends TranslationPageBase {
  rows: TranslationOverride[]
}

const clean = (value: string | null | undefined) => (value ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim()

function parseBase(doc: Document): TranslationPageBase {
  const form = doc.querySelector('input#mode')?.closest('form')
  const token = form?.querySelector<HTMLInputElement>('input[name="token"]')?.getAttribute('value') ?? ''
  if (!form || !token) throw new Error('The translation settings on this backend page were not recognised.')

  const toggle = doc.querySelector('a[href*="action=setMAIN_ENABLE_OVERWRITE_TRANSLATION"]')
  const enabled = toggle ? /[?&]value=0(?:&|$)/.test(toggle.getAttribute('href') ?? '') : false
  const strongs = Array.from(doc.querySelectorAll('span.opacitymedium + strong'))
  const currentLanguage = strongs.map((s) => clean(s.textContent).match(/[a-z]{2}_[A-Z]{2}/)?.[0]).find(Boolean) ?? ''

  const select = form.querySelector<HTMLSelectElement>('select[name="langcode"]')
  const languageOptions = Array.from(select?.options ?? [])
    .map((o) => ({ value: (o.getAttribute('value') ?? '').trim(), label: clean(o.textContent) }))
    // The "Select a language" placeholder has value 0.
    .filter((o) => o.value !== '' && o.value !== '0')
  return { token, enabled, currentLanguage, languageOptions }
}

function ruleLink(tr: Element, action: 'edit' | 'delete') {
  const href = tr.querySelector(`a[href*="mode=overwrite"][href*="action=${action}"]`)?.getAttribute('href') ?? ''
  return { rowId: href.match(/[?&]rowid=(\d+)/)?.[1] ?? '', entity: href.match(/[?&]entity=(\d+)/)?.[1] ?? '' }
}

export function parseTranslationSearchPage(doc: Document): TranslationSearchPage {
  const base = parseBase(doc)
  const table = doc.querySelector('input[name="transvalue"]')?.closest('table')
  if (!table) throw new Error('The translation search on this backend page was not recognised.')

  const rows: TranslationSearchRow[] = []
  table.querySelectorAll('tr.oddeven').forEach((tr) => {
    // The first row is the search form itself.
    if (tr.querySelector('input, select')) return
    const cells = Array.from(tr.querySelectorAll(':scope > td'))
    if (cells.length < 4) return
    const edit = ruleLink(tr, 'edit')
    const overwriteId = edit.rowId || null
    let originalValue: string | null = null
    if (overwriteId) {
      const tip = Array.from(cells[3].querySelectorAll('[title]')).map((e) => e.getAttribute('title') ?? '').find((t) => t.includes('<i>'))
      originalValue = tip ? clean(new DOMParser().parseFromString(tip, 'text/html').querySelector('i')?.textContent) : null
    }
    rows.push({
      language: clean(cells[0].textContent),
      key: clean(cells[1].textContent),
      value: clean(cells[2].textContent),
      overwriteId,
      overwriteEntity: edit.entity,
      originalValue,
      canOverwrite: !overwriteId && !!cells[3].querySelector('a[href*="mode=overwrite"][href*="transkey="]'),
    })
  })

  // "(<matches> / <all strings> - <files> Files)" — absent when nothing matched.
  const counts = Array.from(doc.querySelectorAll('span.opacitymedium'))
    .map((s) => clean(s.textContent).match(/^\((\d+)\s*\/\s*(\d+)\s*-\s*(\d+)\s/))
    .find(Boolean)
  return {
    ...base,
    matches: counts ? Number(counts[1]) : 0,
    totalStrings: counts ? Number(counts[2]) : 0,
    files: counts ? Number(counts[3]) : 0,
    rows,
  }
}

export function parseTranslationOverwritesPage(doc: Document): TranslationOverwritesPage {
  const base = parseBase(doc)
  const table = doc.querySelector('input[name="transkey"]')?.closest('table')
  if (!table) throw new Error('The overwritten translations on this backend page were not recognised.')

  const rows: TranslationOverride[] = []
  table.querySelectorAll('tr.oddeven').forEach((tr) => {
    // The first row is the add form.
    if (tr.querySelector('input, select')) return
    const cells = Array.from(tr.querySelectorAll(':scope > td'))
    const edit = ruleLink(tr, 'edit')
    if (cells.length < 4 || !edit.rowId) return
    rows.push({ rowId: edit.rowId, language: clean(cells[0].textContent), key: clean(cells[1].textContent), value: clean(cells[2].textContent), entity: edit.entity })
  })
  return { ...base, rows }
}
