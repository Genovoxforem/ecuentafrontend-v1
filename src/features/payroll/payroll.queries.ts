import { useLocalCollection, nextLocalRef, todayIso } from '../../shared/localCollection'
import { useLogActivity } from '../agenda/agenda.queries'
import { useAuth } from '../auth/AuthContext'
import { useAttendanceStatus } from '../attendance/attendance.queries'
import { useEmployeeCount } from '../users/users.queries'

export interface LeaveRequest {
  ref: string
  employeeName: string
  fromDate: string
  toDate: string
  reason: string
  status: 'Pending' | 'Approved' | 'Rejected'
  requestedAt: string
}

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
  leaveRequests: LeaveRequest[]
}

function monthLabel(monthsAgo: number) {
  const d = new Date()
  d.setMonth(d.getMonth() - monthsAgo)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

const KEY = ['local', 'leaveRequests'] as const
const SEED: LeaveRequest[] = []

// No backend endpoint exists for the payroll module on this app's server.
// Employee count and today's attendance are real (drawn from the local
// Users list and the live GET /api/attendance/ status respectively) —
// everything money-related (YTD amounts, salary paid) stays an honest zero
// rather than invented payroll figures, same reasoning as Ledger/Banking:
// a convincing fake dollar amount here is actively misleading in a way a
// fake room booking or stock count isn't. Leave requests are held in
// react-query's cache only — see shared/localCollection.ts.
export function usePayrollSummary() {
  const [leaveRequests] = useLocalCollection(KEY, SEED)
  const employeeCount = useEmployeeCount()
  const { data: attendance } = useAttendanceStatus()
  const now = new Date()
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const summary: PayrollSummary = {
    // +1 for the real logged-in admin, who isn't tracked as a local UserRow.
    totalEmployees: 1 + employeeCount,
    todaysAttendance: attendance?.isClockedIn ? 1 : 0,
    shifts: 0,
    shiftTemplates: 0,
    leaveRequestsThisMonth: leaveRequests.filter((r) => r.requestedAt.slice(0, 7) === thisMonthKey).length,
    ytdAmountThisMonth: 0,
    ytdAmountThisMonthLabel: monthLabel(0),
    ytdAmountLastMonth: 0,
    ytdAmountLastMonthLabel: monthLabel(1),
    salaryPaidThisMonth: 0,
    salaryPaidLastMonth: 0,
    salaryPaidLastMonthLabel: monthLabel(1),
    leaveRequests: leaveRequests.slice(0, 10),
  }
  return { data: summary, isError: false, isLoading: false }
}

export interface NewLeaveRequestInput {
  employeeName: string
  fromDate: string
  toDate: string
  reason: string
}

export function useCreateLeaveRequest() {
  const [, update] = useLocalCollection(KEY, SEED)
  const logActivity = useLogActivity()
  const { user } = useAuth()
  return (input: NewLeaveRequestInput) => {
    const request: LeaveRequest = {
      ref: nextLocalRef('LR'),
      employeeName: input.employeeName,
      fromDate: input.fromDate,
      toDate: input.toDate,
      reason: input.reason,
      status: 'Pending',
      requestedAt: todayIso(),
    }
    update((current) => [request, ...current])
    const authorName = user ? `${user.firstname} ${user.lastname}`.trim() || user.login : 'Unknown'
    logActivity({ label: `New leave request from ${input.employeeName}`, category: 'other', authorName })
  }
}

export function useSetLeaveRequestStatus() {
  const [, update] = useLocalCollection(KEY, SEED)
  return (ref: string, status: LeaveRequest['status']) => {
    update((current) => current.map((r) => (r.ref === ref ? { ...r, status } : r)))
  }
}
