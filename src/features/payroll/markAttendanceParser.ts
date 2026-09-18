// Parses payroll/mark_attendance_ajax.php?enterAttendance=1 — the real
// fragment behind payroll/mark_attendance.php's own "Search" button (POST,
// params in the query string: ListofEmployee, TypesOfEntity, att_date).
// Confirmed live: every employee row is one of two real, distinct states —
//   1. No shift mapped for the selected date: a red <h6 class=
//      "shift-not-assigned"> with one of two real message variants ("Shift
//      Not Assigned" when the employee has no shift assignment at all,
//      "The selected date (...) is not mapped in shift" when they have one
//      but it doesn't cover this date) — scraped verbatim rather than
//      guessed, and clickable in the real page to open the real "Assign
//      Shift" panel (see useAssignShift in payrollAttendance.queries.ts).
//   2. A shift mapped for the date: real Present/Absent/Permission
//      checkboxes, ALL unchecked by default (confirmed live — unlike the
//      Special/Holiday Shift form, this page has no "everyone starts
//      Present" default; every employee starts genuinely undecided), plus
//      the real per-employee default Clock In/Out from their assigned
//      shift and a handful of hidden passthrough fields
//      (attendanceId/shiftId/holiday_tbl_id/requestedleave) this page's own
//      JS round-trips verbatim on save — captured here so this app's own
//      save can do the same instead of dropping them.

export interface UnmappedShiftRow {
  kind: 'unmapped'
  employeeId: number
  name: string
  designation: string
  message: string // verbatim real text — see this file's own top comment on the two variants
}

export interface AssignableAttendanceRow {
  kind: 'assignable'
  employeeId: number
  name: string
  designation: string
  clockIn: string // HH:mm, from the employee's real assigned shift
  clockOut: string // HH:mm
  attendanceId: string
  shiftId: string
  holidayTblId: string
  requestedLeave: string
}

export type MarkAttendanceRow = UnmappedShiftRow | AssignableAttendanceRow

export interface AbsenceReasonOption {
  value: string
  label: string
}

// "08:00:00" -> "08:00"
function toHHMM(value: string): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(value.trim())
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : ''
}

function inputValue(tr: Element, name: string): string {
  return tr.querySelector<HTMLInputElement>(`input[name="${name}"]`)?.value.trim() ?? ''
}

export function parseMarkAttendanceRows(html: string): { rows: MarkAttendanceRow[]; reasonOptions: AbsenceReasonOption[] } {
  const doc = new DOMParser().parseFromString(`<table><tbody>${html}</tbody></table>`, 'text/html')
  const rows: MarkAttendanceRow[] = []
  let reasonOptions: AbsenceReasonOption[] = []

  doc.querySelectorAll('tr.tab-link').forEach((tr) => {
    const employeeId = Number(tr.querySelector<HTMLInputElement>('input.empid')?.value ?? '')
    if (!employeeId) return
    const tds = Array.from(tr.querySelectorAll(':scope > td'))
    const name = (tds[1]?.textContent ?? '').trim()
    const designation = (tds[2]?.textContent ?? '').trim()

    const notMapped = tr.querySelector('.shift-not-assigned')
    if (notMapped) {
      rows.push({ kind: 'unmapped', employeeId, name, designation, message: (notMapped.textContent ?? '').trim() })
      return
    }

    if (reasonOptions.length === 0) {
      const reasonSelect = tr.querySelector<HTMLSelectElement>('select[name="abs_typ[]"]')
      if (reasonSelect) {
        reasonOptions = Array.from(reasonSelect.querySelectorAll('option'))
          .map((o) => ({ value: o.getAttribute('value') ?? '', label: (o.textContent ?? '').trim() }))
          .filter((o) => o.value)
      }
    }

    const clockIn = toHHMM(tr.querySelector<HTMLInputElement>(`input[name="clockInEmp[${employeeId}]"]`)?.value ?? '')
    const clockOut = toHHMM(tr.querySelector<HTMLInputElement>(`input[name="clockoutEmp[${employeeId}]"]`)?.value ?? '')
    rows.push({
      kind: 'assignable',
      employeeId,
      name,
      designation,
      clockIn: clockIn || '08:00',
      clockOut: clockOut || '17:00',
      attendanceId: inputValue(tr, `attendanceId[${employeeId}]`),
      shiftId: inputValue(tr, `shiftId[${employeeId}]`),
      holidayTblId: inputValue(tr, `holiday_tbl_id[${employeeId}]`),
      requestedLeave: inputValue(tr, `requestedleave[${employeeId}]`),
    })
  })

  return { rows, reasonOptions }
}

// Real via the "Assign Shift" offcanvas on payroll/mark_attendance.php
// itself — the same 4 real shifts (llx_payroll_shifts) every attendance
// page in this module ultimately points at (Special Shift=3, Holiday
// shift=4, plus 2 more this page alone lets you assign from).
export interface ShiftOption {
  value: string
  label: string
}
export function parseAssignShiftOptions(doc: Document): ShiftOption[] {
  return Array.from(doc.querySelectorAll('select#shifts option'))
    .map((o) => ({ value: o.getAttribute('value') ?? '', label: (o.textContent ?? '').trim() }))
    .filter((o) => o.value)
}
