// Shared parser for the plain server-rendered report tables on
// payroll/payroll_deduction.php (Allowance/Deduction Report), napsa_report.php,
// nhima_report.php, employer_contribution.php and shift_timeline.php. All five
// are plain GET-able classic pages (the filter <form> is POST in markup, but
// the PHP reads $_REQUEST and shift_timeline.php uses GET outright) and each
// renders one <table> whose <tbody> holds the rows. A cell that holds several
// <div>s (Employer Contribution's Account Type / Amount columns) is joined with
// newlines so the lines survive.

export interface ReportTable {
  headers: string[]
  rows: string[][]
}

function cellText(td: Element): string {
  const divs = Array.from(td.querySelectorAll(':scope > div'))
  const raw = divs.length > 0 ? divs.map((d) => d.textContent ?? '').join('\n') : (td.textContent ?? '')
  return raw
    .replace(/ /g, ' ')
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
}

export function parseReportTable(html: string, tableSelector: string): ReportTable {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const table = doc.querySelector(tableSelector)
  const headers = Array.from(table?.querySelectorAll('thead th') ?? []).map((th) => (th.textContent ?? '').replace(/\s+/g, ' ').trim())
  const rows: string[][] = []
  table?.querySelectorAll('tbody > tr').forEach((tr) => {
    const tds = Array.from(tr.querySelectorAll(':scope > td'))
    if (tds.length === 0) return
    const cells = tds.map(cellText)
    // DataTables' own "No data" placeholder row, if the markup carries one.
    if (cells.length === 1 && /no data/i.test(cells[0])) return
    rows.push(cells)
  })
  return { headers, rows }
}

export interface ReportSelectOption {
  value: string
  label: string
}

// Plain option list (blank value skipped) from a <select> by selector.
export function parseSelectOptions(doc: Document, selector: string, keepZero = true): ReportSelectOption[] {
  const select = doc.querySelector(selector)
  if (!select) return []
  return Array.from(select.querySelectorAll('option'))
    .map((o) => ({ value: (o.getAttribute('value') ?? '').trim(), label: (o.textContent ?? '').replace(/\s+/g, ' ').trim() }))
    .filter((o) => o.value !== '' && (keepZero || o.value !== '0'))
}
