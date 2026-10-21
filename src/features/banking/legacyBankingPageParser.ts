export interface LegacyBankingPageOption {
  label: string
  value: string
}

export interface LegacyBankingPageField {
  name: string
  label: string
  type: string
  value: string
  required: boolean
  checked: boolean
  multiple: boolean
  options: LegacyBankingPageOption[]
}

export interface LegacyBankingPageForm {
  action: string
  method: 'get' | 'post'
  fields: LegacyBankingPageField[]
  submitButtons: Array<{ label: string; name?: string; value?: string; type: 'submit' | 'reset' }>
}

export interface LegacyBankingPageCell {
  text: string
  href?: string
}

export interface LegacyBankingPageTable {
  caption: string
  headers: string[]
  rows: LegacyBankingPageCell[][]
}

export interface LegacyBankingPageData {
  title: string
  messages: string[]
  forms: LegacyBankingPageForm[]
  tables: LegacyBankingPageTable[]
}

function textContent(element: Element | null | undefined): string {
  return (element?.textContent ?? '').replace(/\s+/g, ' ').trim()
}

function getFieldLabel(element: Element): string {
  const id = element.getAttribute('id')
  const explicitLabel = id ? Array.from(element.ownerDocument.querySelectorAll('label')).find((label) => label.htmlFor === id) : null
  const nestedLabel = element.closest('label')
  const labelledBy = element.getAttribute('aria-labelledby')
  const ariaLabelledBy = labelledBy
    ? labelledBy.split(/\s+/).map((labelId) => textContent(element.ownerDocument.getElementById(labelId))).filter(Boolean).join(' ')
    : ''

  return textContent(explicitLabel ?? nestedLabel) || ariaLabelledBy || element.getAttribute('aria-label') || element.getAttribute('placeholder') || element.getAttribute('name') || ''
}

function parseField(element: Element): LegacyBankingPageField | null {
  if (element instanceof HTMLButtonElement) return null
  const name = element.getAttribute('name')
  if (!name) return null

  if (element instanceof HTMLSelectElement) {
    return {
      name,
      label: getFieldLabel(element),
      type: 'select',
      value: element.multiple ? '' : element.value,
      required: element.required,
      checked: false,
      multiple: element.multiple,
      options: Array.from(element.options).map((option) => ({ label: textContent(option), value: option.value })),
    }
  }

  if (element instanceof HTMLTextAreaElement) {
    return {
      name,
      label: getFieldLabel(element),
      type: 'textarea',
      value: element.value,
      required: element.required,
      checked: false,
      multiple: false,
      options: [],
    }
  }

  if (!(element instanceof HTMLInputElement)) return null
  return {
    name,
    label: getFieldLabel(element),
    type: element.type || 'text',
    value: element.value,
    required: element.required,
    checked: element.checked,
    multiple: false,
    options: [],
  }
}

function directCells(row: HTMLTableRowElement): HTMLTableCellElement[] {
  return Array.from(row.cells).filter((cell) => cell.closest('table') === row.closest('table'))
}

function parseTable(table: HTMLTableElement): LegacyBankingPageTable | null {
  if (table.closest('table') !== table) return null
  const rows = Array.from(table.rows).filter((row) => row.closest('table') === table)
  if (rows.length === 0) return null

  const headerRow = table.tHead?.rows.item(table.tHead.rows.length - 1)
  const headers = headerRow ? directCells(headerRow).map(textContent) : []
  const headerlessRows = rows.filter((row) => row !== headerRow && !row.classList.contains('liste_titre'))
  const dataRows = headerlessRows
    .map((row) => directCells(row))
    .filter((cells) => cells.length > 0)

  const resolvedHeaders = headers.length
    ? headers
    : (dataRows[0] ?? []).map((cell) => textContent(cell))
  const resolvedRows = headers.length ? dataRows : dataRows.slice(1)
  const parsedRows = resolvedRows.map((cells) => cells.map((cell) => {
    const anchor = cell.querySelector('a[href]')
    const href = anchor?.getAttribute('href') ?? undefined
    return {
      text: textContent(cell),
      href: href && href.startsWith('/') && !href.startsWith('//') ? href : undefined,
    }
  }))

  if (resolvedHeaders.length === 0 && parsedRows.length === 0) return null
  return {
    caption: textContent(table.caption),
    headers: resolvedHeaders,
    rows: parsedRows,
  }
}

export function parseLegacyBankingPage(html: string, fallbackAction = '/'): LegacyBankingPageData {
  const document = new DOMParser().parseFromString(html, 'text/html')
  const heading = document.querySelector('main h1, .fiche .titre, h1, .titre')
  const title = textContent(heading) || textContent(document.querySelector('title')) || 'Banking'

  const forms = Array.from(document.forms).map((form) => {
    const fields = Array.from(form.elements)
      .filter((element): element is Element => element instanceof Element)
      .map(parseField)
      .filter((field): field is LegacyBankingPageField => field !== null)
    const submitButtons = Array.from(form.querySelectorAll('button, input[type="submit"], input[type="reset"], input[type="image"]'))
      .filter((button) => !(button instanceof HTMLButtonElement) || !button.type || button.type === 'submit' || button.type === 'reset')
      .map((button) => ({
        label: textContent(button) || (button instanceof HTMLInputElement ? button.value : '') || 'Submit',
        name: button.getAttribute('name') || undefined,
        value: button.getAttribute('value') || (button instanceof HTMLButtonElement ? button.value : undefined) || undefined,
        type: button instanceof HTMLInputElement && button.type === 'reset' ? 'reset' as const : 'submit' as const,
      }))
    return {
      action: form.getAttribute('action') || fallbackAction,
      method: form.method.toLowerCase() === 'post' ? 'post' as const : 'get' as const,
      fields,
      submitButtons,
    }
  }).filter((form) => form.fields.some((field) => field.type !== 'hidden') || form.submitButtons.length > 0)

  const tables = Array.from(document.querySelectorAll('table'))
    .map((table) => parseTable(table))
    .filter((table): table is LegacyBankingPageTable => table !== null)

  const messages = Array.from(document.querySelectorAll('.alert, .warning, .error, .info, .opacitymedium'))
    .map(textContent)
    .filter((message, index, all) => message.length > 0 && all.indexOf(message) === index)
    .slice(0, 10)

  return { title, messages, forms, tables }
}
