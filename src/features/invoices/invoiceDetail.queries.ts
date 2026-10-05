import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchLegacyDocument, fetchLegacyText } from '../../shared/legacyHtmlFetch'
import {
  parseInvoiceCardHtml,
  parseInvoiceNotesHtml,
  parseInvoiceStandingOrdersHtml,
  parseInvoiceMarginDetails,
  type InvoiceDetail,
  type InvoiceNotes,
  type StandingOrderRow,
  type InvoiceMarginDetails,
  type InvoiceLineRow,
} from './invoiceCardParser'
import { parseOrderContactsHtml, parseContactFormOptions, type ContactRow, type ContactFormOptions } from '../salesOrders/orderExtraTabsParser'
import { parseOrderDocumentsHtml, parseDocumentsPageMeta, type OrderDocumentRow, type DocumentsPageMeta } from '../salesOrders/orderCardParser'
import { parseInvoiceAgendaPage, type InvoiceAgendaPageData } from './invoiceAgendaParser'
import { parseInvoiceLedgerEntryHtml, type InvoiceLedgerEntryData } from './invoiceLedgerEntryParser'

// compta/facture/card.php and its 6 tab pages — the classic, real Dolibarr
// Sales Invoice card, confirmed live on demo.ecuenta.online (invoice
// facid=418: real ref TC1-2607-0108, real header/tabs/fields). This used to
// fetch compta/sales/api/*.php, a custom JSON module built for a different
// page (compta/sales/card.php) that isn't installed on every backend this
// app runs against — confirmed live, real 404s for facid 32 and 418 — and
// even where it does answer, its facid numbering isn't this page's: the
// same facid returned two unrelated invoices between the two. Contacts and
// Linked Files reuse Sales Orders' own parsers (orderExtraTabsParser.ts /
// orderCardParser.ts) rather than duplicating them — confirmed both classic
// pages render the exact same generic Dolibarr templates
// (core/tpl/contacts.tpl.php, core/tpl/document_actions_post_headers.tpl.php)
// Sales Orders' commande/contact.php and commande/document.php already do.

export function useInvoiceDetail(id: string | undefined) {
  return useQuery<InvoiceDetail>({
    queryKey: ['invoices', 'detail', id],
    queryFn: async () => parseInvoiceCardHtml(await fetchLegacyText(`/compta/facture/card.php?facid=${id}`), Number(id)),
    enabled: !!id,
  })
}

// --- Notes -------------------------------------------------------------
// note.php shows read-only content on its bare GET — the real
// pencil-then-form-then-submit mechanism (action=editnote_public/
// editnote_private reveal the real textarea+token, action=setnote_public/
// setnote_private submit it) matches the transaction card's own
// useUpdatePieceHeader pattern in
// generalLedger/pieceCard.queries.ts, not a single always-editable-textarea save.

export function useInvoiceNotes(id: string | undefined) {
  return useQuery<InvoiceNotes>({
    queryKey: ['invoices', 'detail', id, 'notes'],
    queryFn: async () => parseInvoiceNotesHtml(await fetchLegacyText(`/compta/facture/note.php?facid=${id}`)),
    enabled: !!id,
  })
}

export interface InvoiceNoteEditContext {
  token: string
  currentValue: string
}

export function useInvoiceNoteEditContext(id: string | undefined, field: 'public' | 'private' | null) {
  const action = field === 'public' ? 'editnote_public' : field === 'private' ? 'editnote_private' : null
  const fieldName = field === 'public' ? 'note_public' : 'note_private'
  return useQuery<InvoiceNoteEditContext>({
    queryKey: ['invoices', 'detail', id, 'noteEditContext', action],
    queryFn: async () => {
      const doc = await fetchLegacyDocument('/compta/facture/note.php', new URLSearchParams({ facid: id ?? '', action: action ?? '', id: id ?? '' }))
      const token = doc.querySelector<HTMLInputElement>('input[name="token"]')?.value ?? ''
      const currentValue = doc.querySelector<HTMLTextAreaElement>(`textarea[name="${fieldName}"]`)?.value ?? ''
      return { token, currentValue }
    },
    enabled: !!id && !!action,
    staleTime: 1000 * 30,
  })
}

export function useUpdateInvoiceNote(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ field, token, value }: { field: 'public' | 'private'; token: string; value: string }) => {
      const action = field === 'public' ? 'setnote_public' : 'setnote_private'
      const fieldName = field === 'public' ? 'note_public' : 'note_private'
      const body = new URLSearchParams({ token, action, id: id ?? '', [fieldName]: value })
      const res = await fetch('/compta/facture/note.php', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices', 'detail', id, 'notes'] }),
  })
}

// --- Contacts/Addresses --------------------------------------------------

export interface InvoiceContactsData {
  rows: ContactRow[]
  formOptions: ContactFormOptions
}

// `newcompany` re-fetches the same page with a different third-party
// pre-selected for the "Third-party contacts" add-row — same real mechanism
// Sales Orders' own useOrderContacts already uses (see that file's comment):
// the real page does this via a full page reload, a query-key-driven
// refetch here is the same real request without leaving the SPA.
export function useInvoiceContacts(id: string | undefined, newcompany?: string) {
  return useQuery<InvoiceContactsData>({
    queryKey: ['invoices', 'detail', id, 'contacts', newcompany ?? ''],
    queryFn: async () => {
      const html = await fetchLegacyText(`/compta/facture/contact.php?facid=${id}${newcompany ? `&newcompany=${newcompany}` : ''}`)
      return { rows: parseOrderContactsHtml(html), formOptions: parseContactFormOptions(html) }
    },
    enabled: !!id,
  })
}

// POSTs the exact real fields compta/facture/contact.php's own addcontact
// handler reads — the same generic Dolibarr contacts.tpl.php mechanism
// Sales Orders' own useAddOrderContact already verified (see that file's
// comment): `userid`+`type` for an internal user, or `contactid`+
// `typecontact` for an external third-party contact.
export function useAddInvoiceContact(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { source: 'internal' | 'external'; userid?: string; type?: string; contactid?: string; typecontact?: string }) => {
      const body = new URLSearchParams()
      body.set('id', id ?? '')
      body.set('action', 'addcontact')
      body.set('source', input.source)
      if (input.userid) body.set('userid', input.userid)
      if (input.type) body.set('type', input.type)
      if (input.contactid) body.set('contactid', input.contactid)
      if (input.typecontact) body.set('typecontact', input.typecontact)
      const res = await fetch(`/compta/facture/contact.php?facid=${id}`, { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const html = await res.text()
      const errorMatch = html.match(/<div class="[^"]*\berror\b[^"]*">([\s\S]*?)<\/div>/)
      if (errorMatch) {
        const div = document.createElement('div')
        div.innerHTML = errorMatch[1]
        throw new Error((div.textContent ?? 'The legacy backend rejected this contact.').trim())
      }
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

export function useInvoiceStandingOrders(id: string | undefined) {
  return useQuery<StandingOrderRow[]>({
    queryKey: ['invoices', 'detail', id, 'standingOrders'],
    queryFn: async () => parseInvoiceStandingOrdersHtml(await fetchLegacyText(`/compta/facture/prelevement.php?facid=${id}`)),
    enabled: !!id,
  })
}

// --- Linked Files (Documents) ------------------------------------------

export function useInvoiceDocuments(id: string | undefined) {
  return useQuery<OrderDocumentRow[]>({
    queryKey: ['invoices', 'detail', id, 'documents'],
    queryFn: async () => parseOrderDocumentsHtml(await fetchLegacyText(`/compta/facture/document.php?facid=${id}`)),
    enabled: !!id,
  })
}

export function useInvoiceDocumentsPageMeta(id: string | undefined) {
  return useQuery<DocumentsPageMeta>({
    queryKey: ['invoices', 'detail', id, 'documentsMeta'],
    queryFn: async () => parseDocumentsPageMeta(await fetchLegacyText(`/compta/facture/document.php?facid=${id}`)),
    enabled: !!id,
  })
}

// Multipart POST to the real action=sendit handler in
// core/actions_linkedfiles.inc.php (included by compta/facture/document.php,
// the same generic include commande/document.php uses) — same real field
// shape as Sales Orders' own useUploadOrderDocument.
export function useUploadInvoiceDocument(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { token: string; file: File; savingDocMask: string; useMask: boolean }) => {
      const body = new FormData()
      body.set('token', input.token)
      body.set('section_dir', '')
      body.set('section_id', '0')
      body.set('sortfield', '')
      body.set('sortorder', '')
      body.set('max_file_size', '536870912')
      body.set('userfile[]', input.file)
      body.set('sendit', 'Upload')
      if (input.useMask) body.set('savingdocmask', input.savingDocMask)
      const res = await fetch(`/compta/facture/document.php?facid=${id}&uploadform=1`, { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', 'detail', id, 'documents'] })
      queryClient.invalidateQueries({ queryKey: ['invoices', 'detail', id, 'documentsMeta'] })
    },
  })
}

// Same document.php fetch useInvoiceDocuments/useInvoiceDocumentsPageMeta
// already make (own React Query cache entry, matching this codebase's
// existing pattern of independent queries against the same legacy page).
export function useInvoiceMarginDetails(id: string | undefined) {
  return useQuery<InvoiceMarginDetails | null>({
    queryKey: ['invoices', 'detail', id, 'marginDetails'],
    queryFn: async () => parseInvoiceMarginDetails(await fetchLegacyText(`/compta/facture/document.php?facid=${id}`)),
    enabled: !!id,
  })
}

// --- Events/Agenda (read-only) -------------------------------------------

export function useInvoiceAgenda(id: string | undefined) {
  return useQuery<InvoiceAgendaPageData>({
    queryKey: ['invoices', 'detail', id, 'agenda'],
    queryFn: async () => parseInvoiceAgendaPage(await fetchLegacyText(`/compta/facture/agenda.php?id=${id}`)),
    enabled: !!id,
  })
}

// --- Ledger Entry ---------------------------------------------------------

export function useInvoiceLedgerEntries(id: string | undefined) {
  return useQuery<InvoiceLedgerEntryData>({
    queryKey: ['invoices', 'detail', id, 'ledgerEntries'],
    queryFn: async () => parseInvoiceLedgerEntryHtml(await fetchLegacyText(`/compta/facture/ledgerentry.php?facid=${id}`)),
    enabled: !!id,
  })
}
