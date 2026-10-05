// Parses payroll/absent_list.php — confirmed live to be a plain GET-able
// classic report page, same shape as atten_period_rip.php's own page (see
// attendancePeriodReportParser.ts), but with one real backend-confirmed
// difference: its SQL WHERE clause uses `stdate`/`enddate` directly against
// a `date` column with no reformatting (absent_list.php line ~161-163), so
// — unlike the period report — these need to be sent as YYYY-MM-DD, not
// MM/DD/YYYY. The Employee select also really does carry an "All Employee"
// option here (value="All"), which the period report's own select doesn't
// have. Status text/color is real, read straight off each row's own <span>
// (Full Day / Fore Noon / After Noon, each with a real distinct color).

export interface AbsentListEmployeeOption {
  value: string
  label: string
  group: string
}

export function parseAbsentListEmployees(doc: Document): AbsentListEmployeeOption[] {
  const select = doc.querySelector('#employee_li')
  if (!select) return []
  const options: AbsentListEmployeeOption[] = []
  select.querySelectorAll('option').forEach((o) => {
    const value = o.getAttribute('value') ?? ''
    if (!value || o.closest('optgroup')) return
    options.push({ value, label: (o.textContent ?? '').trim(), group: '' })
  })
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

export interface AbsentListRow {
  date: string
  day: string
  employeeName: string
  status: string
  statusDetail: string
  statusColor: string
}

export interface AbsentListResult {
  subhead: string
  periodLabel: string
  rows: AbsentListRow[]
}

export function parseEmployeeAbsentList(html: string): AbsentListResult {
  const doc = new DOMParser().parseFromString(html, 'text/html')

  const subhead = (doc.querySelector('#div_subhead1')?.textContent ?? '').trim()
  const periodText = (doc.querySelector('.sub_head')?.textContent ?? '').trim()
  const periodLabel = periodText.replace(/^For The Period of\s*/i, '').trim()

  const table = doc.querySelector('table.bd_border')
  const rows: AbsentListRow[] = []
  table?.querySelectorAll('tbody > tr').forEach((tr) => {
    const tds = Array.from(tr.querySelectorAll(':scope > td'))
    if (tds.length < 4) return
    const statusSpan = tds[3]?.querySelector('span')
    const statusSmall = tds[3]?.querySelector('small')
    const colorMatch = statusSpan?.getAttribute('style')?.match(/color:\s*(#?[0-9a-zA-Z]+)/)
    rows.push({
      date: (tds[0]?.textContent ?? '').trim(),
      day: (tds[1]?.textContent ?? '').trim(),
      employeeName: (tds[2]?.textContent ?? '').trim(),
      status: (statusSpan?.textContent ?? '').trim(),
      statusDetail: (statusSmall?.textContent ?? '').replace(/^\(|\)$/g, '').trim(),
      statusColor: colorMatch?.[1] ?? '',
    })
  })

  return { subhead, periodLabel, rows }
}
