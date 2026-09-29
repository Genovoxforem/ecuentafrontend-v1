// Parses the list table (`table#example`) that every Payroll HR / shift / salary
// page (payroll/holiday.php, award.php, transfers.php, shifts.php, loan.php, …)
// renders server-side — verified against the dev backend. The page's own script
// turns it into a DataTable in the browser, so the HTML itself is a plain table:
// a `thead` of column names and one `tbody tr` per record, the last cell holding
// the row's edit/delete buttons (and, for some pages, a hidden edit form).

export interface PayrollLegacyRow {
  // The record's id, read off the row (see rowId) — what the delete action needs.
  id: string | null
  // One text per column, in header order. The Action column is left empty.
  cells: string[]
}

export interface PayrollLegacyTable {
  headers: string[]
  // Index of the "Action" column in `headers`, or -1.
  actionIndex: number
  rows: PayrollLegacyRow[]
}

function clean(value: string | null | undefined): string {
  return (value ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim()
}

// Rows are `<tr id="Row2">` on the pages that have data to show; a page that
// doesn't render that falls back to the first number in one of the row's own
// handlers (`onclick="deletefun(2)"`) or in the edit panel it opens
// (`data-bs-target="#editHour2"`).
function rowId(tr: Element): string | null {
  const fromId = tr.id.match(/(\d+)$/)?.[1]
  if (fromId) return fromId
  for (const el of Array.from(tr.querySelectorAll('[onclick]'))) {
    const n = el.getAttribute('onclick')?.match(/\(\s*['"]?(\d+)['"]?\s*[,)]/)?.[1]
    if (n) return n
  }
  const target = tr.querySelector('[data-bs-target]')?.getAttribute('data-bs-target')?.match(/(\d+)$/)?.[1]
  return target ?? null
}

export function parsePayrollTable(doc: Document): PayrollLegacyTable {
  const table = doc.querySelector('table#example')
  if (!table) throw new Error('The list on this backend page was not recognised.')
  const headers = Array.from(table.querySelectorAll('thead th')).map((th) => clean(th.textContent))
  const actionIndex = headers.findIndex((h) => /^action$/i.test(h))
  const rows: PayrollLegacyRow[] = []
  table.querySelectorAll('tbody tr').forEach((tr) => {
    const tds = Array.from(tr.querySelectorAll(':scope > td'))
    // DataTables' "no data" row is a single cell that spans the table.
    if (tds.length !== headers.length) return
    rows.push({
      id: rowId(tr),
      cells: tds.map((td, i) => (i === actionIndex ? '' : clean(td.textContent))),
    })
  })
  return { headers, actionIndex, rows }
}
