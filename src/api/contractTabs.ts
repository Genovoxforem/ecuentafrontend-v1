/**
 * Contract detail tabs — contrat/fapi/{contacts,documents,agenda,followup}.php.
 *
 * The backend reference says these answer with the same shapes as the order and
 * quotation tabs, so the types mirror api/quotations.ts, with two differences in
 * the contract contract: a contact row is addressed by `rowid` (quotations use
 * `linkid`) and an "add" posts fk_user / fk_socpeople + type_contact.
 * Notes go through contrat/fapi/get.php + update.php (see contracts.ts).
 */

import { fapi } from './axios'

interface Envelope<T> {
  success: boolean
  data: T
  message: string | null
  errors: unknown[]
}

function unwrap<T>(body: Envelope<T>): T {
  if (!body?.success) {
    const errors = (body?.errors ?? []).map((e) => (typeof e === 'string' ? e : JSON.stringify(e)))
    throw new Error([body?.message, ...errors].filter(Boolean).join(': ') || 'The contract API returned an unsuccessful response.')
  }
  return body.data
}

const BASE = '/contrat/fapi'

/** The contact tabs (contact/fapi/{notes,documents,agenda}.php) answer the same shapes. */
export const CONTACT_BASE = '/contact/fapi'

export interface ContractOption {
  value: number | string
  label: string
}

export interface ContractContactRow {
  rowid: number
  name: string
  email?: string
  phone?: string
  nature_label: string
  thirdparty: string
  type_label: string
  status_label: string
}

export interface ContractContactsData {
  id: number
  rows: { internal: ContractContactRow[]; external: ContractContactRow[] }
  options: {
    issuer_company: string
    internal_types: ContractOption[]
    external_types: ContractOption[]
    users: ContractOption[]
    companies: ContractOption[]
    company_contacts: ContractOption[]
    selected_company: number | string
  }
  can_edit: boolean
}

// The backend lists options either as {value,label} or as {id,name} depending on
// the tab; accept both so one component serves them.
function toOptions(list: unknown): ContractOption[] {
  if (!Array.isArray(list)) return []
  return list.map((raw) => {
    const o = raw as Record<string, unknown>
    const label = String(o.label ?? o.name ?? '')
    const extra = [o.poste, o.email].filter(Boolean).join(' - ')
    return { value: (o.value ?? o.id ?? '') as number | string, label: o.value === undefined && extra ? `${label} - ${extra}` : label }
  })
}

function toRow(raw: unknown): ContractContactRow {
  const o = raw as Record<string, unknown>
  return {
    rowid: Number(o.rowid ?? o.linkid ?? 0),
    name: String(o.name ?? ''),
    email: o.email ? String(o.email) : undefined,
    phone: o.phone ? String(o.phone) : undefined,
    nature_label: String(o.nature_label ?? ''),
    thirdparty: String(o.thirdparty ?? ''),
    type_label: String(o.type_label ?? ''),
    status_label: String(o.status_label ?? ''),
  }
}

export async function fetchContractContacts(id: number): Promise<ContractContactsData> {
  const res = await fapi.get<Envelope<Record<string, any>>>(`${BASE}/contacts.php`, { params: { id } })
  const d = unwrap(res.data)
  const opts = d.options ?? {}
  return {
    id,
    rows: { internal: (d.rows?.internal ?? []).map(toRow), external: (d.rows?.external ?? []).map(toRow) },
    options: {
      issuer_company: String(opts.issuer_company ?? ''),
      internal_types: toOptions(opts.internal_types),
      external_types: toOptions(opts.external_types),
      users: toOptions(opts.users),
      companies: toOptions(opts.companies),
      company_contacts: toOptions(opts.company_contacts),
      selected_company: opts.selected_company ?? '',
    },
    can_edit: d.can_edit !== false && opts.can_edit !== false,
  }
}

export type ContractContactChange =
  | { action: 'add'; source: 'internal'; fk_user: number; type_contact: number | string }
  | { action: 'add'; source: 'external'; fk_socpeople: number; type_contact: number | string }
  | { action: 'delete' | 'swap'; rowid: number }

export async function changeContractContact(id: number, change: ContractContactChange): Promise<void> {
  const { action, ...payload } = change
  const res = await fapi.post<Envelope<unknown>>(`${BASE}/contacts.php`, { id, ...payload }, { params: { action } })
  unwrap(res.data)
}

export interface ContractDocumentFile {
  name: string
  url: string
  size: string
  size_raw: number
  date: string
}

export interface ContractDocumentLink {
  id: number
  label: string
  url: string
  date: string
}

export interface ContractDocumentsData {
  id: number
  files: ContractDocumentFile[]
  links: ContractDocumentLink[]
  can_edit: boolean
}

export async function fetchContractDocuments(id: number, base = BASE): Promise<ContractDocumentsData> {
  const res = await fapi.get<Envelope<Record<string, any>>>(`${base}/documents.php`, { params: { id } })
  const d = unwrap(res.data)
  return {
    id,
    files: (d.files ?? []).map((f: any) => ({ name: String(f.name ?? ''), url: String(f.url ?? ''), size: String(f.size ?? ''), size_raw: Number(f.size_raw ?? 0), date: String(f.date ?? '') })),
    links: (d.links ?? []).map((l: any) => ({ id: Number(l.id ?? l.linkid ?? l.rowid ?? 0), label: String(l.label ?? ''), url: String(l.url ?? ''), date: String(l.date ?? '') })),
    can_edit: d.meta?.can_edit !== false && d.can_edit !== false,
  }
}

export async function uploadContractDocument(id: number, file: File, base = BASE): Promise<void> {
  const body = new FormData()
  body.append('id', String(id))
  body.append('file', file)
  const res = await fapi.post<Envelope<unknown>>(`${base}/documents.php`, body, { params: { action: 'upload' } })
  unwrap(res.data)
}

export async function linkContractDocument(id: number, link: string, label: string, base = BASE): Promise<void> {
  const res = await fapi.post<Envelope<unknown>>(`${base}/documents.php`, { id, link, label }, { params: { action: 'link' } })
  unwrap(res.data)
}

export async function deleteContractDocument(id: number, name: string, base = BASE): Promise<void> {
  const res = await fapi.post<Envelope<unknown>>(`${base}/documents.php`, { id, name }, { params: { action: 'delete_file' } })
  unwrap(res.data)
}

export async function deleteContractDocumentLink(id: number, linkid: number, base = BASE): Promise<void> {
  const res = await fapi.post<Envelope<unknown>>(`${base}/documents.php`, { id, linkid }, { params: { action: 'delete_link' } })
  unwrap(res.data)
}

export interface ContractAgendaEvent {
  ref: string
  url: string
  date: string
  owner: string
  label: string
  related_object_ref: string
  related_object_url: string
  status_label: string
}

export interface ContractAgendaData {
  id: number
  created_by: string
  creation_date: string
  latest_modification_date: string
  events: ContractAgendaEvent[]
}

export async function fetchContractAgenda(id: number, base = BASE): Promise<ContractAgendaData> {
  const res = await fapi.get<Envelope<Record<string, any>>>(`${base}/agenda.php`, { params: { id } })
  const d = unwrap(res.data)
  return {
    id,
    created_by: String(d.created_by ?? ''),
    creation_date: String(d.creation_date ?? ''),
    latest_modification_date: String(d.latest_modification_date ?? ''),
    events: (d.events ?? []).map((e: any) => ({
      ref: String(e.ref ?? e.id ?? ''),
      url: String(e.url ?? ''),
      date: String(e.date ?? ''),
      owner: String(e.owner ?? ''),
      label: String(e.label ?? ''),
      related_object_ref: String(e.related_object_ref ?? ''),
      related_object_url: String(e.related_object_url ?? ''),
      status_label: String(e.status_label ?? ''),
    })),
  }
}

/** Follow-up schedule. The reference does not publish this response's shape, so
 *  the raw data is returned and the page renders whichever list it carries. */
export async function fetchContractFollowup(id: number): Promise<Record<string, unknown>> {
  const res = await fapi.get<Envelope<Record<string, unknown>>>(`${BASE}/followup.php`, { params: { id } })
  return unwrap(res.data)
}

export interface RecordNotes {
  note_public: string
  note_private: string
  can_edit: boolean
}

/** Public / private notes of a record whose module has its own notes.php (contact). */
export async function fetchRecordNotes(base: string, id: number): Promise<RecordNotes> {
  const res = await fapi.get<Envelope<Record<string, any>>>(`${base}/notes.php`, { params: { id } })
  const d = unwrap(res.data)
  return { note_public: String(d.note_public ?? ''), note_private: String(d.note_private ?? ''), can_edit: d.can_edit !== false }
}

export async function saveRecordNotes(base: string, id: number, notes: { note_public: string; note_private: string }): Promise<void> {
  const res = await fapi.post<Envelope<unknown>>(`${base}/notes.php`, { id, ...notes })
  unwrap(res.data)
}

export type FollowupChange =
  | { action: 'plan'; contratdet_id: number; plan_month: string }
  | { action: 'set_status'; followup_id: number; comments_status: string }
  | { action: 'reschedule'; followup_id: number; reschedule_date: string }
  | { action: 'delete'; followup_id: number }

/** contrat/fapi/followup.php writes: plan a service line for a month, set a row's status, move it, or delete it. */
export async function changeContractFollowup(id: number, change: FollowupChange): Promise<void> {
  const { action, ...payload } = change
  const res = await fapi.post<Envelope<unknown>>(`${BASE}/followup.php`, { id, ...payload }, { params: { action } })
  unwrap(res.data)
}
