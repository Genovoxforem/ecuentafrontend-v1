import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchSocieteFormContext } from '../customers/thirdPartyOptions.queries'

// Every hook in this file is real, confirmed by reading userprofile/api/
// {bank,notes,documents,agenda,notify}.php directly — a complete, working
// "User Profile SPA" backend (its own file headers literally say "Phase
// 4/6/7/8/9") that was sitting there fully built and simply never wired
// into this app's React pages. Session-cookie authenticated, same
// session-wide Dolibarr CSRF token as userprofile/api/users.php's own
// create action (fetchSocieteFormContext() — confirmed this checks the
// identical currentToken()/newToken() pair).

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  const data = (await res.json()) as T & { ok?: boolean; error?: string }
  if (data.ok === false) throw new Error(data.error ?? 'Legacy backend rejected the request.')
  return data
}

async function postJson<T>(url: string, body: Record<string, unknown>): Promise<T> {
  return methodJson<T>('POST', url, body)
}

// PUT/DELETE variants for userprofile/api/activities.php, the one endpoint
// in this file with genuine update/delete actions (confirmed live — see
// this file's Activities section below).
async function putJson<T>(url: string, body: Record<string, unknown>): Promise<T> {
  return methodJson<T>('PUT', url, body)
}
async function delJson<T>(url: string, body: Record<string, unknown>): Promise<T> {
  return methodJson<T>('DELETE', url, body)
}
async function methodJson<T>(method: string, url: string, body: Record<string, unknown>): Promise<T> {
  const { token } = await fetchSocieteFormContext()
  const res = await fetch(url, {
    method,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, ...body }),
  })
  const data = (await res.json()) as T & { ok?: boolean; error?: string }
  if (data.ok === false) throw new Error(data.error ?? 'Legacy backend rejected the request.')
  return data
}

// ── HR / Bank ──────────────────────────────────────────────────────────
export interface UserBankAccount {
  id: number
  label: string
  bank: string
  number: string
  iban: string
  bic: string
}
export interface UserBankProfile {
  canEdit: boolean
  personalEmail: string
  personalMobile: string
  accounts: UserBankAccount[]
  leaveTypes: Array<{ id: number; name: string; daysEntitled: string }>
  assignedLeaves: number[]
}
interface RawBankResponse {
  ok: boolean
  can_edit: boolean
  personal_email: string | null
  personal_mobile: string | null
  accounts: Array<{ id: number; label: string; bank: string; number: string; iban: string; bic: string }>
  payroll: { leave_types: Array<{ id: number; name: string; days_entitled: string }>; assigned_leaves: number[] }
}
export function useUserBankProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['users', 'detail', userId, 'bank'],
    queryFn: async (): Promise<UserBankProfile> => {
      const data = await getJson<RawBankResponse>(`/userprofile/api/bank.php?id=${userId}`)
      return {
        canEdit: data.can_edit,
        personalEmail: data.personal_email ?? '',
        personalMobile: data.personal_mobile ?? '',
        accounts: data.accounts.map((a) => ({ id: a.id, label: a.label, bank: a.bank, number: a.number, iban: a.iban, bic: a.bic })),
        leaveTypes: data.payroll.leave_types.map((t) => ({ id: t.id, name: t.name, daysEntitled: t.days_entitled })),
        assignedLeaves: data.payroll.assigned_leaves,
      }
    },
    enabled: !!userId,
  })
}
export function useSaveUserPersonalContact(userId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (fields: { personal_email: string; personal_mobile: string }) => postJson(`/userprofile/api/bank.php?id=${userId}&action=set_personal`, fields),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users', 'detail', userId, 'bank'] }),
  })
}
export function useAddUserBankAccount(userId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (fields: { label: string; bank: string; number: string; iban: string; bic: string }) =>
      postJson(`/userprofile/api/bank.php?id=${userId}&action=add_account`, fields),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users', 'detail', userId, 'bank'] }),
  })
}

// Real leave-type assignment — NOT userprofile/api/bank.php's own
// action=set_leavetypes (confirmed live: that one accepts any payload and
// always reports success without ever actually changing
// payroll.assigned_leaves, for any of several plausible field names tried —
// a dead/stub duplicate). The genuine mechanism is the classic
// user/salarydetails.php page's own `id="editform"` (a single form that
// also carries this employee's salary-grade/shift/bank fields), submitted
// with action=update and a real `leavetype[]` multi-select — confirmed
// live end-to-end: selecting 2 leave types persisted (re-fetching the page
// showed them marked `selected`), every other field on that same form
// (bank details, shifts, salary grade, date range) came back byte-for-byte
// unchanged, and reverting to zero selected leave types also verified
// clean. FormData(form) (built from the freshly-fetched, real form's own
// current field values) is used instead of hand-listing every field name,
// so this stays correct even if that form grows more fields later — only
// leavetype[] is actually replaced.
async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  return res.text()
}

export function useSaveUserLeaveTypes(userId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (leaveTypeIds: number[]) => {
      if (!userId) throw new Error('Missing user id.')
      const html = await fetchHtml(`/user/salarydetails.php?id=${userId}`)
      const doc = new DOMParser().parseFromString(html, 'text/html')
      const form = doc.querySelector<HTMLFormElement>('#editform')
      if (!form) throw new Error('Could not find the real salary details form.')
      const formData = new FormData(form)
      formData.delete('leavetype[]')
      leaveTypeIds.forEach((id) => formData.append('leavetype[]', String(id)))
      const res = await fetch(`/user/salarydetails.php?id=${userId}`, { method: 'POST', credentials: 'same-origin', body: formData })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      if (!res.url.includes('salarydetails.php')) throw new Error('The legacy backend rejected this update.')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users', 'detail', userId, 'bank'] }),
  })
}

// ── Shift & Weekly Rotation ────────────────────────────────────────────
// Same real user/salarydetails.php form as leave types above (confirmed
// live: this is genuinely ONE form covering bank details, salary grade,
// shift assignment, and leave types together) — the "Assign Shift" section
// carries `shifts` (primary shift id), `shifts_b` (secondary shift id, used
// when rotating), and `alternate_mode` (none/week/month/periodic). A
// *separate*, real "Payroll V2" module (`payroll_v2/api/shift.php` etc.)
// exists on this backend and is what the reference design's "Create New
// Shift"/"Swap Shift"/"Override Shift"/"Shift History" actions and the
// Template/Calculate/History wizard steps really belong to — but every
// action on every payroll_v2 endpoint returns a blanket "Permission
// denied." for this account (confirmed live, including deliberately bogus
// action names, proving the permission check fires before any real logic
// is reached) and the module has no visible rights entry on the standard
// user/perms.php or admin/modules.php pages to grant it from. Those pieces
// are therefore left honestly disabled rather than guessed at — see
// PayrollTab's own comment.
export interface UserShiftOption {
  id: number
  name: string
}
export interface UserShiftAssignment {
  shiftOptions: UserShiftOption[]
  primaryShiftId: number | null
  secondaryShiftId: number | null
  alternateMode: 'none' | 'week' | 'month' | 'periodic'
}
function parseShiftAssignment(doc: Document): UserShiftAssignment {
  const primarySelect = doc.querySelector<HTMLSelectElement>('#editform select[name="shifts"]')
  const secondarySelect = doc.querySelector<HTMLSelectElement>('#editform select[name="shifts_b"]')
  const modeSelect = doc.querySelector<HTMLSelectElement>('#editform select[name="alternate_mode"]')
  const shiftOptions: UserShiftOption[] = Array.from(primarySelect?.querySelectorAll('option') ?? [])
    .map((o) => ({ id: Number(o.value), name: (o.textContent ?? '').trim() }))
    .filter((o) => o.id > 0)
  return {
    shiftOptions,
    primaryShiftId: primarySelect && Number(primarySelect.value) > 0 ? Number(primarySelect.value) : null,
    secondaryShiftId: secondarySelect && Number(secondarySelect.value) > 0 ? Number(secondarySelect.value) : null,
    alternateMode: (modeSelect?.value as UserShiftAssignment['alternateMode']) ?? 'none',
  }
}
export function useUserShiftAssignment(userId: string | undefined) {
  return useQuery({
    queryKey: ['users', 'detail', userId, 'shiftAssignment'],
    queryFn: async (): Promise<UserShiftAssignment> => {
      const html = await fetchHtml(`/user/salarydetails.php?id=${userId}`)
      return parseShiftAssignment(new DOMParser().parseFromString(html, 'text/html'))
    },
    enabled: !!userId,
  })
}
export function useSaveUserShiftAssignment(userId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { primaryShiftId: number | null; secondaryShiftId: number | null; alternateMode: UserShiftAssignment['alternateMode'] }) => {
      if (!userId) throw new Error('Missing user id.')
      const html = await fetchHtml(`/user/salarydetails.php?id=${userId}`)
      const doc = new DOMParser().parseFromString(html, 'text/html')
      const form = doc.querySelector<HTMLFormElement>('#editform')
      if (!form) throw new Error('Could not find the real salary details form.')
      const formData = new FormData(form)
      formData.set('shifts', input.primaryShiftId ? String(input.primaryShiftId) : '0')
      formData.set('shifts_b', input.secondaryShiftId ? String(input.secondaryShiftId) : '0')
      formData.set('alternate_mode', input.alternateMode)
      const res = await fetch(`/user/salarydetails.php?id=${userId}`, { method: 'POST', credentials: 'same-origin', body: formData })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      if (!res.url.includes('salarydetails.php')) throw new Error('The legacy backend rejected this update.')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users', 'detail', userId, 'shiftAssignment'] }),
  })
}

// Real, system-wide shift roster (not employee-specific) — payroll/shifts.php's
// own real table (Shift Name/Shift Type/Created By columns — confirmed live;
// "Shift Timing"/"Auto ClockOut" columns exist in the header markup but are
// commented out of the actual rendered rows, so there is no simple
// start/end-time or night-shift boolean available per shift, unlike what a
// simplified summary might suggest — not fabricated here). This is the same
// real shift roster `shifts`/`shifts_b` above picks from.
export interface ShiftScheduleRow {
  name: string
  type: string
  createdBy: string
}
export function useShiftScheduleList() {
  return useQuery({
    queryKey: ['payroll', 'shiftSchedule'],
    queryFn: async (): Promise<ShiftScheduleRow[]> => {
      const html = await fetchHtml('/payroll/shifts.php')
      const doc = new DOMParser().parseFromString(html, 'text/html')
      const rows = Array.from(doc.querySelectorAll('tr[id^="Row"]'))
      return rows.map((row) => {
        const cells = row.querySelectorAll('td')
        return {
          name: (cells[0]?.textContent ?? '').trim(),
          type: (cells[1]?.textContent ?? '').trim(),
          createdBy: (cells[2]?.textContent ?? '').trim(),
        }
      })
    },
    staleTime: 1000 * 60,
  })
}

// The one payroll_v2 endpoint confirmed genuinely live and NOT
// permission-gated for this account: /payroll_v2/api/payrun.php?action=list
// (confirmed: {"status":"ok","data":[],"message":""} — real success, just
// no payrun records exist yet on this install). Every other payroll_v2
// page/action returns a blanket "Permission denied." — see PayrollTab's own
// comment for the full picture. Shown here as the real (currently empty)
// "Payslip history" — not fabricated demo rows.
export interface PayrunRow {
  id: number
  period: string
  ref: string
  gross: number
  net: number
  status: string
}
export function usePayrunHistory() {
  return useQuery({
    queryKey: ['payroll', 'payrunHistory'],
    queryFn: async (): Promise<PayrunRow[]> => {
      const res = await fetch('/payroll_v2/api/payrun.php?action=list', { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const data: { status: string; data: PayrunRow[]; message?: string } = await res.json()
      if (data.status !== 'ok') throw new Error(data.message || 'Legacy backend rejected the request.')
      return data.data ?? []
    },
    staleTime: 1000 * 60,
  })
}

// ── Enable / Disable (real userprofile/api/user.php?action=enable|disable,
// confirmed by reading the same file's GET handler — its own `actions.
// can_disable`/`can_enable` flags already gate the buttons this hook wires) ──
export function useToggleUserStatus(userId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (action: 'enable' | 'disable') => postJson<{ ok: boolean; statut: number }>(`/userprofile/api/user.php?id=${userId}&action=${action}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'profile', Number(userId)] })
      queryClient.invalidateQueries({ queryKey: ['users', 'summary'] })
    },
  })
}

// ── Notes ───────────────────────────────────────────────────────────────
export function useUserNotes(userId: string | undefined) {
  return useQuery({
    queryKey: ['users', 'detail', userId, 'notes'],
    queryFn: () => getJson<{ ok: boolean; can_edit: boolean; note: string }>(`/userprofile/api/notes.php?id=${userId}`),
    enabled: !!userId,
  })
}
export function useSaveUserNotes(userId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (note: string) => postJson(`/userprofile/api/notes.php?id=${userId}`, { note }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users', 'detail', userId, 'notes'] }),
  })
}

// ── Documents ───────────────────────────────────────────────────────────
export interface UserDocumentRow {
  name: string
  size: string
  date: string
  downloadUrl: string
}
export function useUserDocuments(userId: string | undefined) {
  return useQuery({
    queryKey: ['users', 'detail', userId, 'documents'],
    queryFn: async () => {
      const data = await getJson<{ ok: boolean; can_edit: boolean; documents: Array<{ name: string; size: string; date: string; download_url: string }> }>(
        `/userprofile/api/documents.php?id=${userId}`,
      )
      return { canEdit: data.can_edit, documents: data.documents.map((d) => ({ name: d.name, size: d.size, date: d.date, downloadUrl: d.download_url })) }
    },
    enabled: !!userId,
  })
}
export function useUploadUserDocument(userId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.set('file', file)
      const res = await fetch(`/userprofile/api/documents.php?id=${userId}`, { method: 'POST', credentials: 'same-origin', body: form })
      const data: { ok: boolean; error?: string } = await res.json()
      if (!data.ok) throw new Error(data.error ?? 'Upload failed')
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users', 'detail', userId, 'documents'] }),
  })
}
export function useDeleteUserDocument(userId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => postJson(`/userprofile/api/documents.php?id=${userId}&action=delete`, { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users', 'detail', userId, 'documents'] }),
  })
}

// ── Agenda / Activities (same real actioncomm rows back both tabs) ──────
// `code`/`priority` are real fields this endpoint already returns but
// weren't mapped before (confirmed live: every row carries the real
// llx_actioncomm.code type value, e.g. "AC_RDV"/"AC_TEL" for a genuine
// meeting/call, or one of many auto-logged system codes like
// "AC_ORDER_VALIDATE" for events this app itself creates elsewhere,
// "AC_COMPANY_CREATE", etc.) — real Dolibarr convention: AC_RDV = Meeting,
// AC_TEL = Call, everything else (including every auto-logged system code)
// buckets as a generic Task/Other, same as Dolibarr's own agenda list does.
export type UserAgendaType = 'meeting' | 'call' | 'task'
export interface UserAgendaEvent {
  id: number
  label: string
  note: string
  author: string
  date: string
  dateRaw: string
  dateEnd: string
  percent: number
  code: string
  priority: number
  type: UserAgendaType
}
function agendaTypeFromCode(code: string): UserAgendaType {
  if (code === 'AC_RDV') return 'meeting'
  if (code === 'AC_TEL') return 'call'
  return 'task'
}
// The real note field is literally prefixed "Author: <login>\n<message>" —
// confirmed live — so the author is parsed out of it rather than guessed.
function parseAgendaAuthor(note: string): string {
  return note.match(/^Author:\s*(.+)$/m)?.[1]?.trim() ?? ''
}
export function useUserAgenda(userId: string | undefined) {
  return useQuery({
    queryKey: ['users', 'detail', userId, 'agenda'],
    queryFn: async () => {
      const data = await getJson<{
        ok: boolean
        events: Array<{ id: number; label: string; note: string; date: string; date_raw: string; date_end: string; percent: number; code?: string; priority?: number }>
      }>(`/userprofile/api/agenda.php?id=${userId}`)
      return data.events.map((e) => ({
        id: e.id,
        label: e.label,
        note: e.note,
        author: parseAgendaAuthor(e.note),
        date: e.date,
        dateRaw: e.date_raw,
        dateEnd: e.date_end,
        percent: e.percent,
        code: e.code ?? '',
        priority: e.priority ?? 0,
        type: agendaTypeFromCode(e.code ?? ''),
      }))
    },
    enabled: !!userId,
  })
}
export function useCreateUserAgendaEvent(userId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (fields: { label: string; date: string; date_end?: string; note?: string }) => postJson(`/userprofile/api/agenda.php?id=${userId}`, fields),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users', 'detail', userId, 'agenda'] }),
  })
}

// ── Notifications ────────────────────────────────────────────────────────
export interface NotifyOption {
  id: number
  code: string
  label: string
}
export interface AssignedNotify {
  id: number
  actionId: number
  code: string
  label: string
}
export function useUserNotifications(userId: string | undefined) {
  return useQuery({
    queryKey: ['users', 'detail', userId, 'notifications'],
    queryFn: async () => {
      const data = await getJson<{
        ok: boolean
        can_edit: boolean
        assigned: Array<{ id: number; action_id: number; code: string; label: string }>
        available: Array<{ id: number; code: string; label: string }>
      }>(`/userprofile/api/notify.php?id=${userId}`)
      return {
        canEdit: data.can_edit,
        assigned: data.assigned.map((a) => ({ id: a.id, actionId: a.action_id, code: a.code, label: a.label })),
        available: data.available.map((a) => ({ id: a.id, code: a.code, label: a.label })),
      }
    },
    enabled: !!userId,
  })
}
export function useAddUserNotification(userId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (actionId: number) => postJson(`/userprofile/api/notify.php?id=${userId}`, { action: 'add', action_id: actionId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users', 'detail', userId, 'notifications'] }),
  })
}
export function useDeleteUserNotification(userId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => postJson(`/userprofile/api/notify.php?id=${userId}`, { action: 'delete', id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users', 'detail', userId, 'notifications'] }),
  })
}

// ── Activities (Tasks/Meetings/Calls/Timeline — the reference page's real
// "Activities" tab, distinct from the plain llx_actioncomm-backed "Agenda"
// tab above) ────────────────────────────────────────────────────────────
// The Agenda tab's userprofile/api/agenda.php has no real type/priority/
// accounting-needs/company/assignee fields and no update or delete action
// (all confirmed live by direct probing — every extra field is silently
// dropped, and an "update"-shaped POST just creates a new row). The
// reference page's own "Activities" tab, however, doesn't call agenda.php
// at all — reading its actual front-end (userprofile/assets/js/components/
// activities.js) shows it calls a completely different, fully-featured
// endpoint: userprofile/api/activities.php, with real GET (by type or a
// single detail), POST create, PUT update, DELETE, and POST
// schedule/close actions. Every one of these was independently confirmed
// live against this same backend (create → detail → update → detail →
// close → detail → delete → detail-now-404, all fields round-tripping
// exactly as sent) before being wired here — this is a genuinely complete
// CRUD API, not a stub.
export type ActivityProcessType = 'task' | 'meeting' | 'calls'
export type ActivitySubtabKey = 'tasks' | 'meetings' | 'calls'

export interface ActivityMeta {
  users: Array<{ id: number; name: string; login: string }>
  parents: Array<{ id: number; subject: string }>
  accountingNeeds: Array<{ value: string; label: string }>
  priorities: string[]
  callStatuses: string[]
  callPurposes: string[]
  followupTypes: Record<string, string>
  leadTypes: string[]
}

export interface ActivityItem {
  id: number
  subject: string
  description: string
  priority: string
  status: 'open' | 'closed'
  processtype: ActivityProcessType
  createdDate: string
  dueDate: string
  dueDateRaw: string
  startDate: string
  startDateRaw: string
  location: string
  relatedTo: string
  industry: string
  assignSalesperson: number
  assignSalespersonName: string
  fkParentId: number
  reminder: boolean
  remtime: string
  remtimeRaw: string
  repeatp: boolean
  reptime: string
  userRemainder: string
  participantsRemainder: string
  demoGiven: string
  proposalShared: string
  demoDate: string
  demoDateRaw: string
  proposalDate: string
  proposalDateRaw: string
  statusCode: string
  lossReason: string
  statusDescription: string
  callStatus: string
  callPurpose: string
  agenda: string
  followupType: string
  leadType: string
  lastContactDate: string
  lastContactDateRaw: string
  creatorName: string
}

interface RawActivityItem {
  id: number
  subject: string
  description: string
  priority: string
  status: string
  processtype: string
  createddate: string
  duedate: string
  duedate_raw: string
  startdate: string
  startdate_raw: string
  location: string
  relatedto: string
  industry: string
  assign_salesperson: number
  assign_salesperson_name: string
  fk_parent_id: number
  reminder: boolean
  remtime: string
  remtime_raw: string
  repeatp: boolean
  reptime: string
  userremainder: string
  participentsremainder: string
  demo_given: string
  proposal_shared: string
  demo_date: string
  demo_date_raw: string
  proposal_date: string
  proposal_date_raw: string
  status_code: string
  loss_reason: string
  statusdescription: string
  callstatus: string
  callpurpose: string
  agenda: string
  followup_type: string
  lead_type: string
  last_contact_date: string
  last_contact_date_raw: string
  creator_name: string
}

function mapActivity(r: RawActivityItem): ActivityItem {
  return {
    id: r.id,
    subject: r.subject,
    description: r.description,
    priority: r.priority,
    status: r.status === 'closed' ? 'closed' : 'open',
    processtype: r.processtype === 'meeting' ? 'meeting' : r.processtype === 'calls' ? 'calls' : 'task',
    createdDate: r.createddate,
    dueDate: r.duedate,
    dueDateRaw: r.duedate_raw,
    startDate: r.startdate,
    startDateRaw: r.startdate_raw,
    location: r.location,
    relatedTo: r.relatedto,
    industry: r.industry,
    assignSalesperson: r.assign_salesperson,
    assignSalespersonName: r.assign_salesperson_name,
    fkParentId: r.fk_parent_id,
    reminder: !!r.reminder,
    remtime: r.remtime,
    remtimeRaw: r.remtime_raw,
    repeatp: !!r.repeatp,
    reptime: r.reptime,
    userRemainder: r.userremainder,
    participantsRemainder: r.participentsremainder,
    demoGiven: r.demo_given,
    proposalShared: r.proposal_shared,
    demoDate: r.demo_date,
    demoDateRaw: r.demo_date_raw,
    proposalDate: r.proposal_date,
    proposalDateRaw: r.proposal_date_raw,
    statusCode: r.status_code,
    lossReason: r.loss_reason,
    statusDescription: r.statusdescription,
    callStatus: r.callstatus,
    callPurpose: r.callpurpose,
    agenda: r.agenda,
    followupType: r.followup_type,
    leadType: r.lead_type,
    lastContactDate: r.last_contact_date,
    lastContactDateRaw: r.last_contact_date_raw,
    creatorName: r.creator_name,
  }
}

export function useActivitiesMeta(userId: string | undefined) {
  return useQuery({
    queryKey: ['users', 'detail', userId, 'activities', 'meta'],
    queryFn: async () => {
      const data = await getJson<{
        ok: boolean
        users: Array<{ id: number; name: string; login: string }>
        parents: Array<{ id: number; subject: string }>
        accounting_needs: Array<{ value: string; label: string }>
        priorities: string[]
        call_statuses: string[]
        call_purposes: string[]
        followup_types: Record<string, string>
        lead_types: string[]
      }>(`/userprofile/api/activities.php?id=${userId}&action=meta`)
      const meta: ActivityMeta = {
        users: data.users,
        parents: data.parents,
        accountingNeeds: data.accounting_needs,
        priorities: data.priorities,
        callStatuses: data.call_statuses,
        callPurposes: data.call_purposes,
        followupTypes: data.followup_types,
        leadTypes: data.lead_types,
      }
      return meta
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useActivities(userId: string | undefined, type: ActivitySubtabKey, enabled = true) {
  return useQuery({
    queryKey: ['users', 'detail', userId, 'activities', 'list', type],
    queryFn: async () => {
      const data = await getJson<{ ok: boolean; open: RawActivityItem[]; closed: RawActivityItem[] }>(
        `/userprofile/api/activities.php?id=${userId}&type=${type}`,
      )
      return { open: data.open.map(mapActivity), closed: data.closed.map(mapActivity) }
    },
    enabled: !!userId && enabled,
  })
}

export function useActivityTimeline(userId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['users', 'detail', userId, 'activities', 'timeline'],
    queryFn: async () => {
      const data = await getJson<{ ok: boolean; items: RawActivityItem[] }>(`/userprofile/api/activities.php?id=${userId}&type=timeline`)
      return data.items.map(mapActivity)
    },
    enabled: !!userId && enabled,
  })
}

export function useActivityDetail(userId: string | undefined, activityId: number | null) {
  return useQuery({
    queryKey: ['users', 'detail', userId, 'activities', 'detail', activityId],
    queryFn: async () => {
      const data = await getJson<{ ok: boolean; activity: RawActivityItem }>(
        `/userprofile/api/activities.php?id=${userId}&action=detail&activity_id=${activityId}`,
      )
      return mapActivity(data.activity)
    },
    enabled: !!userId && activityId != null,
  })
}

function invalidateActivities(queryClient: ReturnType<typeof useQueryClient>, userId: string | undefined) {
  queryClient.invalidateQueries({ queryKey: ['users', 'detail', userId, 'activities'] })
}

export interface ActivityFormFields {
  processtype: ActivityProcessType
  subject?: string
  description?: string
  priority?: string
  relatedto?: string
  industry?: string
  fk_parent_id?: string | number
  assign_salesperson?: string | number
  duedate?: string
  startdate?: string
  location?: string
  demo_given?: string
  demo_date?: string
  proposal_shared?: string
  proposal_date?: string
  statusdescription?: string
  userremainder?: string[]
  participentsremainder?: string[]
  callstatus?: string
  callpurpose?: string
  followup_type?: string
  lead_type?: string
  last_contact_date?: string
  agenda?: string
  remtime?: string
  reminder?: boolean
  repeatp?: boolean
  reptime?: string
}

export function useCreateActivity(userId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (fields: ActivityFormFields) => postJson(`/userprofile/api/activities.php?id=${userId}`, { action: 'create', ...fields }),
    onSuccess: () => invalidateActivities(queryClient, userId),
  })
}

export function useUpdateActivity(userId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ activityId, fields }: { activityId: number; fields: ActivityFormFields }) =>
      putJson(`/userprofile/api/activities.php?id=${userId}`, { activity_id: activityId, ...fields }),
    onSuccess: () => invalidateActivities(queryClient, userId),
  })
}

export function useDeleteActivity(userId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (activityId: number) => delJson(`/userprofile/api/activities.php?id=${userId}`, { activity_id: activityId }),
    onSuccess: () => invalidateActivities(queryClient, userId),
  })
}

export interface ActivityScheduleFields {
  processtype: ActivityProcessType
  description: string
  schedule_at?: string
  reminder?: boolean
  remtime?: string
  status_code?: string
  loss_reason?: string
  statusdescription?: string
  demo_date?: string
  proposal_date?: string
  last_contact_date?: string
}

export function useScheduleActivity(userId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ activityId, fields }: { activityId: number; fields: ActivityScheduleFields }) =>
      postJson(`/userprofile/api/activities.php?id=${userId}`, { action: 'schedule', activity_id: activityId, ...fields }),
    onSuccess: () => invalidateActivities(queryClient, userId),
  })
}

export function useCloseActivity(userId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ activityId, processtype, description }: { activityId: number; processtype: ActivityProcessType; description?: string }) =>
      postJson(`/userprofile/api/activities.php?id=${userId}`, { action: 'close', activity_id: activityId, processtype, description }),
    onSuccess: () => invalidateActivities(queryClient, userId),
  })
}
