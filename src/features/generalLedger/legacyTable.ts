// Generic reader for the classic Dolibarr list layout every General Ledger
// list page shares: an optional filter row (inputs/selects, `liste_titre_filter`),
// a header row (`liste_titre`), data rows (`tr.oddeven`) and total rows
// (`tr.liste_total`). Columns are identified by their header text, never by
// position, and the table is found by the text of its first header so stray
// tables (PHP notices, title bars) are never picked up.

export interface LegacyCell {
  text: string
  href: string | null // first link in the cell, as printed by the backend
  checkId: string | null // the row's selection checkbox (its data-id, else its value), when the cell holds one
}

export interface LegacyFilter {
  name: string
  kind: 'text' | 'select'
  value: string
  options: { value: string; label: string }[]
}

export interface LegacyTable {
  headers: string[]
  filters: (LegacyFilter | null)[] // aligned with headers
  rows: LegacyCell[][]
  totals: LegacyCell[][]
  // Named form fields of the page (first occurrence), e.g. the date range the
  // backend defaulted to.
  fields: Record<string, string>
}

export function cellText(el: Element | null | undefined): string {
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
}

function readCell(el: Element): LegacyCell {
  // Scripts (select2 bootstraps) would otherwise leak into textContent.
  const copy = el.cloneNode(true) as Element
  copy.querySelectorAll('script, style').forEach((s) => s.remove())
  // Icon-only cells (status toggles) carry their meaning in a tooltip attribute.
  const text = cellText(copy) || (el.querySelector('span[data-geo], i[data-geo]')?.getAttribute('data-geo') ?? '')
  const box = el.querySelector<HTMLInputElement>('input[type="checkbox"]')
  return {
    text: text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
    href: el.querySelector('a[href]')?.getAttribute('href') ?? null,
    // A disabled box (e.g. an already-synced row) cannot be acted on, so it is not selectable.
    checkId: box && !box.disabled ? (box.getAttribute('data-id') ?? (box.value && box.value !== 'on' ? box.value : null)) : null,
  }
}

// Date-range filters are several linked inputs (…day/…month/…year) that a
// single text box cannot drive, so they are left out.
const FILTERABLE = (name: string) => name !== '' && !/date|day$|month$|year$|^button/i.test(name)

function readFilter(cell: Element): LegacyFilter | null {
  const select = Array.from(cell.querySelectorAll<HTMLSelectElement>('select[name]')).find((s) => FILTERABLE(s.name))
  if (select) {
    return {
      name: select.name,
      kind: 'select',
      value: select.value,
      options: Array.from(select.options).map((o) => ({ value: o.value, label: cellText(o) })),
    }
  }
  const input = Array.from(cell.querySelectorAll<HTMLInputElement>('input[name]')).find((i) => i.type === 'text' && FILTERABLE(i.name))
  if (input) return { name: input.name, kind: 'text', value: input.value, options: [] }
  return null
}

function readFields(doc: Document): Record<string, string> {
  const fields: Record<string, string> = {}
  for (const el of Array.from(doc.querySelectorAll<HTMLInputElement | HTMLSelectElement>('form input[name], form select[name]'))) {
    if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio') && !el.checked) continue
    if (!(el.name in fields)) fields[el.name] = el.value
  }
  return fields
}

export function readLegacyTable(doc: Document, firstHeader: RegExp): LegacyTable | null {
  return readAllLegacyTables(doc, firstHeader, 1)[0] ?? null
}

// Every table whose header row starts with `firstHeader`, in page order.
export function readAllLegacyTables(doc: Document, firstHeader: RegExp, max = Infinity, hasHeader?: RegExp): LegacyTable[] {
  const found: LegacyTable[] = []
  const seen = new Set<Element>()
  let fields: Record<string, string> | null = null
  for (const tr of Array.from(doc.querySelectorAll('tr'))) {
    if (found.length >= max) break
    const cells = Array.from(tr.children)
    if (cells.length < 2 || !firstHeader.test(cellText(cells[0]))) continue
    if (cells[0].querySelector('input:not([type="checkbox"]), select')) continue // a filter row, not the header
    const table = tr.closest('table')
    if (!table || table.querySelector('table') || seen.has(table)) continue
    seen.add(table)

    const trs = Array.from(table.querySelectorAll('tr')).filter((r) => r.closest('table') === table)
    const headerIndex = trs.indexOf(tr)
    const previous = trs[headerIndex - 1]
    const filterCells = previous && previous.querySelector('input[name], select[name]') ? Array.from(previous.children) : []

    const rows: LegacyCell[][] = []
    const totals: LegacyCell[][] = []
    // Some pages leave their data rows without the usual `oddeven` class.
    const hasOddeven = trs.slice(headerIndex + 1).some((r) => r.classList.contains('oddeven'))
    for (const r of trs.slice(headerIndex + 1)) {
      const c = Array.from(r.children)
      if (c.length < 2) continue // "No record found" spans a single cell
      if (r.classList.contains('liste_total') || (!r.classList.contains('oddeven') && c[0].tagName === 'TH' && /^total|:$/i.test(cellText(c[0])))) totals.push(c.map(readCell))
      else if (r.classList.contains('oddeven') || (!hasOddeven && c.length === cells.length && !r.querySelector('input[name^="search_"], select[name^="search_"]'))) rows.push(c.map(readCell))
    }
    const table2: LegacyTable = {
      headers: cells.map((c) => (c.querySelector('input:not([type="checkbox"]), select') ? '' : cellText(c))),
      filters: cells.map((_, i) => (filterCells[i] ? readFilter(filterCells[i]) : null)),
      rows,
      totals,
      fields: (fields ??= readFields(doc)),
    }
    if (hasHeader && !table2.headers.some((h) => hasHeader.test(h))) continue // an unrelated table with a similar first header
    found.push(dropEmptyColumns(table2))
  }
  return found
}

// The real pages end with an action column and a column-picker cell that carry
// no data; a column with no header, no filter and no text anywhere is dropped.
function dropEmptyColumns(t: LegacyTable): LegacyTable {
  // (A selection-checkbox column has no header or text but is not empty.)
  const keep = t.headers.map((h, i) => h !== '' || t.filters[i] !== null || [...t.rows, ...t.totals].some((r) => (r[i]?.text ?? '') !== '' || r[i]?.checkId != null))
  const pick = <T,>(arr: T[]) => arr.filter((_, i) => keep[i])
  return { headers: pick(t.headers), filters: pick(t.filters), rows: t.rows.map(pick), totals: t.totals.map(pick), fields: t.fields }
}

// Report tables (groups reports) mix section titles, item rows and total rows
// in one table, so every non-empty row is kept with what kind of row it is.
export interface ReportRow {
  cells: string[]
  kind: 'section' | 'item' | 'total'
}

export interface ReportTable {
  headers: string[]
  rows: ReportRow[]
}

export function readReportTable(doc: Document, firstHeader: RegExp): ReportTable | null {
  for (const tr of Array.from(doc.querySelectorAll('tr'))) {
    const cells = Array.from(tr.children)
    if (cells.length < 2 || !firstHeader.test(cellText(cells[0]))) continue
    const table = tr.closest('table')
    if (!table || table.querySelector('table')) continue
    const trs = Array.from(table.querySelectorAll('tr')).filter((r) => r.closest('table') === table)
    const rows: ReportRow[] = []
    for (const r of trs.slice(trs.indexOf(tr) + 1)) {
      const texts = Array.from(r.children).map((c) => cellText(c))
      if (texts.every((t) => t === '')) continue
      const kind = /total/i.test(r.className) ? 'total' : r.classList.contains('oddeven') ? 'item' : 'section'
      rows.push({ cells: texts, kind })
    }
    return { headers: cells.map((c) => cellText(c)), rows }
  }
  return null
}
