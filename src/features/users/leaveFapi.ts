import { fapiGet, fapiPost } from '../../api/fapiEnvelope'
import type { HolidayRequestRow, HolidayStats } from './holiday.types'

// The leave list and its stat cards on payroll/fapi/leave_list.php (26 Oct 2026), replacing the scraped holiday/list.php cards and the
// holiday/ajax_holiday_list.php DataTables rows. newecuenta holds no leave request, so the item is the document's own shape ("from code"). The
// endpoint serves at most 200 rows a page, so the pages are read one after the other until the list is complete.

export interface FapiLeaveItem {
  id: number
  ref: string
  employee: { firstname: string; lastname: string; login: string }
  validator: { firstname: string; lastname: string; login: string } | null
  type_label: string
  duration_days: number
  date_debut: string
  date_fin: string
  date_create: string
  date_update: string
  status_label: string
}
export interface FapiLeaveList {
  stats: { employees: number; leave_records: number; this_month: number; approved: number; cancelled: number }
  items: FapiLeaveItem[]
  pagination: { page: number; limit: number; total: number; pages: number }
}

const name = (u: { firstname: string; lastname: string; login: string } | null) => (u ? [u.firstname, u.lastname].filter(Boolean).join(' ') || u.login : '')
// "2026-10-26" -> "10/26/2026"
const mdy = (iso: string | null | undefined) => {
  const [y, m, d] = (iso ?? '').slice(0, 10).split('-')
  return y && m && d ? `${m}/${d}/${y}` : ''
}
// "2026-10-23 10:15:00" -> "10/23/2026 10:15 AM" (the way the old table printed it)
export const mdyHm = (value: string | null | undefined) => {
  const m = (value ?? '').match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/)
  if (!m) return mdy(value)
  const h = Number(m[4])
  return `${m[2]}/${m[3]}/${m[1]} ${String(h % 12 || 12).padStart(2, '0')}:${m[5]} ${h >= 12 ? 'PM' : 'AM'}`
}

export const mapHolidayStats = (s: FapiLeaveList['stats']): HolidayStats => ({ employees: s.employees, leaveRecords: s.leave_records, thisMonth: s.this_month, approved: s.approved, cancelled: s.cancelled })

export const mapLeaveItem = (r: FapiLeaveItem): HolidayRequestRow => ({
  id: String(r.id),
  ref: r.ref,
  employeeName: name(r.employee),
  validatorName: name(r.validator),
  typeLabel: r.type_label,
  duration: String(r.duration_days),
  startDate: mdy(r.date_debut),
  endDate: mdy(r.date_fin),
  createDate: mdyHm(r.date_create),
  updateDate: mdyHm(r.date_update),
  status: r.status_label,
})

export const loadHolidayStats = async () => mapHolidayStats((await fapiGet<FapiLeaveList>('/payroll/fapi/leave_list.php', { limit: 1 })).stats)

export async function loadLeaveRequests(f: { from: string; to: string; status: string }): Promise<HolidayRequestRow[]> {
  const page = (n: number) =>
    fapiGet<FapiLeaveList>('/payroll/fapi/leave_list.php', { page: n, limit: 200, date_start: f.from || undefined, date_end: f.to || undefined, search_status: f.status || undefined })
  const first = await page(1)
  const rows = [...first.items]
  for (let n = 2; n <= Math.min(first.pagination.pages, 25); n++) rows.push(...(await page(n)).items)
  return rows.map(mapLeaveItem)
}

// ── Leave Request: holiday/fapi/leave.php (#393, Nov 2026) ───────────────────
// Replaces the legacy HTML scrape of holiday/card.php?action=create + api/user/leave-types.php.
// GET ?action=form: leave types, approvers, per-type balances, session/mode vocab, can_create.
// POST ?action=create: files a validated request via Holiday ORM (create + validate), hierarchy-gated,
// overlap-guarded, returning 422 for validation errors.

export interface LeaveFormOption {
  value: string
  label: string
}

export interface LeaveType {
  id: number
  code: string
  label: string
  balanceDays: number
}

export interface LeaveCreateForm {
  employees: LeaveFormOption[]
  types: LeaveFormOption[]
  approvers: LeaveFormOption[]
  canCreate: boolean
  leaveTypes: LeaveType[]
  defaultEmployeeId?: string
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

export interface FapiUserRef {
  id?: number | string
  rowid?: number | string
  login?: string
  firstname?: string
  lastname?: string
  name?: string
  fullname?: string
  label?: string
  value?: string
}

export interface FapiLeaveTypeRef {
  id?: number | string
  rowid?: number | string
  code?: string
  label?: string
  name?: string
  balance?: number | string
  balance_days?: number | string
  nb_days?: number | string
  newByMonth?: number | string
}

export interface FapiLeaveFormData {
  can_create?: boolean
  types?: FapiLeaveTypeRef[]
  leave_types?: FapiLeaveTypeRef[]
  approvers?: FapiUserRef[]
  valideurs?: FapiUserRef[]
  balances?:
    | Record<string, number | string>
    | Array<{
        type_id?: number | string
        fk_type?: number | string
        id?: number | string
        code?: string
        balance?: number | string
        balance_days?: number | string
        nb_days?: number | string
      }>
  employees?: FapiUserRef[]
  users?: FapiUserRef[]
  target_user?: FapiUserRef
  user?: FapiUserRef
  session_vocab?: string[] | Array<{ value: string; label: string }>
  sessions?: string[] | Array<{ value: string; label: string }>
  mode_vocab?: string[] | Array<{ value: string; label: string }>
  modes?: string[] | Array<{ value: string; label: string }>
}

function formatUserLabel(u: FapiUserRef): string {
  if (u.label) return u.label
  if (u.fullname) return u.fullname
  if (u.name) return u.name
  const parts = [u.firstname, u.lastname].filter(Boolean).join(' ')
  return parts || u.login || String(u.id ?? u.rowid ?? '')
}

export function mapLeaveCreateForm(d: FapiLeaveFormData): LeaveCreateForm {
  const rawApprovers = d.approvers ?? d.valideurs ?? []
  const approvers: LeaveFormOption[] = rawApprovers.map((a) => ({
    value: String(a.value ?? a.id ?? a.rowid ?? ''),
    label: formatUserLabel(a),
  }))

  const balanceMap = new Map<string, number>()
  if (d.balances) {
    if (Array.isArray(d.balances)) {
      for (const b of d.balances) {
        const key = String(b.type_id ?? b.fk_type ?? b.id ?? b.code ?? '')
        const val = Number(b.balance ?? b.balance_days ?? b.nb_days ?? 0)
        if (key) balanceMap.set(key, val)
      }
    } else if (typeof d.balances === 'object') {
      for (const [key, val] of Object.entries(d.balances)) {
        balanceMap.set(String(key), Number(val) || 0)
      }
    }
  }

  const rawTypes = d.types ?? d.leave_types ?? []
  const types: LeaveFormOption[] = []
  const leaveTypes: LeaveType[] = []

  for (const t of rawTypes) {
    const id = Number(t.id ?? t.rowid ?? 0)
    const code = String(t.code ?? t.id ?? t.rowid ?? '')
    const label = String(t.label ?? t.name ?? code)
    const valFromType = t.balance ?? t.balance_days ?? t.nb_days
    const balanceDays =
      valFromType !== undefined
        ? Number(valFromType) || 0
        : balanceMap.get(String(id)) ?? balanceMap.get(code) ?? (t.newByMonth ? Math.round(Number(t.newByMonth) * 12) : 0)

    types.push({ value: String(id), label })
    leaveTypes.push({
      id,
      code: code || String(id),
      label,
      balanceDays,
    })
  }

  const rawEmployees = d.employees ?? d.users ?? []
  const employees: LeaveFormOption[] = rawEmployees.map((e) => ({
    value: String(e.value ?? e.id ?? e.rowid ?? ''),
    label: formatUserLabel(e),
  }))

  const target = d.target_user ?? d.user
  let defaultEmployeeId: string | undefined = target ? String(target.id ?? target.rowid ?? '') : undefined

  if (target) {
    const targetIdStr = String(target.id ?? target.rowid ?? '')
    if (targetIdStr && !employees.some((e) => e.value === targetIdStr)) {
      employees.unshift({ value: targetIdStr, label: formatUserLabel(target) })
    }
  }

  if (!defaultEmployeeId && employees.length > 0) {
    defaultEmployeeId = employees[0].value
  }

  return {
    employees,
    types,
    approvers,
    canCreate: d.can_create !== false,
    leaveTypes,
    defaultEmployeeId,
  }
}

export const loadLeaveCreateForm = async (): Promise<LeaveCreateForm> => {
  const d = await fapiGet<FapiLeaveFormData>('/holiday/fapi/leave.php', { action: 'form' })
  return mapLeaveCreateForm(d)
}

export const createLeaveRequestFapi = async (input: NewLeaveRequestInput): Promise<string> => {
  const payload = {
    user_id: Number(input.employeeId) || input.employeeId,
    fuserid: Number(input.employeeId) || input.employeeId,
    fk_user: Number(input.employeeId) || input.employeeId,
    employee_id: Number(input.employeeId) || input.employeeId,

    type_id: Number(input.typeId) || input.typeId,
    type: Number(input.typeId) || input.typeId,
    fk_type: Number(input.typeId) || input.typeId,

    mode: input.mode,
    leave_mode: input.mode,

    date_start: input.startDate,
    date_debut: input.startDate,
    date_debut_: input.startDate,

    start_session: input.startSession,
    start_session_type: input.startSession,

    date_end: input.mode === 'multi' ? input.endDate : input.startDate,
    date_fin: input.mode === 'multi' ? input.endDate : input.startDate,
    date_fin_: input.mode === 'multi' ? input.endDate : '',

    end_session: input.mode === 'multi' ? input.endSession : input.startSession,
    end_session_type: input.mode === 'multi' ? input.endSession : input.startSession,

    valideur: Number(input.approverId) || input.approverId,
    valideur_id: Number(input.approverId) || input.approverId,
    approver_id: Number(input.approverId) || input.approverId,
    fk_validator: Number(input.approverId) || input.approverId,

    description: input.description,
  }

  const res = await fapiPost<{ id?: number | string; holiday_id?: number | string; ref?: string }>(
    '/holiday/fapi/leave.php',
    payload,
    { action: 'create' },
  )
  const id = res?.id ?? res?.holiday_id
  return id ? String(id) : ''
}
