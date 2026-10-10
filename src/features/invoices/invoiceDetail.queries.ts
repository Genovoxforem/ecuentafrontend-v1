import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchLegacyText, parseLegacyJson } from '../../shared/legacyHtmlFetch'
import { htmlToText } from '../../shared/htmlToText'
import { type InvoiceNotes, type StandingOrderRow, type InvoiceLineRow } from './invoiceCardParser'
import { parseOrderContactsHtml, parseContactFormOptions, type ContactRow, type ContactFormOptions } from '../salesOrders/orderExtraTabsParser'
import { parseInvoiceAgendaPage, type InvoiceAgendaPageData } from './invoiceAgendaParser'

// The invoice page's tabs. The page itself and most tabs read the JSON module
// compta/sales/api/*.php (see salesInvoice.queries.ts / salesInvoiceTabs.queries.ts);
// Notes, Contacts, Direct Debit Orders and the Agenda badge do too, below. The
// Events/Agenda tab still reads compta/facture/agenda.php: it is the only
// source of that tab's "Created by / Validated by / Creation date" block.

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
// compta/sales/api/contacts.php: the bare GET lists the invoice's contacts;
// getcontacttypes / getinternalusers / getcompanies / getexternalcontacts feed
// the add-contact rows; addcontact adds one. Its list formatter builds a
// Societe inside a closure that never imports $db (seen in the backend source),
// so the list can fatal once an invoice has a third-party contact — when the
// answer isn't JSON, the tab falls back to the classic contact.php page.

export interface InvoiceContactsData {
  rows: ContactRow[]
  formOptions: ContactFormOptions
}

const CONTACTS_API = '/compta/sales/api/contacts.php'

interface ApiContact {
  name: string
  role: string
  socname?: string
  status?: number | string
}

async function contactsGet<T>(params: Record<string, string>): Promise<T> {
  const res = await fetch(`${CONTACTS_API}?${new URLSearchParams(params)}`, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  const json = await parseLegacyJson<T & { success: boolean; error?: string }>(res)
  if (!json.success) throw new Error(json.error || 'Could not load the contacts.')
  return json
}

// Dolibarr's element_contact status: 4 = active, 5 = inactive.
const contactStatus = (status: ApiContact['status']) => (Number(status) === 5 ? 'Inactive' : Number(status) === 4 ? 'Active' : '')

async function invoiceContactsFromApi(id: string, newcompany: string | undefined): Promise<InvoiceContactsData> {
  const [list, types, users, companies] = await Promise.all([
    contactsGet<{ internal: ApiContact[]; external: ApiContact[] }>({ facid: id }),
    contactsGet<{ types: { internal: Array<{ id: string; label: string }>; external: Array<{ id: string; label: string }> } }>({ action: 'getcontacttypes', facid: id }),
    contactsGet<{ users: Array<{ id: string; name: string }> }>({ action: 'getinternalusers' }),
    contactsGet<{ companies: Array<{ id: string; name: string }> }>({ action: 'getcompanies' }),
  ])
  const socid = newcompany ?? (await invoiceSocid(id))
  const external = socid ? await contactsGet<{ contacts: Array<{ id: string; name: string }> }>({ action: 'getexternalcontacts', socid }) : { contacts: [] }
  const toRow = (c: ApiContact, nature: string): ContactRow => ({ nature, thirdParty: c.socname ?? '', contact: c.name, contactType: c.role, status: contactStatus(c.status) })
  const opts = <T extends { id: string }>(rows: T[], label: (r: T) => string) => rows.map((r) => ({ value: String(r.id), label: label(r) }))
  // Role and contact lists start with an empty choice, like the classic form's,
  // so picking the first real one registers as a change.
  const blank = { value: '', label: '' }
  return {
    rows: [...list.internal.map((c) => toRow(c, 'User')), ...list.external.map((c) => toRow(c, 'Third-party contact'))],
    formOptions: {
      issuerCompanyName: list.internal[0]?.socname ?? '',
      internalUserOptions: opts(users.users, (u) => u.name),
      internalTypeOptions: [blank, ...opts(types.types.internal, (t) => t.label)],
      companyOptions: opts(companies.companies, (c) => c.name),
      selectedCompanyId: socid ?? '',
      externalContactOptions: [blank, ...opts(external.contacts, (c) => c.name)],
      hasRealExternalContact: external.contacts.length > 0,
      externalTypeOptions: [blank, ...opts(types.types.external, (t) => t.label)],
    },
  }
}

// The invoice's customer, for the third-party contacts row (compta/sales/api/invoice.php).
async function invoiceSocid(id: string): Promise<string | undefined> {
  const res = await fetch(`/compta/sales/api/invoice.php?facid=${id}`, { credentials: 'same-origin' })
  if (!res.ok) return undefined
  const json = await parseLegacyJson<{ success: boolean; invoice?: { socid?: string } }>(res)
  return json.invoice?.socid ? String(json.invoice.socid) : undefined
}

export function useInvoiceContacts(id: string | undefined, newcompany?: string) {
  return useQuery<InvoiceContactsData>({
    queryKey: ['invoices', 'detail', id, 'contacts', newcompany ?? ''],
    queryFn: async () => {
      try {
        return await invoiceContactsFromApi(id ?? '', newcompany)
      } catch (err) {
        if (!(err instanceof SyntaxError)) throw err
        const html = await fetchLegacyText(`/compta/facture/contact.php?facid=${id}${newcompany ? `&newcompany=${newcompany}` : ''}`)
        return { rows: parseOrderContactsHtml(html), formOptions: parseContactFormOptions(html) }
      }
    },
    enabled: !!id,
  })
}

// contacts.php action=addcontact: `contactid` (or `userid` for a user) plus
// `typecontact`, the role id from getcontacttypes.
export function useAddInvoiceContact(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { source: 'internal' | 'external'; userid?: string; type?: string; contactid?: string; typecontact?: string }) => {
      const body = new URLSearchParams({ action: 'addcontact', facid: id ?? '', source: input.source })
      if (input.source === 'internal') {
        body.set('userid', input.userid ?? '')
        body.set('typecontact', input.type ?? '')
      } else {
        body.set('contactid', input.contactid ?? '')
        body.set('typecontact', input.typecontact ?? '')
      }
      const res = await fetch(CONTACTS_API, { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const json = await parseLegacyJson<{ success: boolean; error?: string }>(res)
      if (!json.success) throw new Error(json.error || 'Could not add this contact.')
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

// --- Draft line editing (product add, validate) ---------------------------
// Real contract read directly from the backend's own
// compta/facture/api/invoice_lines_api.php (local source at
// C:\wamp64\www\ecnta10\htdocs\compta\facture\api\invoice_lines_api.php,
// confirmed reachable live via the existing `^/compta(/|$)` proxy rule).
// `action=addLine` is the endpoint's own single-line, immediate-save path —
// simpler and independent of the real page's own client-side
// localStorage-cache-then-batch flow (`action=saveCachedLines`, used by its
// modern_invoice_manager.js), which this app deliberately doesn't replicate.
// Requires the invoice to still be Facture::STATUS_DRAFT server-side (same
// gate this app applies via data.statusBadgeNumber === 0).

// A draft's own real lines are NEVER present in card.php's server-rendered
// HTML — confirmed live: `tr[data-element="facturedet"]` has zero matches
// on a draft with 3 real, already-committed lines. The classic table body
// is replaced wholesale by `<tbody id="lines-tbody-modern">`, populated
// client-side by modern_invoice_manager.js calling this same API's own
// `action=getLines` on page load. So this app reads that action directly
// instead of trying to scrape rows that don't exist server-side for drafts.
function mapApiLineToRow(line: Record<string, unknown>): InvoiceLineRow {
  const qty = Number(line.qty) || 0
  const totalTtc = Number(line.total_ttc) || 0
  const vatRate = Number(line.vat_rate ?? line.tva_tx) || 0
  const productId = Number(line.product_id) > 0 ? String(line.product_id) : null
  return {
    rowid: String(line.rowid ?? ''),
    productId,
    productUrl: productId ? `/product/card.php?id=${productId}` : '',
    label: String(line.product_label || line.description || line.desc || ''),
    lotBatch: String(line.lot_number || ''),
    vatRatePercent: `${vatRate}%`,
    unitPriceExcl: (Number(line.price_ht ?? line.subprice) || 0).toFixed(2),
    unitPriceIncl: (qty > 0 ? totalTtc / qty : 0).toFixed(2),
    qty: String(line.qty ?? ''),
    discountPercent: Number(line.discount_percent) > 0 ? `${line.discount_percent}%` : '',
    totalIncl: totalTtc.toFixed(2),
  }
}

export function useInvoiceDraftLines(id: string | undefined, enabled: boolean) {
  return useQuery<InvoiceLineRow[]>({
    queryKey: ['invoices', 'detail', id, 'draftLines'],
    queryFn: async () => {
      const body = new URLSearchParams()
      body.set('action', 'getLines')
      body.set('invoice_id', id ?? '')
      const res = await fetch('/compta/facture/api/invoice_lines_api.php', { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const json = await res.json()
      const rawLines: Record<string, unknown>[] = json?.data?.lines ?? []
      return rawLines.map(mapApiLineToRow)
    },
    enabled: enabled && !!id,
  })
}

export interface AddInvoiceLineInput {
  token: string
  productId: string
  qty: number
  priceHt: number
  priceTtc: number
  vatRateStr: string
}

export function useAddInvoiceLine(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: AddInvoiceLineInput) => {
      const body = new URLSearchParams()
      body.set('action', 'addLine')
      body.set('token', input.token)
      body.set('invoice_id', id ?? '')
      body.set('product_id', input.productId)
      body.set('qty', String(input.qty))
      body.set('price_ht', String(input.priceHt))
      body.set('price_ttc', String(input.priceTtc))
      body.set('vat_rate', input.vatRateStr)
      body.set('dis_type', '1')
      body.set('discount_percent', '0')
      const res = await fetch('/compta/facture/api/invoice_lines_api.php', { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const text = await res.text()
      let json: { success?: boolean; message?: string }
      try {
        json = JSON.parse(text)
      } catch {
        // Confirmed live: handleAddLine() commits the new line to the DB
        // *before* calling $invoice->generateDocument() to refresh the PDF —
        // and that PDF step can fatal (a real, pre-existing backend bug,
        // DivisionByZeroError in core/modules/facture/doc/pdf_crabe.modules.php
        // line 1919, not something this frontend repo can fix), which
        // corrupts the JSON response despite the line already being saved.
        // Distinguishable message so callers resync from the real invoice
        // instead of treating this the same as a genuine rejection.
        throw new Error('AMBIGUOUS: The backend hit an error regenerating the PDF, but the line may already be saved — refreshing the item table to check.')
      }
      if (!json.success) throw new Error(json.message || 'Could not add this line.')
      return json
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', 'detail', id], exact: true })
      queryClient.invalidateQueries({ queryKey: ['invoices', 'detail', id, 'draftLines'], exact: true })
    },
  })
}

// Real "Select Warehouse" modal's own form (id="warehouse-form") — classic
// POST straight to card.php, same convention as every other real mutation
// in this file. `zravalid` is left blank, matching the real form's own
// default (never populated by anything on this page's own JS either).
export interface ValidateInvoiceDraftInput {
  token: string
  idwarehouse: string
}

export function useValidateInvoiceDraft(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: ValidateInvoiceDraftInput) => {
      const body = new URLSearchParams()
      body.set('token', input.token)
      body.set('action', 'confirm_valid')
      body.set('confirm', 'yes')
      body.set('zravalid', '')
      body.set('idwarehouse', input.idwarehouse)
      const res = await fetch(`/compta/facture/card.php?facid=${id}`, { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const html = await res.text()
      const errorMatch = html.match(/<div class="[^"]*\berror\b[^"]*">([\s\S]*?)<\/div>/)
      if (errorMatch) {
        const div = document.createElement('div')
        div.innerHTML = errorMatch[1]
        throw new Error((div.textContent ?? 'The legacy backend rejected this validation.').trim())
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', 'detail', id], exact: true })
    },
  })
}

// Read-only real product lookup (`/product/ajax/products.php`) used to
// prefill price/VAT once a product is picked from the draft add-line row —
// confirmed live: returns price_ht/price_ttc/tva_tx/default_vat_code for a
// real product id.
export interface ProductPricing {
  priceHt: number
  priceTtc: number
  vatRate: number
  vatCode: string
}

export async function fetchProductPricing(productId: string): Promise<ProductPricing> {
  const res = await fetch(`/product/ajax/products.php?action=fetch&id=${productId}&outjson=1`, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  const json = await res.json()
  return {
    priceHt: Number(json.price_ht) || 0,
    priceTtc: Number(json.price_ttc) || 0,
    vatRate: Number(json.tva_tx) || 0,
    vatCode: json.default_vat_code || '',
  }
}

// --- Direct Debit Orders (standing orders) --------------------------------

// compta/sales/api/standingorders.php (JSON) instead of the 1.25 MB
// compta/facture/prelevement.php page. `orders` is every request on the
// invoice (pending and processed); `history` repeats the processed ones with
// the direct debit order's ref, which the table's "Direct Debit Order" column shows.
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
// compta/sales/api/agenda.php (a few hundred bytes). The tab itself still
// reads agenda.php below, because only that page has its "Created by /
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

export function useInvoiceAgenda(id: string | undefined) {
  return useQuery<InvoiceAgendaPageData>({
    queryKey: ['invoices', 'detail', id, 'agenda'],
    queryFn: async () => parseInvoiceAgendaPage(await fetchLegacyText(`/compta/facture/agenda.php?id=${id}`)),
    enabled: !!id,
  })
}
