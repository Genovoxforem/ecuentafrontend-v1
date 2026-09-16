import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { looksLikeLegacyLoginPageText, NOT_SIGNED_IN_MESSAGE, fetchLegacyDocument } from '../../shared/legacyHtmlFetch'
import { parseManualShiftAttendanceRows, type ManualShiftEmployeeRow } from './manualShiftAttendanceParser'
import { parseMarkAttendanceRows, parseAssignShiftOptions, type MarkAttendanceRow, type AbsenceReasonOption, type ShiftOption } from './markAttendanceParser'

// A handful of real JSON endpoints across payroll/ and payroll/*_ajax.php
// (confirmed this session by reading each real page's own JS directly, not
// guessed) — the module's other ~50 pages remain NotBuiltPage placeholders.
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
  loginHistoryHtml: string
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
  action: string // a full HTML modal blob — parsed by parseLoginHistory below, not injected raw
}
interface RawAttendanceResponse {
  data: RawAttendanceRow[]
  summary: { employees: number; present: number; absent: number; late: number; leave: number; display_date: string }
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

// The real endpoint embeds each row's own "History" modal as a full HTML
// blob right in `action` (a real Bootstrap modal + table, not a separate
// AJAX call — confirmed live: every row's action field already carries it,
// so DateWiseAttendance.tsx's History button needs no extra network round
// trip). Parsed into safe, structured data here rather than rendered via
// dangerouslySetInnerHTML — this app's established convention for scraped
// legacy markup. Real columns: Clock In / Clock Out / Clock In Note /
// Clock Out Note / Working Hour / Devices, plus a "Total Working Hour"
// summary row that's always present (its own row even when there are no
// real visits, confirmed live against every one of 36 employees' rows).
export interface LoginHistoryVisit {
  clockIn: string
  clockOut: string
  clockInNote: string
  clockOutNote: string
  workingHour: string
  devices: string
}
export interface LoginHistory {
  employeeName: string
  visits: LoginHistoryVisit[]
  totalWorkingHour: string
}
export function parseLoginHistory(actionHtml: string): LoginHistory {
  const doc = new DOMParser().parseFromString(actionHtml, 'text/html')
  const employeeName = (doc.querySelector('.modal-title')?.textContent ?? '').replace(/'s Login History\s*$/, '').trim()
  const visits: LoginHistoryVisit[] = []
  let totalWorkingHour = '00:00:00'
  doc.querySelectorAll('.modal-body tbody tr').forEach((tr) => {
    const totalCell = tr.querySelector('th[colspan]')
    if (totalCell) {
      const cells = tr.querySelectorAll('th')
      totalWorkingHour = (cells[cells.length - 1]?.textContent ?? '').trim() || totalWorkingHour
      return
    }
    const tds = Array.from(tr.querySelectorAll('td'))
    if (tds.length < 6) return
    visits.push({
      clockIn: (tds[0].textContent ?? '').trim(),
      clockOut: (tds[1].textContent ?? '').trim(),
      clockInNote: (tds[2].textContent ?? '').trim(),
      clockOutNote: (tds[3].textContent ?? '').trim(),
      workingHour: (tds[4].textContent ?? '').trim(),
      devices: (tds[5].textContent ?? '').trim(),
    })
  })
  return { employeeName, visits, totalWorkingHour }
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
          loginHistoryHtml: r.action,
        })),
      }
    },
    enabled: !!date,
  })
}

// ── Mark Attendance (read) ───────────────────────────────────────────────
// Real via payroll/mark_attendance_ajax.php?enterAttendance=1 — see
// markAttendanceParser.ts's own top comment for the full real shape: every
// employee row is either "no shift mapped for this date" (not editable —
// see useAssignShift below for the real fix) or a genuine editable
// Present/Absent/Permission row, all unchecked by default (confirmed live —
// this page has no "everyone starts Present" default the way the Special/
// Holiday Shift form does).
export function useMarkAttendanceRows(date: string, entityType: string, enabled: boolean) {
  return useQuery({
    queryKey: ['payroll', 'attendance', 'mark', entityType, date],
    queryFn: async (): Promise<{ rows: MarkAttendanceRow[]; reasonOptions: AbsenceReasonOption[] }> => {
      const params = new URLSearchParams({ enterAttendance: '1', ListofEmployee: 'All', TypesOfEntity: entityType, att_date: date })
      const res = await fetch(`/payroll/mark_attendance_ajax.php?${params.toString()}`, { method: 'POST', credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const html = await res.text()
      if (looksLikeLegacyLoginPageText(html)) throw new Error(NOT_SIGNED_IN_MESSAGE)
      return parseMarkAttendanceRows(html)
    },
    enabled,
  })
}

// ── Assign Shift (read form + write) ─────────────────────────────────────
// Real "Assign Shift" side panel on payroll/mark_attendance.php itself —
// the real fix for a "not mapped in shift" row (see markAttendanceParser.ts):
// pick one of the real llx_payroll_shifts rows + a date range, and that
// employee gets a real shift assignment covering it. Confirmed live:
// POST payroll/ajax_search.php with shiftEmployeeId/shifts/stdate/endate/
// assignshift=1, JSON {status,message} back — no CSRF token on this one
// (confirmed: #shift_form has no hidden token input, unlike this app's
// other mutating legacy forms).
export function useAssignShiftOptions() {
  return useQuery({
    queryKey: ['payroll', 'attendance', 'assign-shift-options'],
    queryFn: async (): Promise<ShiftOption[]> => {
      const doc = await fetchLegacyDocument('/payroll/mark_attendance.php')
      return parseAssignShiftOptions(doc)
    },
    staleTime: 1000 * 60 * 10,
  })
}
export interface AssignShiftInput {
  employeeId: number
  shiftId: string
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
}
interface RawAssignShiftResponse {
  status: string
  message?: string
}
export function useAssignShift() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: AssignShiftInput) => {
      const body = new URLSearchParams({
        shiftEmployeeId: String(input.employeeId),
        shifts: input.shiftId,
        stdate: input.startDate,
        endate: input.endDate,
        assignshift: '1',
      })
      const res = await fetch('/payroll/ajax_search.php', { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const text = await res.text()
      if (looksLikeLegacyLoginPageText(text)) throw new Error(NOT_SIGNED_IN_MESSAGE)
      const data: RawAssignShiftResponse = JSON.parse(text)
      if (data.status !== 'success') throw new Error(data.message || 'Legacy backend rejected the request.')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll', 'attendance', 'mark'] })
    },
  })
}

// ── Mark Attendance (write) ──────────────────────────────────────────────
// Real, but the underlying PHP loops the request over EVERY active
// employee and only acts on the ones with a `shiftId[id]` entry present —
// designed for a bulk-editable table, not a single-record form. `entries`
// mirrors that real shape directly (one bracket-keyed set of fields per
// employee id in one request, plus the passthrough fields the real page's
// own JS round-trips verbatim from the read side — attendanceId/
// holidayTblId/requestedLeave — see markAttendanceParser.ts), so a page
// built on this can genuinely submit several rows at once, same as the
// real bulk table. shiftId is now each row's own real assigned shift id
// (from the read side), not a shared manual guess.
export interface MarkAttendanceEntry {
  employeeId: number
  shiftId: string
  status: 'Present' | 'Absent' | 'Permission'
  clockIn?: string // HH:mm, Present only
  clockOut?: string // HH:mm, Present only
  absenceReasonId?: string // Absent only — see AbsenceReasonOption
  halfDay?: 'Full Day' | 'Fore Noon' | 'After Noon' // Absent only
  permissionFrom?: string // HH:mm, Permission only
  permissionTo?: string // HH:mm, Permission only
  attendanceId?: string
  holidayTblId?: string
  requestedLeave?: string
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
        body.append('empid[]', id)
        body.set(`attendanceId[${id}]`, entry.attendanceId ?? '')
        body.set(`shiftId[${id}]`, entry.shiftId)
        body.set(`holiday_tbl_id[${id}]`, entry.holidayTblId ?? '')
        body.set(`realAttendance[${id}]`, entry.status)
        body.set(`requestedleave[${id}]`, entry.requestedLeave ?? '')
        body.set(`abs_type[${id}]`, entry.absenceReasonId ?? '')
        body.set(`realAttenTime[${id}]`, entry.halfDay ?? '')
        body.set(`clockInEmp[${id}]`, entry.clockIn ?? '')
        body.set(`clockoutEmp[${id}]`, entry.clockOut ?? '')
        body.set(`overtimeHours[${id}]`, '')
        body.set(`permissFrom[${id}]`, entry.permissionFrom ?? '')
        body.set(`permissTo[${id}]`, entry.permissionTo ?? '')
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
      queryClient.invalidateQueries({ queryKey: ['payroll', 'attendance', 'mark'] })
    },
  })
}

// ── Special/Holiday Shift Attendance (read) ──────────────────────────────
// Real via payroll/shiftsmanual_ajax.php?enterAttendance=1 — see
// manualShiftAttendanceParser.ts's own top comment for the exact request
// shape and why this employee list (with real designation + the real
// default present/clockIn/clockOut state) is a better source than the
// generic useUsersSummary() list this page used before: it's the same real
// data the legacy page's own "Search" button loads, scoped by shift.
export function useManualShiftAttendanceRows(shiftId: 3 | 4, date: string, enabled: boolean) {
  return useQuery({
    queryKey: ['payroll', 'attendance', 'manual-shift', shiftId, date],
    queryFn: async (): Promise<ManualShiftEmployeeRow[]> => {
      const params = new URLSearchParams({ enterAttendance: '1', ListofEmployee: 'All', TypesOfEntity: '1', att_date: date, shiftId: String(shiftId) })
      const res = await fetch(`/payroll/shiftsmanual_ajax.php?${params.toString()}`, { method: 'POST', credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const html = await res.text()
      if (looksLikeLegacyLoginPageText(html)) throw new Error(NOT_SIGNED_IN_MESSAGE)
      return parseManualShiftAttendanceRows(html)
    },
    enabled,
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
