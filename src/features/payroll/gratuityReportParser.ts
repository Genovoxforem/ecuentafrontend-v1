// Parses payroll/gratuity_report.php — confirmed live to be a plain
// GET-able classic report (its own <form method="POST"> has no `action`,
// real PHP reads `employee_li`/`submitt` via $_REQUEST). The Employee
// select is server-rendered directly into the page, grouped by real
// llx_entity rows, one real option per active (`statut`='1') llx_user in
// that entity. Real columns: Month/Basic Salary/Gratuity Amount, one row
// per llx_payroll_gratuity_report entry for the chosen employee, plus a
// real trailing Total row (tfoot) summing the Gratuity Amount column.

export interface GratuityEmployeeOption {
  value: string
  label: string
  group: string
}

export function parseGratuityEmployees(doc: Document): GratuityEmployeeOption[] {
  const select = doc.querySelector('#employee_li')
  if (!select) return []
  const options: GratuityEmployeeOption[] = []
  select.querySelectorAll('optgroup').forEach((group) => {
    const groupLabel = group.getAttribute('label') ?? ''
    group.querySelectorAll('option').forEach((o) => {
      const value = o.getAttribute('value') ?? ''
      if (!value) return
      options.push({ value, label: (o.textContent ?? '').trim(), group: groupLabel })
    })
  })
  return options
}

export interface GratuityReportRow {
  month: string
  basicSalary: string
  gratuityAmount: string
}

export interface GratuityReportResult {
  rows: GratuityReportRow[]
  total: string | null
}

export function parseGratuityReport(html: string): GratuityReportResult {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const table = doc.querySelector('table#example')
  const rows: GratuityReportRow[] = []
  table?.querySelectorAll('tbody > tr').forEach((tr) => {
    const tds = Array.from(tr.querySelectorAll(':scope > td'))
    if (tds.length < 3) return
    rows.push({
      month: (tds[0]?.textContent ?? '').trim(),
      basicSalary: (tds[1]?.textContent ?? '').trim(),
      gratuityAmount: (tds[2]?.textContent ?? '').trim(),
    })
  })
  const footCells = Array.from(table?.querySelectorAll('tfoot td') ?? [])
  const total = footCells.length > 0 ? (footCells[footCells.length - 1]?.textContent ?? '').trim() : null
  return { rows, total: total || null }
}
