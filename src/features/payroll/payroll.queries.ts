import { useQuery } from '@tanstack/react-query'
import { useAttendanceStatus } from '../attendance/attendance.queries'
import { useHolidayRequests } from '../users/leave.queries'
import { useEmployeeCount } from '../users/users.queries'
import { hrmGet } from './hrm.api'

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

// payroll/fapi/dashboard.php: the KPI figures of the HRM module in one call. Only the figures it names the same way the cards
// do are used: active employees, today's present count and the number of defined shifts. Its payroll_month block
// (net_salary_total, paid_amount_total) is not mapped onto the YTD / Salary Paid cards: how the classic page defines those two
// is not known and every payroll figure is 0 on newecuenta, so the cards keep their zeros.
interface PayrollDashboard {
  employees: { total_active: number }
  attendance_today: { present: number }
  shifts: { defined: number }
}

function usePayrollDashboard() {
  return useQuery({ queryKey: ['payroll', 'dashboard'], queryFn: () => hrmGet<PayrollDashboard>('dashboard'), staleTime: 1000 * 60 })
}

export function usePayrollSummary() {
  const { data: dashboard } = usePayrollDashboard()
  const now = new Date()
  const monthStart = isoDate(new Date(now.getFullYear(), now.getMonth(), 1))
  const monthEnd = isoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0))
  const { data: leaveThisMonth } = useHolidayRequests({ from: monthStart, to: monthEnd, status: '' })
  const employeeCount = useEmployeeCount()
  const { data: attendance } = useAttendanceStatus()

  const summary: PayrollSummary = {
    // +1 for the real logged-in admin, who isn't tracked as a local UserRow.
    totalEmployees: dashboard ? dashboard.employees.total_active : 1 + employeeCount,
    todaysAttendance: dashboard ? dashboard.attendance_today.present : attendance?.isClockedIn ? 1 : 0,
    shifts: dashboard ? dashboard.shifts.defined : 0,
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
