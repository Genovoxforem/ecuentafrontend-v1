import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/axios'
import { fetchLegacyDocument, fetchLegacyText, legacyMissingContentError, legacyRefusalMessages, looksLikeLegacyLoginPageText, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'
import { toastMessages } from '../generalLedger/bindLines.queries'
import { parseLeaveCard, type LeaveCard } from './leaveCardParser'
import { parseHolidayStats, parseHolidayRows, type HolidayStats, type HolidayRequestRow, type HolidayAjaxResponse } from './holidayParser'

// Reused by the Payroll module (see modules/payroll/PayrollLeaveListModule.tsx
// / PayrollLeaveRequestModule.tsx) rather than duplicated — this same data
// backs both `/users-dashboard/hrm/leave/*` and `/payroll/leave-request` +
// `/payroll/all-leave-request`. Real backend pages: holiday/card.php
// (leftmenu=leave_rqst_obj, "New leave request") and holiday/list.php
// (leftmenu=corehr_object, "Holiday Management").

export interface LeaveType {
  id: number
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
        id: t.id,
        code: t.code,
        label: t.label,
        balanceDays: Math.round(t.newByMonth * 12),
      }))
    },
    staleTime: 1000 * 60 * 10,
  })
}

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

// ── New leave request (holiday/card.php?action=create) — real ───────────

export interface LeaveFormOption {
  value: string
  label: string
}

export interface LeaveCreateForm {
  employees: LeaveFormOption[]
  types: LeaveFormOption[]
  approvers: LeaveFormOption[]
}

// The legacy page's markup is malformed enough that, once parsed, the form's controls
// are not descendants of <form name="demandeCP"> — so everything is looked up on
// the document (each name is unique on this page), never scoped to the form.
function readOptions(doc: Document, name: string): LeaveFormOption[] {
  const select = doc.querySelector<HTMLSelectElement>(`select[name="${name}"]`)
  return Array.from(select?.options ?? [])
    .filter((o) => o.value.trim() !== '' && o.value !== '-1')
    .map((o) => ({ value: o.value, label: (o.textContent ?? '').replace(/\s+/g, ' ').trim() }))
}

// The real form's own dropdowns: who a request can be made for, the leave
// types (with the ids the backend expects) and who can approve — the approver
// list is only the users with approval rights, not every user.
export function useLeaveCreateForm() {
  return useQuery({
    queryKey: ['users', 'holiday', 'createForm'],
    queryFn: async (): Promise<LeaveCreateForm> => {
      const doc = await fetchLegacyDocument('/holiday/card.php', new URLSearchParams({ action: 'create' }))
      if (!doc.querySelector('select[name="fuserid"]')) throw legacyMissingContentError(doc, 'The leave request form on this backend page was not recognised.')
      return { employees: readOptions(doc, 'fuserid'), types: readOptions(doc, 'type'), approvers: readOptions(doc, 'valideur') }
    },
    staleTime: 1000 * 60 * 5,
  })
}

export type LeaveDayPortion = 'fullday' | 'morning' | 'afternoon'

export interface NewLeaveRequestInput {
  employeeId: string
  typeId: string
  mode: 'single' | 'multi'
  startDate: string // yyyy-mm-dd
  startSession: LeaveDayPortion
  endDate: string // yyyy-mm-dd, multi-day only
  endSession: LeaveDayPortion
  approverId: string
  description: string
}

// The same POST the real form's own submit sends (token, action=add, fuserid,
// type, leave_mode, date_debut_/date_fin_ in yyyy-mm-dd, the two session
// types, valideur, description). The token is scraped fresh off the create
// page right before. A created request redirects to card.php?id=<new id>; a
// refusal (duplicate dates, no balance, …) re-shows the form with the reason
// in an inline toast, still HTTP 200 — so success is judged by the redirect.
export function useCreateLeaveRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: NewLeaveRequestInput): Promise<string> => {
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
    },
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
