import { cellText } from './legacyTable'

// accountancy/bookkeeping/list.php ("Operations - Journals"). Notes from the page's own PHP and
// its live markup:
//   - one row per accounting line, sorted by `t.piece_num, t.rowid`, server-paginated with `limit`
//     and `page` (no total is printed, only a next/previous arrow);
//   - the shown columns are the user's own choice (the `selectedfields` picker in the last header
//     cell); only ticked columns are printed, in the picker's order;
//   - while the "Include docs already exported" switch (constant ACCOUNTING_REEXPORT) is off, lines
//     that already have an export date are left out of the list;
//   - the edit / delete icons of a row only exist when the user may act and the line has not been
//     exported; the trash icon deletes the whole transaction (its `mvt_num` is the piece number);
//   - without any date parameter (and without `formfilteraction`) the backend applies the current
//     fiscal year and prints it back in the date filter.

export interface JournalColumn {
  // The picker's own key, e.g. `t.piece_num`.
  key: string
  label: string
  visible: boolean
}

export interface JournalCell {
  text: string
  // First link of the cell as printed (an invoice for `t.doc_ref`, …), root-relative.
  href: string | null
}

export interface JournalRow {
  pieceNum: string
  cells: Record<string, JournalCell>
  canEdit: boolean
  canDelete: boolean
}

export interface JournalOption {
  value: string
  label: string
}

export interface JournalsList {
  columns: JournalColumn[]
  rows: JournalRow[]
  // Page totals by column key (`t.debit`, `t.credit`); empty when the page prints none.
  totals: Record<string, string>
  // Filter values as the page shows them, by the backend's own parameter names. Dates are ISO
  // (yyyy-mm-dd) or ''.
  filters: Record<string, string>
  accountOptions: JournalOption[]
  limit: number
  limitOptions: number[]
  // 0-based
  page: number
  hasPrev: boolean
  hasNext: boolean
  // "Include docs already exported" is on.
  reexport: boolean
  token: string
  // Tooltip of the export button (it names the configured export format), null when the user has
  // no export right.
  exportTitle: string | null
}

// Each of these is posted as `<name>day`, `<name>month` and `<name>year`.
export const JOURNAL_DATE_FILTERS = [
  'search_date_start',
  'search_date_end',
  'date_creation_start',
  'date_creation_end',
  'date_modification_start',
  'date_modification_end',
  'date_export_start',
  'date_export_end',
] as const

export const JOURNAL_TEXT_FILTERS = [
  'search_mvt_num',
  'search_ledger_code',
  'search_doc_ref',
  'search_accountancy_code_start',
  'search_accountancy_code_end',
  'search_accountancy_aux_code_start',
  'search_accountancy_aux_code_end',
  'search_mvt_label',
  'search_debit',
  'search_credit',
  'search_lettering_code',
  'search_not_reconciled',
] as const

const pad = (n: string) => n.padStart(2, '0')

function readFilters(doc: Document): Record<string, string> {
  const scope: ParentNode = doc.querySelector('tr.liste_titre_filter') ?? doc
  const field = (name: string) => scope.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`)
  const filters: Record<string, string> = {}

  for (const name of JOURNAL_TEXT_FILTERS) {
    const el = field(name)
    if (!el) continue
    if (el instanceof HTMLInputElement && el.type === 'checkbox') {
      filters[name] = el.checked ? el.value : ''
    } else if (el instanceof HTMLSelectElement) {
      // A select's blank choice is `-1` (an empty value would submit the first option).
      const value = el.selectedOptions[0]?.value.trim() ?? ''
      filters[name] = value === '-1' ? '' : value
    } else {
      filters[name] = el.value
    }
  }

  for (const name of JOURNAL_DATE_FILTERS) {
    const y = field(`${name}year`)?.value.trim()
    const m = field(`${name}month`)?.value.trim()
    const d = field(`${name}day`)?.value.trim()
    if (y && m && d) filters[name] = `${y}-${pad(m)}-${pad(d)}`
    else if (field(`${name}year`)) filters[name] = ''
  }
  return filters
}

function readColumns(doc: Document, headerCells: Element[]): JournalColumn[] {
  const picked = Array.from(doc.querySelectorAll<HTMLInputElement>('ul.ulselectedfields input[type="checkbox"]')).map((box) => ({
    key: box.value,
    label: cellText(box.closest('li')),
    visible: box.checked,
  }))
  if (picked.length > 0) return picked
  // No picker (the page was refused a permission): every header is shown, keyed by its own text.
  return headerCells.map((th) => ({ key: cellText(th), label: cellText(th), visible: true }))
}

function firstLink(cell: Element): string | null {
  const link = Array.from(cell.querySelectorAll('a[href]')).find((a) => !/document\.php/.test(a.getAttribute('href') ?? ''))
  return link?.getAttribute('href') ?? null
}

export function readJournalsList(doc: Document): JournalsList {
  const table = doc.querySelector('table.ledger-table')
  const filterRow = table?.querySelector('tr.liste_titre_filter')
  if (!table || !filterRow) throw new Error('The journals list on this backend page was not recognised.')

  const headerRow = filterRow.nextElementSibling
  // The last header cell holds the column picker, not a column.
  const headerCells = Array.from(headerRow?.children ?? []).filter((th) => !th.querySelector('dl.dropdown'))
  const columns = readColumns(doc, headerCells)
  const visible = columns.filter((c) => c.visible)

  const rows: JournalRow[] = []
  for (const tr of Array.from(table.querySelectorAll('tr.oddeven'))) {
    if (tr.closest('table') !== table) continue
    const tds = Array.from(tr.children)
    const cells: Record<string, JournalCell> = {}
    visible.forEach((col, i) => {
      const td = tds[i]
      if (td) cells[col.key] = { text: cellText(td), href: firstLink(td) }
    })
    const actions = tds[visible.length]
    const edit = actions?.querySelector('a.editfielda[href*="piece_num="]')
    const del = actions?.querySelector('a[href*="action=delmouv"]')
    const pieceNum =
      /piece_num=(\d+)/.exec(cells['t.piece_num']?.href ?? '')?.[1] ?? /piece_num=(\d+)/.exec(edit?.getAttribute('href') ?? '')?.[1] ?? /mvt_num=(\d+)/.exec(del?.getAttribute('href') ?? '')?.[1] ?? cells['t.piece_num']?.text ?? ''
    rows.push({ pieceNum, cells, canEdit: !!edit, canDelete: !!del })
  }

  const totals: Record<string, string> = {}
  const totalRow = table.querySelector('tr.liste_total')
  if (totalRow) {
    Array.from(totalRow.children).forEach((td, i) => {
      const col = visible[i]
      const text = cellText(td)
      if (col && i > 0 && text) totals[col.key] = text
    })
  }

  const limitSelect = doc.querySelector<HTMLSelectElement>('select#limit')
  const limitOptions = Array.from(limitSelect?.options ?? [], (o) => Number(cellText(o))).filter((n) => n > 0)
  const limit = Number(cellText(limitSelect?.selectedOptions[0])) || limitOptions[0] || 25

  const pageOneBased = Number(doc.querySelector<HTMLInputElement>('input[name="pageplusoneold"]')?.value) || 1

  const reexportLink = doc.querySelector('a[href*="action=setreexport"]')
  const exportLink = doc.querySelector('a[href*="action=export_file"]')

  return {
    columns,
    rows,
    totals,
    filters: readFilters(doc),
    accountOptions: Array.from(filterRow.querySelectorAll<HTMLOptionElement>('select[name="search_accountancy_code_start"] option'))
      .map((o) => ({ value: o.value.trim(), label: cellText(o) }))
      .filter((o) => o.value && o.value !== '-1'),
    limit,
    limitOptions,
    page: pageOneBased - 1,
    hasPrev: !!doc.querySelector('a.paginationprevious'),
    hasNext: !!doc.querySelector('a.paginationnext'),
    reexport: !!reexportLink?.querySelector('.fa-toggle-on'),
    token: doc.querySelector<HTMLInputElement>('#searchFormList input[name="token"]')?.value ?? '',
    exportTitle: exportLink?.getAttribute('title') ?? null,
  }
}
