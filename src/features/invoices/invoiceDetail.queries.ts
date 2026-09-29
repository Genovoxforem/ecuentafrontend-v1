import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchLegacyDocument, fetchLegacyText } from '../../shared/legacyHtmlFetch'
import { parseInvoiceCardHtml, parseInvoiceNotesHtml, parseInvoiceStandingOrdersHtml, type InvoiceDetail, type InvoiceNotes, type StandingOrderRow } from './invoiceCardParser'
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

export function useInvoiceContacts(id: string | undefined) {
  return useQuery<InvoiceContactsData>({
    queryKey: ['invoices', 'detail', id, 'contacts'],
    queryFn: async () => {
      const html = await fetchLegacyText(`/compta/facture/contact.php?facid=${id}`)
      return { rows: parseOrderContactsHtml(html), formOptions: parseContactFormOptions(html) }
    },
    enabled: !!id,
  })
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
