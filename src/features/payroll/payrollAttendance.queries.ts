import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// The only 2 real JSON endpoints anywhere in the Payroll module (confirmed
// this session by a full audit of both payroll/ and the never-activated
// payroll_v2/ against the live database — see the module's other 52 pages,
// all NotBuiltPage placeholders, for the rest of that finding).
//
// The real "Devices" dropdown on payroll/attendance_rip.php is
// server-rendered straight from `device_setting` — there's no JSON list
// endpoint for it (custom/payroll/admin/save_ajax.php only has a
// single-device-by-id brand lookup and bare-status-code writes, confirmed
// by reading that file directly), so this deliberately does NOT scrape that
// page's HTML to fabricate one. Instead the Devices filter below is derived
// from whichever `device` values are actually present in the real JSON rows
// already being fetched — real API data, just narrower: only devices that
// appear in the selected date's attendance records, not every device ever
// registered.

// ── Date Wise Attendance (read) ──────────────────────────────────────────
export interface AttendanceSummary {
  employees: number
  present: number
  absent: number
  late: number
  leave: number
  displayDate: string
}
export interface AttendanceRow {
  slNo: number
  employee: string
  employeeId: string
  attendanceLabel: string
  isPresent: boolean
  leaveType: string
  clockIn: string
  clockOut: string
  workingHours: string
  device: string
}
interface RawAttendanceRow {
  sl_no: number
  employee: string
  employee_id: string
  attendance: string // pre-rendered HTML, e.g. <span style="color:green">Present</span>
  leave_type: string
  clock_in: string
  clock_out: string
  working_hours: string
  device: string
  action: string // a full HTML modal blob — not rendered here, see component comment
}
interface RawAttendanceResponse {
  data: RawAttendanceRow[]
  summary: { employees: number; present: number; absent: number; late: number; leave: number; display_date: string }
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

// Device filtering happens client-side in DateWiseAttendance.tsx over these
// real rows, not server-side: attendance_rip_ajax.php's own `devicename`
// param matches against `llx_user.device` (the employee's assigned device),
// a different column from the per-row `device` value returned here (which
// resolves through device_setting via each attendance record's device_ip)
// — passing one as the other isn't a confirmed-correct filter, so this
// doesn't guess at it.
export function useDateWiseAttendance(date: string) {
  return useQuery({
    queryKey: ['payroll', 'attendance', 'date-wise', date],
    queryFn: async (): Promise<{ summary: AttendanceSummary; rows: AttendanceRow[] }> => {
      const res = await fetch(`/payroll/attendance_rip_ajax.php?nameIN=${date}`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const data: RawAttendanceResponse = await res.json()
      return {
        summary: {
          employees: data.summary.employees,
          present: data.summary.present,
          absent: data.summary.absent,
          late: data.summary.late,
          leave: data.summary.leave,
          displayDate: data.summary.display_date,
        },
        rows: data.data.map((r) => ({
          slNo: r.sl_no,
          employee: r.employee,
          employeeId: r.employee_id,
          attendanceLabel: stripTags(r.attendance) || '-',
          isPresent: stripTags(r.attendance) === 'Present',
          leaveType: r.leave_type,
          clockIn: r.clock_in,
          clockOut: r.clock_out,
          workingHours: r.working_hours,
          device: r.device,
        })),
      }
    },
    enabled: !!date,
  })
}

// ── Mark Attendance (write) ──────────────────────────────────────────────
// Real, but the underlying PHP loops the request over EVERY active
// employee and only acts on the ones with a `shiftId[id]` entry present —
// designed for a bulk-editable table, not a single-record form. `entries`
// mirrors that real shape directly (one bracket-keyed set of fields per
// employee id in one request), so a page built on this can genuinely
// submit several rows at once, same as the real bulk table — see
// MarkAttendance.tsx for the one deliberate simplification left (Shift is
// a plain numeric ID shared across the submitted rows; no real JSON source
// for shift names/llx_payroll_shifts was found in this module's audit).
export interface MarkAttendanceEntry {
  employeeId: number
  shiftId: number
  status: 'Present' | 'Absent' | 'Permission'
  clockIn?: string // HH:mm
  clockOut?: string // HH:mm
}
export interface MarkAttendanceInput {
  date: string // YYYY-MM-DD
  entries: MarkAttendanceEntry[]
}
interface RawMarkAttendanceResponse {
  status: string
  results: Array<{ employee_id?: string; status: string; message: string }>
}
export function useMarkAttendance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: MarkAttendanceInput) => {
      const body = new URLSearchParams()
      for (const entry of input.entries) {
        const id = String(entry.employeeId)
        body.set(`shiftId[${id}]`, String(entry.shiftId))
        body.set(`realAttendance[${id}]`, entry.status)
        body.set(`realAttenTime[${id}]`, '')
        body.set(`clockInEmp[${id}]`, entry.clockIn ?? '')
        body.set(`clockoutEmp[${id}]`, entry.clockOut ?? '')
        body.set(`permissFrom[${id}]`, '')
        body.set(`permissTo[${id}]`, '')
      }
      body.set('datee', input.date)
      const res = await fetch('/payroll/saveAttendance.php', { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const data: RawMarkAttendanceResponse = await res.json()
      if (data.status !== 'success') throw new Error('Legacy backend rejected the request.')
      return data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payroll', 'attendance', 'date-wise', variables.date] })
    },
  })
}

// ── Mark Special/Holiday Shift Attendance (write) ────────────────────────
// Real via payroll/shiftsmanual_ajax.php?saveAttendance=1 — the write side
// behind both payroll/shiftsmanual_attendance.php?shift=manual (Special
// Shift) and ?shift=holidayshift (Holiday Shift). Genuinely returns JSON
// (confirmed by reading the handler directly), unlike that same page's own
// read side (?enterAttendance=1), which renders an HTML fragment with no
// JSON contract to scrape. `entries` mirrors the real endpoint's own
// index-keyed row list (`empid[0]`, `empid[1]`, ...; `Attendance[id]` keyed
// by employee id, not index) so a page built on this can submit several
// rows in one request, same as the real bulk table. shiftId is a single
// top-level field, same as the real endpoint — fixed per page (3 =
// "Special Shift", 4 = "Holiday shift", the only two rows in
// llx_payroll_shifts with those shift_type values on this deployment,
// confirmed by query, not guessed), not per-row.
export interface MarkManualShiftAttendanceEntry {
  employeeId: number
  present: boolean
  clockIn?: string // HH:mm
  clockOut?: string // HH:mm
}
export interface MarkManualShiftAttendanceInput {
  shiftId: 3 | 4
  date: string // YYYY-MM-DD
  entries: MarkManualShiftAttendanceEntry[]
}
export function useMarkManualShiftAttendance() {
  return useMutation({
    mutationFn: async (input: MarkManualShiftAttendanceInput) => {
      const body = new URLSearchParams()
      input.entries.forEach((entry, i) => {
        const id = String(entry.employeeId)
        body.set(`empid[${i}]`, id)
        body.set(`clockInEmp[${i}]`, entry.clockIn ?? '')
        body.set(`clockoutEmp[${i}]`, entry.clockOut ?? '')
        if (entry.present) body.set(`Attendance[${id}]`, 'Present')
      })
      body.set('shiftId', String(input.shiftId))
      body.set('datee', input.date)
      const res = await fetch('/payroll/shiftsmanual_ajax.php?saveAttendance=1', { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const data: RawMarkAttendanceResponse = await res.json()
      if (data.status !== 'success') throw new Error('Legacy backend rejected the request.')
      return data
    },
  })
}
