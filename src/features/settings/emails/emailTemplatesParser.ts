// Parses admin/mails_templates.php (Emails setup > Email templates). Verified against the dev
// backend's list and edit page:
//   - each template is `<tr id="rowid-N">` with tds: code, language, type, owner, private,
//     position, subject, attach files, status, actions; the status link is
//     `?…&rowid=N&id=25&action=disable` while the template is active, `action=activate`
//     while it is not;
//   - the add form has selects `type_template`, `fk_user`, `private` (and `langcode` when the
//     backend is multilingual); its blank options carry a non-breaking-space value;
//   - `?action=edit&rowid=N&id=25` prints the row `tr#rowid-N` as inputs (`label`, `langcode`,
//     `type_template`, `fk_user`, `private`, `position`) plus `topic-N`, `joinfiles-N` and
//     `content-N`. Other forms in the page layout reuse the names `label` and `position`, so
//     controls are always read from the add form / the edited row, never from the whole page.

export interface EmailTemplateOption {
  value: string
  label: string
}

export interface EmailTemplateRow {
  rowId: string
  label: string
  language: string
  type: string
  owner: string
  isPrivate: string
  position: string
  subject: string
  attachFiles: string
  active: boolean
}

export interface EmailTemplatesPage {
  token: string
  rows: EmailTemplateRow[]
  typeOptions: EmailTemplateOption[]
  ownerOptions: EmailTemplateOption[]
  privateOptions: EmailTemplateOption[]
  // null when the backend is not multilingual (the page then sends the language itself).
  languageOptions: EmailTemplateOption[] | null
  attachDefault: string
}

export interface EmailTemplateEdit {
  rowId: string
  label: string
  language: string
  type: string
  owner: string
  isPrivate: string
  position: string
  subject: string
  attachFiles: string
  content: string
}

const clean = (value: string | null | undefined) => (value ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim()

function selectOptions(scope: ParentNode, name: string): EmailTemplateOption[] | null {
  const select = scope.querySelector<HTMLSelectElement>(`select[name="${name}"]`)
  if (!select) return null
  return Array.from(select.options)
    .map((o) => ({ value: (o.getAttribute('value') ?? '').trim(), label: clean(o.textContent) }))
    .filter((o) => o.value !== '')
}

function controlValue(el: Element | null | undefined): string {
  if (!el) return ''
  // A select with no `selected` option submits its first one, as a browser would.
  if (el instanceof HTMLSelectElement) return (el.selectedOptions[0]?.getAttribute('value') ?? '').trim()
  if (el instanceof HTMLTextAreaElement) return el.textContent ?? ''
  return el.getAttribute('value') ?? ''
}

export function parseEmailTemplatesPage(doc: Document): EmailTemplatesPage {
  const addForm = doc.querySelector('input[name="actionadd"]')?.closest('form')
  const token = addForm?.querySelector<HTMLInputElement>('input[name="token"]')?.getAttribute('value') ?? ''
  if (!addForm || !token) throw new Error('The email templates on this backend page were not recognised.')

  const rows: EmailTemplateRow[] = []
  doc.querySelectorAll('tr[id^="rowid-"]').forEach((tr) => {
    const rowId = tr.getAttribute('id')?.replace('rowid-', '') ?? ''
    const cells = Array.from(tr.querySelectorAll(':scope > td'))
    if (!rowId || cells.length < 9) return
    rows.push({
      rowId,
      label: clean(cells[0].textContent),
      language: clean(cells[1].textContent),
      type: clean(cells[2].textContent),
      owner: clean(cells[3].textContent),
      isPrivate: clean(cells[4].textContent),
      position: clean(cells[5].textContent),
      subject: clean(cells[6].textContent),
      attachFiles: clean(cells[7].textContent),
      active: !!cells[8].querySelector('a[href*="action=disable"]'),
    })
  })

  return {
    token,
    rows,
    typeOptions: selectOptions(addForm, 'type_template') ?? [],
    ownerOptions: selectOptions(addForm, 'fk_user') ?? [],
    privateOptions: selectOptions(addForm, 'private') ?? [],
    languageOptions: selectOptions(addForm, 'langcode'),
    attachDefault: addForm.querySelector('input[name="joinfiles"]')?.getAttribute('value') ?? '1',
  }
}

export function parseEmailTemplateEdit(doc: Document, rowId: string): EmailTemplateEdit {
  const row = doc.querySelector(`tr#rowid-${rowId}`)
  if (!row || !doc.querySelector(`[name="topic-${rowId}"]`)) throw new Error('This email template could not be read for editing.')
  const inRow = (name: string) => controlValue(row.querySelector(`[name="${name}"]`))
  const byName = (name: string) => controlValue(doc.querySelector(`[name="${name}"]`))
  return {
    rowId,
    label: inRow('label'),
    language: inRow('langcode'),
    type: inRow('type_template'),
    owner: inRow('fk_user'),
    isPrivate: inRow('private'),
    position: inRow('position'),
    subject: byName(`topic-${rowId}`),
    attachFiles: byName(`joinfiles-${rowId}`),
    content: byName(`content-${rowId}`),
  }
}
