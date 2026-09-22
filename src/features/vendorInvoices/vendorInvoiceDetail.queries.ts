import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchLegacyDocument, fetchLegacyText } from '../../shared/legacyHtmlFetch'
import { parseVendorInvoiceCardHtml, parseVendorInvoiceContactsHtml, type VendorInvoiceDetail, type VendorInvoiceContactRow } from './vendorInvoiceCardParser'
import { parseVendorInvoiceLog, type VendorInvoiceLogData } from './vendorInvoiceInfoParser'
import { parseOrderDocumentsHtml, parseDocumentsPageMeta, type OrderDocumentRow, type DocumentsPageMeta } from '../salesOrders/orderCardParser'
import { parseInvoiceNotesHtml, type InvoiceNotes } from '../invoices/invoiceCardParser'
import { parseInvoiceLedgerEntryHtml, type InvoiceLedgerEntryData } from '../invoices/invoiceLedgerEntryParser'

// fourn/facture/card.php and its 5 tab pages — the classic, real Dolibarr
// Vendor/Supplier Invoice card, confirmed live on demo.ecuenta.online
// (invoice facid=19: real ref SI2604-0017, real header/tabs/fields). No
// detail page existed for this feature at all before this — see
// vendorInvoiceCardParser.ts's own header comment. Notes reuses the Sales
// Invoice rebuild's own parseInvoiceNotesHtml (identical real markup
// shape, confirmed live) and LedgerEntry reuses its
// parseInvoiceLedgerEntryHtml (byte-for-byte identical table structure,
// confirmed live) rather than duplicating either. Linked Files reuses Sales
// Orders' own parseOrderDocumentsHtml/parseDocumentsPageMeta — confirmed
// document.php here renders the same generic id="tablelines" template.
// Contacts does NOT reuse Sales Orders'/the Sales Invoice's parser — this
// page's real contacts table carries a different class combo (confirmed
// live) — see vendorInvoiceCardParser.ts's own parseVendorInvoiceContactsHtml.

export function useVendorInvoiceDetail(id: string | undefined) {
  return useQuery<VendorInvoiceDetail>({
    queryKey: ['vendorInvoices', 'detail', id],
    queryFn: async () => parseVendorInvoiceCardHtml(await fetchLegacyText(`/fourn/facture/card.php?facid=${id}`), Number(id)),
    enabled: !!id,
  })
}

// --- Notes -------------------------------------------------------------
// Same real pencil-then-form-then-submit mechanism as the Sales Invoice
// rebuild's Notes tab (action=editnote_public/editnote_private reveal the
// real textarea+token, action=setnote_public/setnote_private submit it) —
// confirmed live, identical markup.

export function useVendorInvoiceNotes(id: string | undefined) {
  return useQuery<InvoiceNotes>({
    queryKey: ['vendorInvoices', 'detail', id, 'notes'],
    queryFn: async () => parseInvoiceNotesHtml(await fetchLegacyText(`/fourn/facture/note.php?facid=${id}`)),
    enabled: !!id,
  })
}

export interface VendorInvoiceNoteEditContext {
  token: string
  currentValue: string
}

export function useVendorInvoiceNoteEditContext(id: string | undefined, field: 'public' | 'private' | null) {
  const action = field === 'public' ? 'editnote_public' : field === 'private' ? 'editnote_private' : null
  const fieldName = field === 'public' ? 'note_public' : 'note_private'
  return useQuery<VendorInvoiceNoteEditContext>({
    queryKey: ['vendorInvoices', 'detail', id, 'noteEditContext', action],
    queryFn: async () => {
      const doc = await fetchLegacyDocument('/fourn/facture/note.php', new URLSearchParams({ facid: id ?? '', action: action ?? '', id: id ?? '' }))
      const token = doc.querySelector<HTMLInputElement>('input[name="token"]')?.value ?? ''
      const currentValue = doc.querySelector<HTMLTextAreaElement>(`textarea[name="${fieldName}"]`)?.value ?? ''
      return { token, currentValue }
    },
    enabled: !!id && !!action,
    staleTime: 1000 * 30,
  })
}

export function useUpdateVendorInvoiceNote(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ field, token, value }: { field: 'public' | 'private'; token: string; value: string }) => {
      const action = field === 'public' ? 'setnote_public' : 'setnote_private'
      const fieldName = field === 'public' ? 'note_public' : 'note_private'
      const body = new URLSearchParams({ token, action, id: id ?? '', [fieldName]: value })
      const res = await fetch('/fourn/facture/note.php', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vendorInvoices', 'detail', id, 'notes'] }),
  })
}

// --- Contacts/Addresses --------------------------------------------------

export function useVendorInvoiceContacts(id: string | undefined) {
  return useQuery<VendorInvoiceContactRow[]>({
    queryKey: ['vendorInvoices', 'detail', id, 'contacts'],
    queryFn: async () => parseVendorInvoiceContactsHtml(await fetchLegacyText(`/fourn/facture/contact.php?facid=${id}`)),
    enabled: !!id,
  })
}

// --- Linked Files (Documents) ------------------------------------------

export function useVendorInvoiceDocuments(id: string | undefined) {
  return useQuery<OrderDocumentRow[]>({
    queryKey: ['vendorInvoices', 'detail', id, 'documents'],
    queryFn: async () => parseOrderDocumentsHtml(await fetchLegacyText(`/fourn/facture/document.php?facid=${id}`)),
    enabled: !!id,
  })
}

export function useVendorInvoiceDocumentsPageMeta(id: string | undefined) {
  return useQuery<DocumentsPageMeta>({
    queryKey: ['vendorInvoices', 'detail', id, 'documentsMeta'],
    queryFn: async () => parseDocumentsPageMeta(await fetchLegacyText(`/fourn/facture/document.php?facid=${id}`)),
    enabled: !!id,
  })
}

// Multipart POST to the real action=sendit handler in
// core/actions_linkedfiles.inc.php (included by fourn/facture/document.php,
// the same generic include commande/document.php uses) — same real field
// shape as Sales Orders' own useUploadOrderDocument.
export function useUploadVendorInvoiceDocument(id: string | undefined) {
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
      const res = await fetch(`/fourn/facture/document.php?facid=${id}&uploadform=1`, { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendorInvoices', 'detail', id, 'documents'] })
      queryClient.invalidateQueries({ queryKey: ['vendorInvoices', 'detail', id, 'documentsMeta'] })
    },
  })
}

// --- Log (read-only) -------------------------------------------------------

export function useVendorInvoiceLog(id: string | undefined) {
  return useQuery<VendorInvoiceLogData>({
    queryKey: ['vendorInvoices', 'detail', id, 'log'],
    queryFn: async () => parseVendorInvoiceLog(await fetchLegacyText(`/fourn/facture/info.php?facid=${id}`)),
    enabled: !!id,
  })
}

// --- Ledger Entry ---------------------------------------------------------

export function useVendorInvoiceLedgerEntries(id: string | undefined) {
  return useQuery<InvoiceLedgerEntryData>({
    queryKey: ['vendorInvoices', 'detail', id, 'ledgerEntries'],
    queryFn: async () => parseInvoiceLedgerEntryHtml(await fetchLegacyText(`/fourn/facture/ledgerentry.php?id=${id}`)),
    enabled: !!id,
  })
}
