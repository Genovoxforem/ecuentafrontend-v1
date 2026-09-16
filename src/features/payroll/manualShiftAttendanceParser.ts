// Parses payroll/shiftsmanual_ajax.php?enterAttendance=1 — the real
// backend fragment behind payroll/shiftsmanual_attendance.php's own
// "Search" button (POST, params in the query string: ListofEmployee=All,
// TypesOfEntity=1, att_date=YYYY-MM-DD, shiftId=3|4). Returns raw HTML
// (`$("#tableBody").html(msg)` client-side, not JSON — confirmed live, same
// gap payrollAttendance.queries.ts's own header comment already documents
// for this page's read side), one <tr class="tab-link"> per employee with
// real name/designation and the real per-row defaults: every employee
// starts pre-checked "Present" with clockIn/clockOut defaulted to
// 08:00:00/17:00:00 — this form has no concept of "not yet marked" per
// employee (unlike the regular Mark Attendance page's own
// attendance_rip_ajax.php), it's a from-scratch "mark today" sheet every
// time, confirmed by reading several employees' rows live (all `checked`,
// none omitted).

export interface ManualShiftEmployeeRow {
  employeeId: number
  name: string
  designation: string
  present: boolean
  clockIn: string // HH:mm
  clockOut: string // HH:mm
}

// "08:00:00" -> "08:00"
function toHHMM(value: string): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(value.trim())
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : ''
}

export function parseManualShiftAttendanceRows(html: string): ManualShiftEmployeeRow[] {
  const doc = new DOMParser().parseFromString(`<table><tbody>${html}</tbody></table>`, 'text/html')
  const rows: ManualShiftEmployeeRow[] = []
  doc.querySelectorAll('tr.tab-link').forEach((tr) => {
    const employeeId = Number(tr.querySelector<HTMLInputElement>('input.empid')?.value ?? '')
    if (!employeeId) return
    const tds = Array.from(tr.querySelectorAll('td'))
    const name = (tds[1]?.textContent ?? '').trim()
    const designation = (tds[2]?.textContent ?? '').trim()
    const present = tr.querySelector('input.checkItemss')?.hasAttribute('checked') ?? true
    const clockIn = toHHMM(tr.querySelector<HTMLInputElement>('input[name="clockInEmp[]"]')?.value ?? '')
    const clockOut = toHHMM(tr.querySelector<HTMLInputElement>('input[name="clockoutEmp[]"]')?.value ?? '')
    rows.push({ employeeId, name, designation, present, clockIn: clockIn || '08:00', clockOut: clockOut || '17:00' })
  })
  return rows
}
