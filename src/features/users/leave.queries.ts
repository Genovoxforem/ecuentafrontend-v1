import { useQuery } from '@tanstack/react-query'
import { useLocalCollection, nextLocalRef, todayIso } from '../../shared/localCollection'
import { api } from '../../api/axios'
import { useLogActivity } from '../agenda/agenda.queries'
import { useAuth } from '../auth/AuthContext'
import { formatDate } from '../../utils/format'

export interface LeaveType {
  code: string
  label: string
  balanceDays: number
}

interface LeaveTypesResponse {
  success: boolean
  types: { id: number; code: string; label: string; newByMonth: number }[]
}

// Fetches leave/holiday types from /api/user/leave-types.php (llx_c_holiday_types).
// Replaces the hardcoded LEAVE_TYPES array — the dictionary varies per install,
// so it must come from the backend.
export function useLeaveTypes() {
  return useQuery({
    queryKey: ['users', 'leave-types'],
    queryFn: async (): Promise<LeaveType[]> => {
      const { data } = await api.get<LeaveTypesResponse>('/user/leave-types.php')
      return (data.types ?? []).map((t) => ({
        code: t.code,
        label: t.label,
        balanceDays: Math.round(t.newByMonth * 12),
      }))
    },
    staleTime: 1000 * 60 * 10,
  })
}

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
  const { data: leaveTypes } = useLeaveTypes()
  return (input: NewLeaveRequestInput) => {
    const type = leaveTypes?.find((t) => t.code === input.typeCode)
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
