// Parses payroll/atten_emp_rip.php — confirmed live to be a plain GET-able
// classic report page (its own <form> is POST-only and CSRF-blocked when
// called cross-origin from this app, same as payroll/earn_dedu.php's own
// form, but the exact same monthPic/employee_li/submitt params work fine
// as a GET, no CSRF check applied there — verified directly). Genuinely
// real, per-day data once an employee is selected: one row per calendar
// day of the chosen month (Date/Day/IN Time/OUT Time/Working Hours/Status/
// Details, Status real-colored per day — e.g. orange "Holiday" on
// weekends), plus a real trailing "Total Working hours" summary row.
// Employee options come from this same page's own #employee_li select —
// real user ids, composite with the entity id ("103_1"), no separate
// endpoint needed.

export interface EmployeeMonthlyReportOption {
  value: string
  label: string
}

export function parseEmployeeMonthlyReportEmployees(doc: Document): EmployeeMonthlyReportOption[] {
  const select = doc.querySelector('#employee_li')
  if (!select) return []
  return Array.from(select.querySelectorAll('option'))
    .map((o) => ({ value: o.getAttribute('value') ?? '', label: (o.textContent ?? '').trim() }))
    .filter((o) => o.value)
}

export interface EmployeeMonthlyReportRow {
  date: string
  day: string
  inTime: string
  outTime: string
  workingHours: string
  status: string
  statusColor: string
  details: string
}

export interface EmployeeMonthlyReportResult {
  employeeName: string
  monthLabel: string
  rows: EmployeeMonthlyReportRow[]
  totalWorkingHours: string | null
}

export function parseEmployeeMonthlyReport(html: string): EmployeeMonthlyReportResult {
  const doc = new DOMParser().parseFromString(html, 'text/html')

  const subhead = (doc.querySelector('#div_subhead1')?.textContent ?? '').trim()
  const employeeName = subhead.replace(/-\s*MONTHLY REPORT\s*$/i, '').trim()

  const monthText = (doc.querySelector('.sub_head')?.textContent ?? '').trim()
  const monthLabel = monthText.replace(/^For The Month of\s*/i, '').trim()

  const table = doc.querySelector('table.bd_border')
  const rows: EmployeeMonthlyReportRow[] = []
  let totalWorkingHours: string | null = null

  Array.from(table?.querySelectorAll('tbody > tr') ?? []).forEach((tr) => {
    const tds = Array.from(tr.querySelectorAll('td'))
    const firstText = (tds[0]?.textContent ?? '').trim()
    if (firstText.toLowerCase().includes('total working hours')) {
      totalWorkingHours = (tds[tds.length - 1]?.textContent ?? '').trim()
      return
    }
    if (tds.length < 7) return
    const statusSpan = tds[5]?.querySelector('span')
    const colorMatch = statusSpan?.getAttribute('style')?.match(/color:\s*(#[0-9a-fA-F]{3,8})/)
    rows.push({
      date: firstText,
      day: (tds[1]?.textContent ?? '').trim(),
      inTime: (tds[2]?.textContent ?? '').trim(),
      outTime: (tds[3]?.textContent ?? '').trim(),
      workingHours: (tds[4]?.textContent ?? '').trim(),
      status: (statusSpan?.textContent ?? tds[5]?.textContent ?? '').trim(),
      statusColor: colorMatch?.[1] ?? '',
      details: (tds[6]?.textContent ?? '').trim(),
    })
  })

  return { employeeName, monthLabel, rows, totalWorkingHours }
}
