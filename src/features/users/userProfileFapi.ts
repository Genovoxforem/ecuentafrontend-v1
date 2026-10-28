import { fapiGet } from '../../api/fapiEnvelope'
import type { ActivityItem, ActivityMeta, AssignedNotify, NotifyOption, UserAgendaEvent, UserAgendaType, UserBankProfile } from './userDetailTabs.queries'
import type { UserPermissions } from './userPermissions.queries'

// The user-detail tabs on userprofile/fapi (26 Oct 2026), replacing the session-and-token userprofile/api/*.php files (which answer a login
// page to a call made with the API key). All of them are key-authenticated reads in the {success, data} envelope. The writes of these tabs
// (save a note, add an account, add a notification, upload / delete a file, create / update / close an activity, grant a right) only answer a plan
// ({executed: false, would_execute}) on the fapi, so they stay on the old endpoints.
//
// newecuenta's admin has no bank account, no note, no file, no notification rule and no activity, so those rows are the old endpoints' shape,
// which the fapi ports; the fapi has not been seen returning one.

type Row = Record<string, unknown>
const str = (v: unknown) => (v === null || v === undefined ? '' : String(v))
const num = (v: unknown) => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v)) ? Number(v) : 0)
const mdy = (iso: unknown) => {
  const [y, m, d] = str(iso).slice(0, 10).split('-')
  return y && m && d ? `${m}/${d}/${y}` : ''
}

// ---- HR & Bank: bank.php ---------------------------------------------------------------------------------------------------------------------------

export interface FapiUserBank {
  can_edit: boolean
  personal_email: string | null
  personal_mobile: string | null
  accounts: Row[]
  payroll: { leave_types: Array<{ id: number; name: string; days_entitled: string }>; assigned_leaves: number[] }
}
export const mapUserBank = (d: FapiUserBank): UserBankProfile => ({
  canEdit: d.can_edit,
  personalEmail: d.personal_email ?? '',
  personalMobile: d.personal_mobile ?? '',
  accounts: d.accounts.map((a) => ({ id: num(a.id), label: str(a.label), bank: str(a.bank), number: str(a.number), iban: str(a.iban), bic: str(a.bic) })),
  leaveTypes: d.payroll.leave_types.map((t) => ({ id: t.id, name: t.name, daysEntitled: t.days_entitled })),
  assignedLeaves: d.payroll.assigned_leaves,
})
export const loadUserBank = async (id: string) => mapUserBank(await fapiGet<FapiUserBank>('/userprofile/fapi/bank.php', { id }))

// ---- Notes, documents: notes.php, documents.php ------------------------------------------------------------------------------------------------

export const loadUserNotes = (id: string) => fapiGet<{ can_edit: boolean; note: string }>('/userprofile/fapi/notes.php', { id })

export interface FapiUserDocuments {
  can_edit: boolean
  documents: Array<{ name: string; size: string; date: string; download_url: string }>
}
export const mapUserDocuments = (d: FapiUserDocuments) => ({
  canEdit: d.can_edit,
  documents: d.documents.map((x) => ({ name: x.name, size: x.size, date: mdy(x.date), downloadUrl: x.download_url })),
})
export const loadUserDocuments = async (id: string) => mapUserDocuments(await fapiGet<FapiUserDocuments>('/userprofile/fapi/documents.php', { id }))

// ---- Agenda: agenda.php -------------------------------------------------------------------------------------------------------------------------------

export interface FapiUserAgenda {
  events: Array<{ id: number; label: string; note: string; date: string; date_raw: string; date_end: string; percent: number; code?: string; priority?: number }>
}
const agendaType = (code: string): UserAgendaType => (code === 'AC_RDV' ? 'meeting' : code === 'AC_TEL' ? 'call' : 'task')
// the note is literally prefixed "Author: <login>"
const agendaAuthor = (note: string) => note.match(/^Author:\s*(.+)$/m)?.[1]?.trim() ?? ''
export const mapUserAgenda = (d: FapiUserAgenda): UserAgendaEvent[] =>
  d.events.map((e) => ({
    id: e.id,
    label: e.label,
    note: e.note,
    author: agendaAuthor(e.note),
    date: e.date,
    dateRaw: e.date_raw,
    dateEnd: e.date_end,
    percent: e.percent,
    code: e.code ?? '',
    priority: e.priority ?? 0,
    type: agendaType(e.code ?? ''),
  }))
export const loadUserAgenda = async (id: string) => mapUserAgenda(await fapiGet<FapiUserAgenda>('/userprofile/fapi/agenda.php', { id }))

// ---- Notifications: notify.php ------------------------------------------------------------------------------------------------------------------------

export interface FapiUserNotify {
  can_edit: boolean
  assigned: Array<{ id: number; action_id: number; code: string; label: string }>
  available: Array<{ id: number; code: string; label: string }>
}
export const mapUserNotify = (d: FapiUserNotify): { canEdit: boolean; assigned: AssignedNotify[]; available: NotifyOption[] } => ({
  canEdit: d.can_edit,
  assigned: d.assigned.map((a) => ({ id: a.id, actionId: a.action_id, code: a.code, label: a.label })),
  available: d.available.map((a) => ({ id: a.id, code: a.code, label: a.label })),
})
export const loadUserNotify = async (id: string) => mapUserNotify(await fapiGet<FapiUserNotify>('/userprofile/fapi/notify.php', { id }))

// ---- Permissions: permissions.php ---------------------------------------------------------------------------------------------------------------------

export interface FapiUserPermissions {
  can_edit: boolean
  nb_rights: number
  modules: UserPermissions['modules']
}
export const mapUserPermissions = (d: FapiUserPermissions): UserPermissions => ({ canEdit: d.can_edit, nbRights: d.nb_rights, modules: d.modules })
export const loadUserPermissions = async (id: string) => mapUserPermissions(await fapiGet<FapiUserPermissions>('/userprofile/fapi/permissions.php', { id }))

// ---- Activities: activities.php ----------------------------------------------------------------------------------------------------------------------

export interface FapiActivityMeta {
  users: ActivityMeta['users']
  parents: ActivityMeta['parents']
  accounting_needs: ActivityMeta['accountingNeeds']
  priorities: string[]
  call_statuses: string[]
  call_purposes: string[]
  followup_types: Record<string, string>
  lead_types: string[]
}
export const mapActivityMeta = (d: FapiActivityMeta): ActivityMeta => ({
  users: d.users,
  parents: d.parents,
  accountingNeeds: d.accounting_needs,
  priorities: d.priorities,
  callStatuses: d.call_statuses,
  callPurposes: d.call_purposes,
  followupTypes: d.followup_types,
  leadTypes: d.lead_types,
})
export const loadActivityMeta = async (id: string) => mapActivityMeta(await fapiGet<FapiActivityMeta>('/userprofile/fapi/activities.php', { id, action: 'meta' }))

// A task / meeting / call row: the fields the old activities.php returned (the fapi ports that file; its own row is not documented).
export type MapActivity = (r: Row) => ActivityItem
export const loadActivities = async (id: string, type: 'tasks' | 'meetings' | 'calls', map: MapActivity) => {
  const d = await fapiGet<{ open: Row[]; closed: Row[] }>('/userprofile/fapi/activities.php', { id, type })
  return { open: d.open.map(map), closed: d.closed.map(map) }
}
export const loadActivityTimeline = async (id: string, map: MapActivity) => (await fapiGet<{ items: Row[] }>('/userprofile/fapi/activities.php', { id, type: 'timeline' })).items.map(map)
export const loadActivityDetail = async (id: string, activityId: number, map: MapActivity) => {
  const d = await fapiGet<{ activity?: Row } & Row>('/userprofile/fapi/activities.php', { id, action: 'detail', activity_id: activityId })
  return map((d.activity ?? d) as Row)
}
