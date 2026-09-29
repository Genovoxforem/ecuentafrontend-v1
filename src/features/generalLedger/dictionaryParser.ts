// Generic reader for a Dolibarr dictionary page (admin/dict.php?id=N&from=accountancy). Verified
// against the dev backend's dictionaries 7 (tax accounts), 10 (VAT) and 17 (expense report line
// types) and dict.php's own source. Every dictionary page has the same shape, so the fields, the
// filters and the columns are all discovered from the page rather than listed here:
//   - the add row: one form (hidden token/from/id) whose row holds one control per field — text
//     inputs and selects named after the table column — and the submit `actionadd`; the header row
//     above it gives each field's label (class `fieldrequired` marks a required one);
//   - the filter row: the row holding `button_search_x`, with `search_*` controls aligned under the
//     list's own column headers;
//   - each entry is `tr#rowid-N` with one `td.tddict` per data column, then the status link
//     (`action=activate|disable`), the edit link and the delete link, each carrying a token;
//   - the pencil re-renders the page with the entry as a second form (`actionmodify`, hidden
//     token/from/page/rowid/entity) using the same control names as the add row;
//   - the delete link only prints a confirmation box; see dictLinks.ts.

import { dictRelativeHref } from './dictLinks'

export interface DictionaryOption {
  value: string
  label: string
}

export interface DictionaryField {
  name: string
  label: string
  // Whether the backend refuses the entry without it (see OPTIONAL_FIELDS).
  required: boolean
  kind: 'text' | 'select'
  // Selects only; the blank option (an nbsp value on account lists) is left out.
  options: DictionaryOption[]
  // What the add row starts with (the selected option; '' for a blank one).
  value: string
}

export interface DictionaryFilter {
  name: string
  label: string
  kind: 'text' | 'select'
  options: DictionaryOption[]
  value: string
}

export interface DictionaryRow {
  rowid: string
  cells: string[]
  active: boolean
  toggleUrl: string | null
  editUrl: string | null
  deleteUrl: string | null
}

export interface DictionaryPage {
  token: string
  fields: DictionaryField[]
  filters: DictionaryFilter[]
  columns: string[]
  rows: DictionaryRow[]
}

export interface DictionaryEditForm {
  token: string
  rowid: string
  entity: string
  page: string
  values: Record<string, string>
}

// dict.php refuses an add/modify when any field is empty, except these (its own exclusion list) —
// the header's `fieldrequired` class only marks some of the fields it will refuse.
const OPTIONAL_FIELDS = new Set(['decalage', 'module', 'modulecode', 'decuctableper', 'accountancy_code', 'accountancy_code_sell', 'accountancy_code_buy', 'tracking', 'picto', 'color', 'formula', 'dayrule', 'sortorder'])

const clean = (value: string | null | undefined) => (value ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim()

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement

const isEditable = (el: Element): el is Control => {
  if (el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) return true
  return el instanceof HTMLInputElement && !['hidden', 'submit', 'button', 'reset', 'image', 'checkbox', 'radio'].includes(el.type)
}

function optionsOf(control: Control): DictionaryOption[] {
  if (!(control instanceof HTMLSelectElement)) return []
  return Array.from(control.options)
    .map((o) => ({ value: (o.getAttribute('value') ?? '').trim(), label: clean(o.textContent) }))
    .filter((o) => o.value !== '')
}

// A select with no `selected` option submits its first one, as a browser would.
function valueOf(control: Control | null | undefined): string {
  if (!control) return ''
  if (control instanceof HTMLSelectElement) return (control.selectedOptions[0]?.getAttribute('value') ?? '').trim()
  if (control instanceof HTMLTextAreaElement) return control.textContent ?? ''
  return control.getAttribute('value') ?? ''
}

const cellIndex = (cell: Element | null) => (cell ? Array.from(cell.parentElement?.children ?? []).indexOf(cell) : -1)

export function parseDictionary(doc: Document): DictionaryPage {
  const addBtn = doc.querySelector('input[name="actionadd"]')
  const addForm = addBtn?.closest('form')
  const addRow = addBtn?.closest('tr')
  const token = addForm?.querySelector<HTMLInputElement>('input[name="token"]')?.getAttribute('value') ?? ''
  if (!addForm || !addRow || !token) throw new Error('The dictionary on this backend page was not recognised.')

  // Header cells of the add table: label (and required flag) of the control under each.
  const addHeader = Array.from(addRow.closest('table')?.querySelector('tr')?.children ?? [])
  const fields: DictionaryField[] = []
  addRow.querySelectorAll('input, select, textarea').forEach((el) => {
    const name = el.getAttribute('name') ?? ''
    if (!name || !isEditable(el)) return
    const header = addHeader[cellIndex(el.closest('td'))]
    fields.push({
      name,
      label: clean(header?.textContent).replace(/\*$/, '').trim() || name,
      required: !OPTIONAL_FIELDS.has(name) || (!!header && (header.classList.contains('fieldrequired') || !!header.querySelector('.fieldrequired'))),
      kind: el instanceof HTMLSelectElement ? 'select' : 'text',
      options: optionsOf(el),
      value: valueOf(el),
    })
  })

  const entryRows = Array.from(doc.querySelectorAll('tr[id^="rowid-"]'))
  // The list table also holds the filter row, so an empty dictionary still has its headers.
  const filterRow = doc.querySelector('[name="button_search_x"]')?.closest('tr')
  const listTable = entryRows[0]?.closest('table') ?? filterRow?.closest('table') ?? null

  // Data columns: the list's header cells up to the Status column.
  const listHeader = Array.from(listTable?.querySelectorAll('tr:has(th) th') ?? [])
  const headerLabels = listHeader.map((th) => clean(th.getAttribute('title') || th.textContent))
  const dataColumns = entryRows[0] ? entryRows[0].querySelectorAll(':scope > td.tddict').length : headerLabels.findIndex((h) => /^status$/i.test(h))
  const columns = headerLabels.slice(0, dataColumns > 0 ? dataColumns : 0)

  const rows: DictionaryRow[] = []
  entryRows.forEach((tr) => {
    const cells = Array.from(tr.querySelectorAll(':scope > td.tddict'))
    if (cells.length === 0) return
    const toggle = tr.querySelector('a[href*="action=disable"], a[href*="action=activate"]')
    rows.push({
      rowid: tr.id.replace('rowid-', ''),
      cells: cells.map((c) => clean(c.textContent)),
      active: !!toggle?.getAttribute('href')?.includes('action=disable'),
      toggleUrl: dictRelativeHref(toggle?.getAttribute('href')),
      editUrl: dictRelativeHref(tr.querySelector('a[href*="action=edit"]')?.getAttribute('href')),
      deleteUrl: dictRelativeHref(tr.querySelector('a[href*="action=delete"]')?.getAttribute('href')),
    })
  })

  // Filters: `search_*` controls in the row holding the search button, labelled by the list header above.
  const filters: DictionaryFilter[] = []
  filterRow?.querySelectorAll('input, select').forEach((el) => {
    const name = el.getAttribute('name') ?? ''
    if (!name.startsWith('search_') || !isEditable(el)) return
    filters.push({
      name,
      label: headerLabels[cellIndex(el.closest('td'))] || name.replace(/^search_/, ''),
      kind: el instanceof HTMLSelectElement ? 'select' : 'text',
      options: optionsOf(el),
      value: valueOf(el),
    })
  })

  return { token, fields, filters, columns, rows }
}

// The edit form for one entry, read for its stored values instead of guessing from list cells.
export function parseDictionaryEditForm(doc: Document, fieldNames: string[]): DictionaryEditForm | null {
  const form = doc.querySelector('input[name="actionmodify"]')?.closest('form')
  if (!form) return null
  const get = (name: string) => valueOf(form.querySelector<Control>(`[name="${name}"]`))
  return {
    token: get('token'),
    rowid: get('rowid'),
    entity: get('entity'),
    page: get('page') || '0',
    values: Object.fromEntries(fieldNames.map((name) => [name, get(name)])),
  }
}
