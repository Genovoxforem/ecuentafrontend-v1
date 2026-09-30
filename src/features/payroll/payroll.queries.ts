import { useAttendanceStatus } from '../attendance/attendance.queries'
import { useHolidayRequests } from '../users/leave.queries'
import { useEmployeeCount } from '../users/users.queries'

export interface PayrollSummary {
  totalEmployees: number
  todaysAttendance: number
  shifts: number
  shiftTemplates: number
  leaveRequestsThisMonth: number
  ytdAmountThisMonth: number
  ytdAmountThisMonthLabel: string
  ytdAmountLastMonth: number
  ytdAmountLastMonthLabel: string
  salaryPaidThisMonth: number
  salaryPaidLastMonth: number
  salaryPaidLastMonthLabel: string
}

function monthLabel(monthsAgo: number) {
  const d = new Date()
  d.setMonth(d.getMonth() - monthsAgo)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

// Leave requests this month are real (holiday/ajax_holiday_list.php, the same
// list the Leave pages show). Employee count and today's attendance are real too
// (the Users list and the live GET /api/attendance/ status). Everything
// money-related (YTD amounts, salary paid) and shifts stay an honest zero rather
// than invented payroll figures, same reasoning as Ledger/Banking: a convincing
// fake dollar amount here is actively misleading.
function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function usePayrollSummary() {
  const now = new Date()
  const monthStart = isoDate(new Date(now.getFullYear(), now.getMonth(), 1))
  const monthEnd = isoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0))
  const { data: leaveThisMonth } = useHolidayRequests({ from: monthStart, to: monthEnd, status: '' })
  const employeeCount = useEmployeeCount()
  const { data: attendance } = useAttendanceStatus()

  const summary: PayrollSummary = {
    // +1 for the real logged-in admin, who isn't tracked as a local UserRow.
    totalEmployees: 1 + employeeCount,
    todaysAttendance: attendance?.isClockedIn ? 1 : 0,
    shifts: 0,
    shiftTemplates: 0,
    leaveRequestsThisMonth: leaveThisMonth?.length ?? 0,
    ytdAmountThisMonth: 0,
    ytdAmountThisMonthLabel: monthLabel(0),
    ytdAmountLastMonth: 0,
    ytdAmountLastMonthLabel: monthLabel(1),
    salaryPaidThisMonth: 0,
    salaryPaidLastMonth: 0,
    salaryPaidLastMonthLabel: monthLabel(1),
  }
  return { data: summary, isError: false, isLoading: false }
}
