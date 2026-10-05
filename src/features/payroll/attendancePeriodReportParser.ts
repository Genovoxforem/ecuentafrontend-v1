// Parses payroll/atten_period_rip.php — confirmed live to be a plain
// GET-able classic report page (its own <form method="POST"> has no
// `action`, so it posts back to itself; the same employee_li/stdate/
// enddate/searchBydate params work fine as a GET, confirmed by reading the
// "For The Period of X To Y" subhead echo back exactly what was sent).
// Real backend quirk, confirmed by reading atten_period_rip.php directly:
// `stdate`/`enddate` MUST be sent as MM/DD/YYYY — the SQL WHERE clause
// parses them with `DateTime::createFromFormat('m/d/Y', ...)`, unlike
// absent_list.php's own WHERE clause (see employeeAbsentListParser.ts),
// which needs YYYY-MM-DD instead. Each row's own ACTION cell embeds a full
// real login-history modal (IN DATE/CLOCK IN/OUT DATE/CLOCK OUT/Clock In
// Note/Clock Out Note/Working Hour/Device), server-rendered inline — same
// per-row-modal pattern as Date Wise Attendance's own History button (see
// payrollAttendance.queries.ts's parseLoginHistory), but this page's modal
// table has 2 extra date columns (IN DATE/OUT DATE alongside CLOCK IN/OUT),
// so it needs its own parser rather than reusing that one directly. This
// backend has no attendance records at all right now (every employee, every
// recent date — confirmed via payroll/attendance_rip_ajax.php returning "-"
// for every field), so the modal parsing below is built from the PHP
// source's own markup, not exercised against a real populated row yet.

export interface AttendancePeriodEmployeeOption {
  value: string
  label: string
  group: string
}

export function parseAttendancePeriodEmployees(doc: Document): AttendancePeriodEmployeeOption[] {
  const select = doc.querySelector('#employee_li')
  if (!select) return []
  const options: AttendancePeriodEmployeeOption[] = []
  select.querySelectorAll('optgroup').forEach((group) => {
    const groupLabel = group.getAttribute('label') ?? ''
    group.querySelectorAll('option').forEach((o) => {
      const value = o.getAttribute('value') ?? ''
      if (!value) return
      options.push({ value, label: (o.textContent ?? '').trim(), group: groupLabel })
    })
  })
  if (options.length === 0) {
    // No optgroups (flat list) — fall back to every non-blank option.
    select.querySelectorAll('option').forEach((o) => {
      const value = o.getAttribute('value') ?? ''
      if (!value) return
      options.push({ value, label: (o.textContent ?? '').trim(), group: '' })
    })
  }
  return options
}

export interface AttendancePeriodHistoryVisit {
  inDate: string
  clockIn: string
  outDate: string
  clockOut: string
  clockInNote: string
  clockOutNote: string
  workingHour: string
  device: string
}

function parseHistoryModal(cell: Element | undefined): AttendancePeriodHistoryVisit[] {
  if (!cell) return []
  const visits: AttendancePeriodHistoryVisit[] = []
  cell.querySelectorAll('.modal-body tbody tr').forEach((tr) => {
    const tds = Array.from(tr.querySelectorAll('td'))
    if (tds.length < 8) return
    visits.push({
      inDate: (tds[0].textContent ?? '').trim(),
      clockIn: (tds[1].textContent ?? '').trim(),
      outDate: (tds[2].textContent ?? '').trim(),
      clockOut: (tds[3].textContent ?? '').trim(),
      clockInNote: (tds[4].textContent ?? '').trim(),
      clockOutNote: (tds[5].textContent ?? '').trim(),
      workingHour: (tds[6].textContent ?? '').trim(),
      device: (tds[7].textContent ?? '').trim(),
    })
  })
  return visits
}

export interface AttendancePeriodRow {
  date: string
  employee: string
  attendance: string
  attendanceColor: string
  type: string
  inDate: string
  clockIn: string
  outDate: string
  clockOut: string
  workingHours: string
  ipAddress: string
  history: AttendancePeriodHistoryVisit[]
}

export interface AttendancePeriodReportResult {
  subhead: string
  periodLabel: string
  rows: AttendancePeriodRow[]
}

export function parseAttendancePeriodReport(html: string): AttendancePeriodReportResult {
  const doc = new DOMParser().parseFromString(html, 'text/html')

  const subhead = (doc.querySelector('#div_subhead1')?.textContent ?? '').trim()
  const periodText = (doc.querySelector('.sub_head')?.textContent ?? '').trim()
  const periodLabel = periodText.replace(/^For The Period of\s*/i, '').trim()

  const table = doc.querySelector('table.bd_border')
  const rows: AttendancePeriodRow[] = []
  table?.querySelectorAll('tbody > tr').forEach((tr) => {
    const tds = Array.from(tr.querySelectorAll(':scope > td'))
    if (tds.length < 10) return
    const attendanceSpan = tds[2]?.querySelector('span')
    const colorMatch = attendanceSpan?.getAttribute('style')?.match(/color:\s*(#?[0-9a-zA-Z]+)/)
    rows.push({
      date: (tds[0]?.textContent ?? '').trim(),
      employee: (tds[1]?.textContent ?? '').trim(),
      attendance: (attendanceSpan?.textContent ?? tds[2]?.textContent ?? '').trim(),
      attendanceColor: colorMatch?.[1] ?? '',
      type: (tds[3]?.textContent ?? '').trim(),
      inDate: (tds[4]?.textContent ?? '').trim(),
      clockIn: (tds[5]?.textContent ?? '').trim(),
      outDate: (tds[6]?.textContent ?? '').trim(),
      clockOut: (tds[7]?.textContent ?? '').trim(),
      workingHours: (tds[8]?.textContent ?? '').trim(),
      ipAddress: (tds[9]?.textContent ?? '').trim(),
      history: parseHistoryModal(tds[10]),
    })
  })

  return { subhead, periodLabel, rows }
}
