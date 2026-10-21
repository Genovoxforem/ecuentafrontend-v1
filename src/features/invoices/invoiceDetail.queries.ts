import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { parseLegacyJson } from '../../shared/legacyHtmlFetch'
import { htmlToText } from '../../shared/htmlToText'
import type { InvoiceNotes } from './invoiceTypes'
import type { ContactRow, ContactFormOptions } from '../salesOrders/orderExtraTabTypes'
import { fetchInvoiceAgenda, type InvoiceAgendaEvent } from '../../api/invoices'
import { fapi } from '../../api/axios'
import { requireJson } from '../salesOrders/orderApi'

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
      const res = await fetch(`/compta/sales/api/notes.php?facid=${id}`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const json = await parseLegacyJson<{ success: boolean; error?: string; note_public?: string | null; note_private?: string | null }>(res)
      if (!json.success) throw new Error(json.error || 'Could not load the notes.')
      return {
        notePublic: htmlToText(json.note_public),
        notePrivate: htmlToText(json.note_private),
        notePublicEditUrl: '',
        notePrivateEditUrl: '',
        rawPublic: json.note_public ?? '',
        rawPrivate: json.note_private ?? '',
      }
    },
    enabled: !!id,
  })
}

export function useUpdateInvoiceNote(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ notePublic, notePrivate }: { notePublic: string; notePrivate: string }) => {
      const body = new URLSearchParams({ action: 'save', facid: id ?? '', note_public: notePublic, note_private: notePrivate })
      const res = await fetch('/compta/sales/api/notes.php', { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const json = await parseLegacyJson<{ success: boolean; error?: string }>(res)
      if (!json.success) throw new Error(json.error || 'Could not save the note.')
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

// Real ajax contract read verbatim from card.php's own inline
// fnupdatezrainvoice(ref) script (POST /quicklinks_ajax.php,
// type=getzraresponseinvoice&cisInvcNo=<ref>; the real success handler does
// `window.location.href = '/compta/sales/card.php?facid=' + ref`, so `ref`
// is this invoice's own facid, not a ZRA-side reference). Confirmed live:
// the function is defined on every invoice's card.php but isn't wired to
// any visible button on this backend build — refetching the invoice detail
// query below is this app's equivalent of the real handler's page reload.
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
  rowid: string | number
  date: string
  amount: string
  processed_date: string
  user_name?: string
  user_login?: string
  bon_ref?: string
}

export function useInvoiceStandingOrders(id: string | undefined) {
  return useQuery<StandingOrderRow[]>({
    queryKey: ['invoices', 'detail', id, 'standingOrders'],
    queryFn: async () => {
      const res = await fetch(`/compta/sales/api/standingorders.php?facid=${id}`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const json = await parseLegacyJson<{ success: boolean; error?: string; orders?: RawStandingOrder[]; history?: RawStandingOrder[] }>(res)
      if (!json.success) throw new Error(json.error || 'Could not load the direct debit orders.')
      const bonRef = new Map((json.history ?? []).map((h) => [String(h.rowid), h.bon_ref ?? '']))
      return (json.orders ?? []).map((o) => ({
        requestDate: o.date,
        user: o.user_name || o.user_login || '',
        amount: o.amount,
        ref: bonRef.get(String(o.rowid)) ?? '',
        processDate: o.processed_date,
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
export function useInvoiceAgendaCount(id: string | undefined) {
  return useQuery<number>({
    queryKey: ['invoices', 'detail', id, 'agendaCount'],
    queryFn: async () => {
      const res = await fetch(`/compta/sales/api/agenda.php?facid=${id}`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const json = await parseLegacyJson<{ success: boolean; error?: string; count?: number; events?: unknown[] }>(res)
      if (!json.success) throw new Error(json.error || 'Could not load the events.')
      return json.count ?? json.events?.length ?? 0
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
        events: agenda.events.map(mapEvent),
      }
    },
    enabled: !!id,
  })
}
