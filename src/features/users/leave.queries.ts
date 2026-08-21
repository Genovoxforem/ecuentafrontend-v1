import { useLocalCollection, nextLocalRef, todayIso } from '../../shared/localCollection'
import { useLogActivity } from '../agenda/agenda.queries'
import { useAuth } from '../auth/AuthContext'
import { formatDate } from '../../utils/format'

// No backend endpoint exists for holiday/leave (llx_holiday) on this app's
// server — same gap as agenda/activity (see agenda.queries.ts). This mirrors
// that file's pattern exactly: a local, session-only collection that starts
// empty (matching the real reference app's own empty demo state) and grows
// as real leave requests get created in this browser session.
export interface LeaveType {
  code: string
  label: string
  balanceDays: number
}

// Dolibarr's stock "Congés payés"/"RTT"/etc dictionary (llx_c_holiday_types)
// varies per install, so these are the common defaults most installs ship
// with rather than a fetched list — no options endpoint exists for this on
// the backend, so they're hardcoded same as WEIGHT_UNITS etc. elsewhere.
export const LEAVE_TYPES: LeaveType[] = [
  { code: 'CP', label: 'Paid Leave', balanceDays: 21 },
  { code: 'RTT', label: 'RTT', balanceDays: 6 },
  { code: 'SICK', label: 'Sick Leave', balanceDays: 10 },
  { code: 'UNPAID', label: 'Unpaid Leave', balanceDays: 0 },
  { code: 'OTHER', label: 'Other', balanceDays: 0 },
]

export type LeaveStatus = 'Draft' | 'Validated' | 'Approved' | 'Cancelled'

export interface LeaveRequest {
  ref: string
  employeeId: number
  employeeName: string
  validatorName: string
  typeCode: string
  typeLabel: string
  startDate: string
  endDate: string
  days: number
  description: string
  createDate: string
  updateDate: string
  status: LeaveStatus
}

const KEY = ['local', 'leave-requests'] as const
const SEED: LeaveRequest[] = []

export function useLeaveRequests() {
  const [requests] = useLocalCollection(KEY, SEED)
  return requests
}

export interface LeaveSummary {
  employeesWithRecords: number
  totalRequests: number
  thisMonth: number
  approved: number
  cancelled: number
  requests: LeaveRequest[]
}

export function useLeaveSummary(): LeaveSummary {
  const requests = useLeaveRequests()
  const now = new Date()
  return {
    employeesWithRecords: new Set(requests.map((r) => r.employeeId)).size,
    totalRequests: requests.length,
    thisMonth: requests.filter((r) => {
      const d = new Date(r.createDate)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).length,
    approved: requests.filter((r) => r.status === 'Approved').length,
    cancelled: requests.filter((r) => r.status === 'Cancelled').length,
    requests,
  }
}

export interface NewLeaveRequestInput {
  employeeId: number
  employeeName: string
  validatorName: string
  typeCode: string
  startDate: string
  endDate: string
  description: string
}

function daysBetween(startIso: string, endIso: string) {
  const start = new Date(startIso)
  const end = new Date(endIso)
  const diff = Math.round((end.getTime() - start.getTime()) / 86400000)
  return Math.max(1, diff + 1)
}

export function useCreateLeaveRequest() {
  const [, update] = useLocalCollection(KEY, SEED)
  const logActivity = useLogActivity()
  const { user } = useAuth()
  return (input: NewLeaveRequestInput) => {
    const type = LEAVE_TYPES.find((t) => t.code === input.typeCode)
    const today = todayIso()
    const row: LeaveRequest = {
      ref: nextLocalRef('LEAVE'),
      employeeId: input.employeeId,
      employeeName: input.employeeName,
      validatorName: input.validatorName,
      typeCode: input.typeCode,
      typeLabel: type?.label ?? input.typeCode,
      startDate: input.startDate,
      endDate: input.endDate,
      days: daysBetween(input.startDate, input.endDate),
      description: input.description,
      createDate: today,
      updateDate: today,
      status: 'Validated',
    }
    update((current) => [row, ...current])
    const authorName = user ? `${user.firstname} ${user.lastname}`.trim() || user.login : 'Unknown'
    logActivity({ label: `Leave request ${row.ref} for ${row.employeeName} (${row.typeLabel}, ${formatDate(row.startDate)} – ${formatDate(row.endDate)})`, category: 'leave', authorName })
    return row
  }
}
