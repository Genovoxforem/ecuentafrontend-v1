import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/axios'
import { fetchLegacyDocument, legacyMissingContentError, legacyRefusalMessages, looksLikeLegacyLoginPageText, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'
import { toastMessages } from '../generalLedger/bindLines.queries'
import { preferNewApi } from '../salesOrders/orderApi'
import { parseLeaveCard, type LeaveCard } from './leaveCardParser'
import type { HolidayStats, HolidayRequestRow } from './holiday.types'
import {
  loadHolidayStats,
  loadLeaveRequests,
  loadLeaveCreateForm,
  createLeaveRequestFapi,
  type LeaveCreateForm,
  type LeaveFormOption,
  type LeaveType,
  type LeaveDayPortion,
  type NewLeaveRequestInput,
} from './leaveFapi'

export type { LeaveCreateForm, LeaveFormOption, LeaveType, LeaveDayPortion, NewLeaveRequestInput }

// Reused by the Payroll module (see modules/payroll/PayrollLeaveListModule.tsx
// / PayrollLeaveRequestModule.tsx) rather than duplicated — this same data
// backs both `/users-dashboard/hrm/leave/*` and `/payroll/leave-request` +
// `/payroll/all-leave-request`. Real backend pages: holiday/card.php
// (leftmenu=leave_rqst_obj, "New leave request") and holiday/list.php
// (leftmenu=corehr_object, "Holiday Management").

interface LeaveTypesResponse {
  success: boolean
  types: { id: number; code: string; label: string; newByMonth: number }[]
}

async function fetchLegacyLeaveTypes(): Promise<LeaveType[]> {
  const { data } = await api.get<LeaveTypesResponse>('/user/leave-types.php')
  return (data.types ?? []).map((t) => ({
    id: t.id,
    code: t.code,
    label: t.label,
    balanceDays: Math.round(t.newByMonth * 12),
  }))
}

async function fetchLeaveTypesFapi(): Promise<LeaveType[]> {
  const form = await loadLeaveCreateForm()
  if (form.leaveTypes.length > 0) return form.leaveTypes
  return fetchLegacyLeaveTypes()
}

// Fetches leave/holiday types from holiday/fapi/leave.php?action=form (#393), falling back to /api/user/leave-types.php.
// Replaces the hardcoded LEAVE_TYPES array — the dictionary varies per install, so it must come from the backend.
export function useLeaveTypes() {
  return useQuery({
    queryKey: ['users', 'leave-types'],
    queryFn: () => preferNewApi('leaveTypes', fetchLeaveTypesFapi, fetchLegacyLeaveTypes),
    staleTime: 1000 * 60 * 10,
  })
}

// ── Holiday Management: the stat cards and the requests come from payroll/fapi/leave_list.php (leaveFapi.ts). The request, its card and
// the create form are still the holiday/ pages (holiday/card.php): leave_detail.php is documented from code only, with no leave request on the
// instance to compare its fields with the card, and its writers (create, approve, refuse, cancel) only answer a plan.

export function useHolidayStats() {
  return useQuery({
    queryKey: ['users', 'holiday', 'stats'],
    queryFn: (): Promise<HolidayStats> => loadHolidayStats(),
  })
}

// '' = no status filter (the real page's own default, unfiltered view).
export type HolidaySearchStatus = '' | '1' | '2' | '3' | '4' | '5'

export interface HolidayListInput {
  from: string // yyyy-mm-dd
  to: string // yyyy-mm-dd
  status: HolidaySearchStatus
}

export function useHolidayRequests(input: HolidayListInput) {
  return useQuery({
    queryKey: ['users', 'holiday', 'list', input],
    queryFn: (): Promise<HolidayRequestRow[]> => loadLeaveRequests(input),
  })
}

// ── New leave request: holiday/fapi/leave.php (#393) with legacy scrape fallback ─

// The legacy page's markup is malformed enough that, once parsed, the form's controls
// are not descendants of <form name="demandeCP"> — so everything is looked up on
// the document (each name is unique on this page), never scoped to the form.
function readOptions(doc: Document, name: string): LeaveFormOption[] {
  const select = doc.querySelector<HTMLSelectElement>(`select[name="${name}"]`)
  return Array.from(select?.options ?? [])
    .filter((o) => o.value.trim() !== '' && o.value !== '-1')
    .map((o) => ({ value: o.value, label: (o.textContent ?? '').replace(/\s+/g, ' ').trim() }))
}

async function fetchLeaveCreateFormLegacy(): Promise<LeaveCreateForm> {
  const doc = await fetchLegacyDocument('/holiday/card.php', new URLSearchParams({ action: 'create' }))
  if (!doc.querySelector('select[name="fuserid"]')) throw legacyMissingContentError(doc, 'The leave request form on this backend page was not recognised.')
  const employees = readOptions(doc, 'fuserid')
  const types = readOptions(doc, 'type')
  const approvers = readOptions(doc, 'valideur')
  return {
    employees,
    types,
    approvers,
    canCreate: true,
    leaveTypes: [],
    defaultEmployeeId: employees[0]?.value,
  }
}

// The leave create form: who a request can be made for, the leave
// types (with the ids the backend expects), approvers, per-type balances, and permissions.
// Served by holiday/fapi/leave.php?action=form (#393) or the legacy holiday/card.php scrape.
export function useLeaveCreateForm() {
  return useQuery({
    queryKey: ['users', 'holiday', 'createForm'],
    queryFn: () => preferNewApi('leaveCreateForm', loadLeaveCreateForm, fetchLeaveCreateFormLegacy),
    staleTime: 1000 * 60 * 5,
  })
}

async function createLeaveRequestLegacy(input: NewLeaveRequestInput): Promise<string> {
  const createDoc = await fetchLegacyDocument('/holiday/card.php', new URLSearchParams({ action: 'create' }))
  const token = createDoc.querySelector<HTMLInputElement>('input[name="token"]')?.value
  if (!token) throw legacyMissingContentError(createDoc, 'Could not find a CSRF token on the leave request page.')

  const body = new URLSearchParams({
    token,
    action: 'add',
    fuserid: input.employeeId,
    type: input.typeId,
    leave_mode: input.mode,
    date_debut_: input.startDate,
    start_session_type: input.startSession,
    date_fin_: input.mode === 'multi' ? input.endDate : '',
    end_session_type: input.endSession,
    valideur: input.approverId,
    description: input.description,
  })
  const res = await fetch('/holiday/card.php', { method: 'POST', credentials: 'same-origin', body })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  const html = await res.text()
  if (looksLikeLegacyLoginPageText(html)) throw new Error(NOT_SIGNED_IN_MESSAGE)

  const landed = new URL(res.url)
  const createdId = landed.searchParams.get('id')
  if (createdId && /^\d+$/.test(createdId)) return createdId
  const refusal = toastMessages(html).find((t) => t.type === 'error')?.message ?? legacyRefusalMessages(html)[0]
  if (refusal) throw new Error(refusal)
  // No reason given: a redirect away from the form (to the list, say) still
  // means it was created; being handed the form back means it was not.
  if (!landed.pathname.endsWith('/holiday/card.php')) return ''
  throw new Error('The backend did not create the leave request.')
}

// Submits a new leave request via holiday/fapi/leave.php?action=create (#393), which validates
// via the Holiday ORM (create + validate, hierarchy-gated, overlap-guarded), falling back to
// the classic holiday/card.php POST if the endpoint is not deployed.
export function useCreateLeaveRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: NewLeaveRequestInput) =>
      preferNewApi('leaveCreate', () => createLeaveRequestFapi(input), () => createLeaveRequestLegacy(input)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'holiday'] })
    },
  })
}

// Real holiday/card.php?id=N — see leaveCardParser.ts. A missing/forbidden id
// renders the page without the card, which comes back as an error.
export function useLeaveCard(id: string | undefined) {
  return useQuery({
    queryKey: ['users', 'holiday', 'card', id],
    queryFn: async (): Promise<LeaveCard> => {
      const doc = await fetchLegacyDocument('/holiday/card.php', new URLSearchParams({ id: id! }))
      const card = parseLeaveCard(doc)
      if (!card) throw legacyMissingContentError(doc, 'Leave request not found.')
      return card
    },
    enabled: !!id && /^\d+$/.test(id),
  })
}
