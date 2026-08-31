import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// The only 2 real JSON endpoints anywhere in the Payroll module (confirmed
// this session by a full audit of both payroll/ and the never-activated
// payroll_v2/ against the live database — see the module's other 52 pages,
// all NotBuiltPage placeholders, for the rest of that finding).

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
// designed for a bulk-editable table, not a single-record form. This hook
// exposes the honest single-employee shape (one entry in each keyed array)
// since that's what a simplified real form can responsibly send; a full
// bulk-table rebuild matching the original page's richer UI is future work.
export interface MarkAttendanceInput {
  employeeId: number
  date: string // YYYY-MM-DD
  shiftId: number
  status: 'Present' | 'Absent' | 'Permission'
  clockIn?: string // HH:mm
  clockOut?: string // HH:mm
}
interface RawMarkAttendanceResponse {
  status: string
  results: Array<{ employee_id?: string; status: string; message: string }>
}
export function useMarkAttendance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: MarkAttendanceInput) => {
      const id = String(input.employeeId)
      const body = new URLSearchParams()
      body.set(`shiftId[${id}]`, String(input.shiftId))
      body.set(`realAttendance[${id}]`, input.status)
      body.set(`realAttenTime[${id}]`, '')
      body.set(`clockInEmp[${id}]`, input.clockIn ?? '')
      body.set(`clockoutEmp[${id}]`, input.clockOut ?? '')
      body.set(`permissFrom[${id}]`, '')
      body.set(`permissTo[${id}]`, '')
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
