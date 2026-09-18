import { useQuery } from '@tanstack/react-query'
import { useLocalCollection, nextLocalRef, todayIso } from '../../shared/localCollection'
import { api } from '../../api/axios'
import { useLogActivity } from '../agenda/agenda.queries'
import { useAuth } from '../auth/AuthContext'
import { formatDate } from '../../utils/format'
import { fetchLegacyDocument, fetchLegacyText } from '../../shared/legacyHtmlFetch'
import { parseHolidayStats, parseHolidayRows, type HolidayStats, type HolidayRequestRow, type HolidayAjaxResponse } from './holidayParser'

// Reused by the Payroll module (see modules/payroll/PayrollLeaveListModule.tsx
// / PayrollLeaveRequestModule.tsx) rather than duplicated — this same data
// backs both `/users-dashboard/hrm/leave/*` and `/payroll/leave-request` +
// `/payroll/all-leave-request`. Confirmed real backend pages for the payroll
// entry point: holiday/card.php (leftmenu=leave_rqst_obj, "New leave
// request") and holiday/list.php (leftmenu=corehr_object, "Holiday
// Management"). Leave *types* are real (below); leave *requests* stay
// local-only like the rest of this module's session-tracked lists — see
// useCreateLeaveRequest.

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

// ── Holiday Management (holiday/list.php) — real data ───────────────────
// Real: the 5 stat cards render server-side into list.php's own initial
// HTML (not through the AJAX endpoint below), and the request table itself
// is genuine server-side DataTables JSON from holiday/ajax_holiday_list.php
// — both confirmed live (recordsTotal matched the "Leave Records" stat
// card exactly, and search_status/datefilter both changed the returned
// row set). See holidayParser.ts's own top comment for the exact shapes.

export function useHolidayStats() {
  return useQuery({
    queryKey: ['users', 'holiday', 'stats'],
    queryFn: async (): Promise<HolidayStats> => {
      const doc = await fetchLegacyDocument('/holiday/list.php')
      return parseHolidayStats(doc)
    },
  })
}

// '' = no status filter (the real page's own default, unfiltered view).
export type HolidaySearchStatus = '' | '1' | '2' | '3' | '4' | '5'

export interface HolidayListInput {
  from: string // yyyy-mm-dd
  to: string // yyyy-mm-dd
  status: HolidaySearchStatus
}

// yyyy-mm-dd -> MM/DD/YYYY, the real page's own daterangepicker format for
// its combined `datefilter` field (confirmed live: "01/01/2026 - 12/31/2026").
function toLegacyDateSlash(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${m}/${d}/${y}`
}

export function useHolidayRequests(input: HolidayListInput) {
  return useQuery({
    queryKey: ['users', 'holiday', 'list', input],
    queryFn: async (): Promise<HolidayRequestRow[]> => {
      const body = new URLSearchParams({
        draw: '1',
        start: '0',
        length: '-1',
        datefilter: `${toLegacyDateSlash(input.from)} - ${toLegacyDateSlash(input.to)}`,
      })
      if (input.status) body.set('search_status', input.status)
      const text = await fetchLegacyText('/holiday/ajax_holiday_list.php', { method: 'POST', body })
      const json = JSON.parse(text) as HolidayAjaxResponse
      return parseHolidayRows(json)
    },
  })
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
