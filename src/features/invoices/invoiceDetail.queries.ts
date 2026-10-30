import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fapiGet, fapiPost } from '../../api/fapiEnvelope'
import { htmlToText } from '../../shared/htmlToText'
import type { InvoiceNotes } from './invoiceTypes'
import type { ContactRow, ContactFormOptions } from '../salesOrders/orderExtraTabTypes'
import { fetchInvoiceAgenda, type InvoiceAgendaEvent } from '../../api/invoices'
import { fapi } from '../../api/axios'
import { requireJson } from '../salesOrders/orderApi'
import { parseLegacyJson } from '../../shared/legacyHtmlFetch'

// The invoice page's tabs. The page itself and most tabs read the JSON module
// compta/sales/api/*.php (see salesInvoice.queries.ts / salesInvoiceTabs.queries.ts);
// Notes, Contacts, Direct Debit Orders and the Agenda badge do too, below. The
// Events/Agenda tab reads compta/facture/fapi/agenda.php, which also carries
// that tab's "Created by / Validated by / Creation date" block.

// --- Notes -------------------------------------------------------------
// compta/sales/api/notes.php: GET returns both notes, action=save writes both
// (Facture::update), so a save always sends the other note's stored value too.
// `rawPublic`/`rawPrivate` are the stored values (what the edit box starts
// from and what is sent back unchanged); notePublic/notePrivate are for display.
export type InvoiceNotesData = InvoiceNotes & { rawPublic: string; rawPrivate: string }

export function useInvoiceNotes(id: string | undefined) {
  return useQuery<InvoiceNotesData>({
    queryKey: ['invoices', 'detail', id, 'notes'],
    queryFn: async () => {
      const d = await fapiGet<{ note_public?: string | null; note_private?: string | null }>('/compta/facture/fapi/notes.php', { id })
      return {
        notePublic: htmlToText(d.note_public),
        notePrivate: htmlToText(d.note_private),
        notePublicEditUrl: '',
        notePrivateEditUrl: '',
        rawPublic: d.note_public ?? '',
        rawPrivate: d.note_private ?? '',
      }
    },
    enabled: !!id,
  })
}

// compta/facture/fapi/notes.php writes only the note(s) sent, at any invoice status.
export function useUpdateInvoiceNote(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ notePublic, notePrivate }: { notePublic: string; notePrivate: string }) => {
      await fapiPost('/compta/facture/fapi/notes.php', { id: Number(id), note_public: notePublic, note_private: notePrivate })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices', 'detail', id, 'notes'] }),
  })
}

// --- Contacts/Addresses --------------------------------------------------

export interface InvoiceContactsData {
  rows: ContactRow[]
  formOptions: ContactFormOptions
}

// compta/facture/fapi/contacts.php?facid= (15 Oct 2026; replaces compta/sales/api/contacts.php, whose list formatter
// fataled for a third-party contact). One GET carries the rows and every
// option list the add form needs. Role values are codes (e.g. SALESREPFOLL).
interface FapiContactRow {
  rowid?: number
  name: string
  thirdparty?: string
  nature_label?: string
  type_label?: string
  status_label?: string
}
interface FapiOption {
  value?: string | number
  id?: string | number
  label?: string
  name?: string
  poste?: string
  email?: string
}

async function invoiceContactsFromFapi(id: string, newcompany: string | undefined): Promise<InvoiceContactsData> {
  const res = requireJson(await fapi.get(`/compta/facture/fapi/contacts.php`, { params: { facid: id, ...(newcompany ? { newcompany } : {}) } }))
  const body = res.data as { success?: boolean; message?: string; data?: any }
  if (!body.success) throw new Error(body.message || 'Could not load the contacts.')
  const d = body.data ?? {}
  const o = d.options ?? {}
  const opts = (list: FapiOption[] | undefined) =>
    (list ?? []).map((x) => ({ value: String(x.value ?? x.id ?? ''), label: x.label ?? [x.name, x.poste, x.email].filter(Boolean).join(' - ') }))
  const toRow = (c: FapiContactRow, fallbackNature: string): ContactRow => ({
    nature: c.nature_label || fallbackNature,
    thirdParty: c.thirdparty ?? '',
    contact: c.name,
    contactType: c.type_label ?? '',
    status: c.status_label ?? '',
    rowid: c.rowid,
  })
  const blank = { value: '', label: '' }
  const external = opts(o.company_contacts)
  return {
    rows: [...(d.rows?.internal ?? []).map((c: FapiContactRow) => toRow(c, 'User')), ...(d.rows?.external ?? []).map((c: FapiContactRow) => toRow(c, 'Third-party contact'))],
    formOptions: {
      issuerCompanyName: o.issuer_company ?? '',
      internalUserOptions: opts(o.users),
      internalTypeOptions: [blank, ...opts(o.internal_types)],
      companyOptions: opts(o.companies),
      selectedCompanyId: String(o.selected_company ?? ''),
      externalContactOptions: [blank, ...external],
      hasRealExternalContact: external.length > 0,
      externalTypeOptions: [blank, ...opts(o.external_types)],
    },
  }
}

export function useInvoiceContacts(id: string | undefined, newcompany?: string) {
  return useQuery<InvoiceContactsData>({
    queryKey: ['invoices', 'detail', id, 'contacts', newcompany ?? ''],
    queryFn: () => invoiceContactsFromFapi(id ?? '', newcompany),
    enabled: !!id,
  })
}

// contacts.php?action=add: `fk_user` or `fk_socpeople` plus `type_contact`, the role code.
export function useAddInvoiceContact(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { source: 'internal' | 'external'; userid?: string; type?: string; contactid?: string; typecontact?: string }) => {
      const internal = input.source === 'internal'
      const payload = {
        facid: Number(id),
        source: input.source,
        ...(internal ? { fk_user: Number(input.userid) } : { fk_socpeople: Number(input.contactid) }),
        type_contact: (internal ? input.type : input.typecontact) ?? '',
      }
      const res = requireJson(await fapi.post('/compta/facture/fapi/contacts.php', { action: 'add', ...payload }, { params: { action: 'add' } }))
      const body = res.data as { success?: boolean; message?: string }
      if (!body.success) throw new Error(body.message || 'Could not add this contact.')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', 'detail', id, 'contacts'] })
    },
  })
}

// compta/facture/fapi/contacts.php?action=delete | swap {facid, rowid}: remove a contact link, or
// switch it between active and inactive. Only the JSON endpoint offers these.
export function useChangeInvoiceContact(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { action: 'delete' | 'swap'; rowid: number }) => {
      const res = requireJson(await fapi.post('/compta/facture/fapi/contacts.php', { action: input.action, facid: Number(id), rowid: input.rowid }, { params: { action: input.action }, validateStatus: () => true }))
      const body = res.data as { success?: boolean; message?: string }
      if (!body.success) throw new Error(body.message || 'Could not change this contact.')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', 'detail', id, 'contacts'] })
    },
  })
}

// Ajax contract from card.php's own inline fnupdatezrainvoice(ref) script
// (POST /quicklinks_ajax.php, type=getzraresponseinvoice&cisInvcNo=<ref>;
// the classic success handler does
// `window.location.href = '/compta/sales/card.php?facid=' + ref`, so `ref`
// is this invoice's own facid, not a ZRA-side reference). The function is
// defined on every invoice's card.php but isn't wired to any visible
// button on the classic page — refetching the invoice detail query below
// is this app's equivalent of the classic handler's page reload.
export function useSyncZraInvoice(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const body = new URLSearchParams()
      body.set('type', 'getzraresponseinvoice')
      body.set('cisInvcNo', id ?? '')
      const res = await fetch('/quicklinks_ajax.php', { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', 'detail', id], exact: true })
    },
  })
}

// compta/sales/api/standingorders.php (JSON) instead of the 1.25 MB
// compta/facture/prelevement.php page. `orders` is every request on the
// invoice (pending and processed); `history` repeats the processed ones with
// the direct debit order's ref, which the table's "Direct Debit Order" column shows.
export interface StandingOrderRow {
  requestDate: string
  user: string
  amount: string
  ref: string
  processDate: string
}

interface RawStandingOrder {
  id?: number | string
  rowid?: number | string
  date?: string
  request_date?: string
  amount?: string | number
  processed_date?: string | null
  user_name?: string
  user_login?: string
  bon_ref?: string
  ref?: string
}

// compta/facture/fapi/standing_orders.php: `orders` is every request on the invoice (pending and processed), `history` the processed ones.
export function useInvoiceStandingOrders(id: string | undefined) {
  return useQuery<StandingOrderRow[]>({
    queryKey: ['invoices', 'detail', id, 'standingOrders'],
    queryFn: async () => {
      const d = await fapiGet<{ orders?: RawStandingOrder[]; history?: RawStandingOrder[] }>('/compta/facture/fapi/standing_orders.php', { id })
      const bonRef = new Map((d.history ?? []).map((h) => [String(h.id ?? h.rowid), h.bon_ref ?? h.ref ?? '']))
      return (d.orders ?? []).map((o) => ({
        requestDate: o.date ?? o.request_date ?? '',
        user: o.user_name || o.user_login || '',
        amount: String(o.amount ?? ''),
        ref: bonRef.get(String(o.id ?? o.rowid)) ?? '',
        processDate: o.processed_date ?? '',
      }))
    },
    enabled: !!id,
  })
}

// --- Events/Agenda (read-only) -------------------------------------------

// The Events/Agenda tab's badge: how many events the invoice has, from
// compta/sales/api/agenda.php (a few hundred bytes). The tab itself reads
// compta/facture/fapi/agenda.php below, which also has its "Created by /
// Validated by / Creation date" block.
// The classic card's own agenda answer (compta/sales/api/agenda.php, session JSON). compta/facture/fapi/agenda.php answers
// no events for invoices that have some (e.g. invoice 22: 0 there, 2 here), so it is read when the fapi has none.
interface ClassicAgendaEvent {
  id: string
  label: string
  type: string
  date: string
  date_end: string
  percent: string
  note: string
  user: string
}

async function fetchClassicInvoiceAgenda(id: string): Promise<{ count: number; events: ClassicAgendaEvent[] }> {
  const res = await fetch(`/compta/sales/api/agenda.php?facid=${encodeURIComponent(id)}`, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  const data = await parseLegacyJson<{ success?: boolean; count?: number; events?: ClassicAgendaEvent[] }>(res)
  return { count: Number(data.count) || 0, events: data.events ?? [] }
}

export function useInvoiceAgendaCount(id: string | undefined) {
  return useQuery<number>({
    queryKey: ['invoices', 'detail', id, 'agendaCount'],
    queryFn: async () => {
      const count = (await fapiGet<{ count?: number; events?: unknown[] }>('/compta/facture/fapi/agenda.php', { id })).count ?? 0
      return count > 0 ? count : (await fetchClassicInvoiceAgenda(id ?? '')).count
    },
    enabled: !!id,
  })
}

export interface AgendaEventRow {
  ref: string
  url: string
  date: string
  owner: string
  label: string
  relatedObjectRef: string
  relatedObjectUrl: string
  statusLabel: string
}

export interface InvoiceAgendaPageData {
  createdBy: string
  creationDate: string
  latestModificationDate: string
  validatedBy: string
  validationDate: string
  closingDate: string
  zraMessage: string
  timezone: string
  events: AgendaEventRow[]
}

// A classic agenda event in the tab's row shape: its status column is the event's percent, as the classic card prints it.
const classicEvent = (e: ClassicAgendaEvent): AgendaEventRow => ({
  ref: e.id,
  url: '',
  date: e.date,
  owner: e.user,
  label: e.label,
  relatedObjectRef: '',
  relatedObjectUrl: '',
  statusLabel: e.percent !== '' ? `${e.percent}%` : '',
})

export function useInvoiceAgenda(id: string | undefined) {
  return useQuery<InvoiceAgendaPageData>({
    queryKey: ['invoices', 'detail', id, 'agenda'],
    queryFn: async () => {
      const agenda = await fetchInvoiceAgenda(Number(id))
      const mapEvent = (event: InvoiceAgendaEvent): AgendaEventRow => ({
        ref: event.ref,
        url: event.url,
        date: event.date,
        owner: event.owner,
        label: event.label,
        relatedObjectRef: event.related_object_ref,
        relatedObjectUrl: event.related_object_url,
        statusLabel: event.status_label,
      })
      return {
        createdBy: agenda.created_by,
        creationDate: agenda.creation_date,
        latestModificationDate: agenda.latest_modification_date,
        validatedBy: agenda.validated_by,
        validationDate: agenda.validation_date,
        closingDate: agenda.closing_date ?? '',
        zraMessage: '',
        timezone: '',
        events: agenda.events.length > 0 ? agenda.events.map(mapEvent) : (await fetchClassicInvoiceAgenda(String(id))).events.map(classicEvent),
      }
    },
    enabled: !!id,
  })
}
