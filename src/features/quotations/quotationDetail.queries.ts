import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { parseQuotationCard, type QuotationCard } from './quotationCardParser'
import { parseQuotationAgenda, type QuotationAgendaData } from './quotationAgendaParser'
// comm/propal/contact.php and comm/propal/document.php render the exact
// same generic Dolibarr templates (core/tpl/contacts.tpl.php,
// core/tpl/document_actions_post_headers.tpl.php) Purchase/Sales Orders'
// own contact.php and document.php already do — confirmed by reading the
// real propal contact.php/document.php source directly (both `@include
// .../contacts.tpl.php` and `.../document_actions_post_headers.tpl.php`).
// Reused here rather than duplicated, since these parse the shared
// template's output, not anything order-specific.
import {
  parseOrderContactsHtml,
  parseContactFormOptions,
  type ContactRow,
  type ContactFormOptions,
} from '../salesOrders/orderExtraTabsParser'
import { parseOrderDocumentsHtml, parseDocumentsPageMeta, type OrderDocumentRow, type DocumentsPageMeta } from '../salesOrders/orderCardParser'

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  return res.text()
}

export function useQuotationCard(id: string | undefined) {
  return useQuery<QuotationCard>({
    queryKey: ['quotations', 'detail', id],
    queryFn: async () => parseQuotationCard(await fetchHtml(`/comm/propal/card.php?id=${id}`), Number(id)),
    enabled: !!id,
  })
}

function invalidateDetail(queryClient: ReturnType<typeof useQueryClient>, id: string | undefined) {
  queryClient.invalidateQueries({ queryKey: ['quotations', 'detail', id] })
  queryClient.invalidateQueries({ queryKey: ['quotations', 'list'] })
}

// Real, clean JSON action — comm/propal/api/proposal_handler.php's own
// `action=validate` (confirmed by reading handleValidateProposal() directly:
// a plain GETPOST('id') + $proposal->valid($user), no CSRF token check).
// Unlike Purchase Orders, Quotations' create-flow API also covers this one
// simple status transition, so it's used here instead of scraping card.php.
export function useValidateQuotation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axios.get<{ success?: boolean; error?: string }>('/comm/propal/api/proposal_handler.php', {
        params: { action: 'validate', id },
        validateStatus: () => true,
      })
      if (data.error) throw new Error(data.error)
    },
    onSuccess: (_data, id) => invalidateDetail(queryClient, id),
  })
}

// ReOpen / Classify Billed — real `?id=X&action=Y` GETs on card.php itself
// (read directly from its action-buttons block). Classify Billed carries no
// CSRF token check in that source; ReOpen's real button now submits through
// a modal (`action=confirm_reopen&confirm=yes&token=X`) — replicated with a
// freshly scraped token, same as Purchase Orders' Delete.
export function useClassifyBilledQuotation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, socid }: { id: string; socid: number | null }) => {
      await fetchHtml(`/comm/propal/card.php?id=${id}&action=classifybilled&socid=${socid ?? ''}`)
    },
    onSuccess: (_data, { id }) => invalidateDetail(queryClient, id),
  })
}

async function scrapeToken(id: string): Promise<string> {
  const html = await fetchHtml(`/comm/propal/card.php?id=${id}`)
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return doc.querySelector('#reopen-form input[name="token"]')?.getAttribute('value') ?? ''
}

export function useReopenQuotation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const token = await scrapeToken(id)
      const body = new URLSearchParams({ token, action: 'confirm_reopen', confirm: 'yes' })
      const res = await fetch(`/comm/propal/card.php?id=${id}`, { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
    },
    onSuccess: (_data, id) => invalidateDetail(queryClient, id),
  })
}

// "Close as Accepted/Refused" — the real decision step for a Validated
// quotation (statut===1): sets it to Signed(2) or NotSigned(3). Read
// directly from the real #closeasconfirmModal form.
export function useCloseAsQuotation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, statut, notePrivate }: { id: string; statut: '2' | '3'; notePrivate: string }) => {
      const html = await fetchHtml(`/comm/propal/card.php?id=${id}`)
      const doc = new DOMParser().parseFromString(html, 'text/html')
      const token = doc.querySelector('#closeas-form input[name="token"]')?.getAttribute('value') ?? ''
      const body = new URLSearchParams({ token, action: 'confirm_closeas', confirm: 'yes', statut, note_private: notePrivate })
      const res = await fetch(`/comm/propal/card.php?id=${id}`, { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
    },
    onSuccess: (_data, { id }) => invalidateDetail(queryClient, id),
  })
}

// Clone (`action=confirm_clone`) redirects to the new cloned quotation's own
// card.php?id=NEW_ID on success — `fetch` follows that redirect
// automatically, so the new id is read back out of the final `res.url`.
// The real modal also lets picking a different customer to clone into;
// simplified here to always clone into the same customer, same
// simplification already made for Purchase Orders' own Clone.
export function useCloneQuotation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, socid }: { id: string; socid: number | null }) => {
      const html = await fetchHtml(`/comm/propal/card.php?id=${id}`)
      const doc = new DOMParser().parseFromString(html, 'text/html')
      const token = doc.querySelector('#clone-form input[name="token"]')?.getAttribute('value') ?? ''
      const body = new URLSearchParams({ token, action: 'confirm_clone', object: 'propal', confirm: 'yes', socid: String(socid ?? '') })
      const res = await fetch(`/comm/propal/card.php?id=${id}`, { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const newIdMatch = res.url.match(/[?&]id=(\d+)/)
      return newIdMatch ? newIdMatch[1] : null
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quotations', 'list'] }),
  })
}

export function useDeleteQuotation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const html = await fetchHtml(`/comm/propal/card.php?id=${id}`)
      const doc = new DOMParser().parseFromString(html, 'text/html')
      const token = doc.querySelector('#delete-form input[name="token"]')?.getAttribute('value') ?? ''
      const body = new URLSearchParams({ token, action: 'confirm_delete', confirm: 'yes' })
      const res = await fetch(`/comm/propal/card.php?id=${id}`, { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quotations', 'list'] }),
  })
}

// Real doc-gen contract — same generic Dolibarr FormFile mechanism already
// used for Warehouses/Purchase Orders, posted to this page's own URL.
export function useGenerateQuotationDoc(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { token: string; model: string; langId: string }) => {
      const body = new URLSearchParams()
      body.set('action', 'builddoc')
      body.set('token', input.token)
      body.set('model', input.model)
      body.set('lang_id', input.langId)
      body.set('builddoc_generatebutton', 'Generate')
      const res = await fetch(`/comm/propal/card.php?id=${id}`, { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations', 'detail', id] })
    },
  })
}

// A page-wide CSRF token is embedded in every real page's own <meta
// name="anti-csrf-newtoken"> tag (confirmed live — the same value as every
// hidden `name="token"` input on that same page), so any already-fetched
// page can supply a fresh token for a same-origin POST rather than needing
// a dedicated token-only endpoint.
function scrapePageToken(doc: Document): string {
  return doc.querySelector('meta[name="anti-csrf-newtoken"]')?.getAttribute('content') ?? ''
}

// --- Contacts/Addresses tab (comm/propal/contact.php) ---------------------

export interface QuotationContactsData {
  rows: ContactRow[]
  formOptions: ContactFormOptions
}

export function useQuotationContacts(id: string | undefined, newcompany?: string) {
  return useQuery<QuotationContactsData>({
    queryKey: ['quotations', 'detail', id, 'contacts', newcompany ?? ''],
    queryFn: async () => {
      const url = `/comm/propal/contact.php?id=${id}${newcompany ? `&newcompany=${newcompany}` : ''}`
      const html = await fetchHtml(url)
      return { rows: parseOrderContactsHtml(html), formOptions: parseContactFormOptions(html) }
    },
    enabled: !!id,
  })
}

// Identical real contract to Sales/Purchase Orders' own add-contact
// mutations (all post action=addcontact to their own contact.php, no CSRF
// token check on this action — confirmed by reading comm/propal/contact.php's
// own handler directly), just targeting the quotation page.
export function useAddQuotationContact(id: string | undefined) {
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
      const res = await fetch(`/comm/propal/contact.php?id=${id}`, { method: 'POST', credentials: 'same-origin', body })
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
      queryClient.invalidateQueries({ queryKey: ['quotations', 'detail', id, 'contacts'] })
    },
  })
}

// --- Notes tab (comm/propal/note.php) --------------------------------------

// core/tpl/notes.tpl.php's real markup (confirmed live): each note's
// current value sits in a `.tagtdremove` div that's the next sibling of the
// `.tagtd` div holding that note's own <label> — not inside an editable
// <textarea> at all in the page's default (non-edit-mode) view. Read
// directly rather than guessed, since the real page only turns a note into
// an editable field after clicking its own pencil icon first.
export interface QuotationNotes {
  notePublic: string
  notePrivate: string
}

function parseQuotationNotes(doc: Document): QuotationNotes {
  function findValue(label: string): string {
    const labelEl = Array.from(doc.querySelectorAll('label.form-label')).find((l) => (l.textContent ?? '').trim() === label)
    const keyDiv = labelEl?.closest('.tagtd')
    const valueDiv = keyDiv?.nextElementSibling
    return (valueDiv?.textContent ?? '').trim()
  }
  return { notePublic: findValue('Note (public)'), notePrivate: findValue('Note (private)') }
}

export function useQuotationNotes(id: string | undefined) {
  return useQuery<QuotationNotes>({
    queryKey: ['quotations', 'detail', id, 'notes'],
    queryFn: async () => {
      const html = await fetchHtml(`/comm/propal/note.php?id=${id}`)
      return parseQuotationNotes(new DOMParser().parseFromString(html, 'text/html'))
    },
    enabled: !!id,
  })
}

// core/actions_setnotes.inc.php's real `setnote_public`/`setnote_private`
// actions (read directly) — note this endpoint is shared with the exact
// same auto-PDF-regeneration call (`$object->generateDocument()`) already
// found to crash on this deployment when saving the PUBLIC note
// specifically (see this session's Create Quotation live-test finding);
// private notes don't trigger that call and aren't affected.
export function useSetQuotationNote(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { field: 'note_public' | 'note_private'; value: string }) => {
      const html = await fetchHtml(`/comm/propal/note.php?id=${id}`)
      const doc = new DOMParser().parseFromString(html, 'text/html')
      const token = scrapePageToken(doc)
      const body = new URLSearchParams({ token, action: input.field === 'note_public' ? 'setnote_public' : 'setnote_private', [input.field]: input.value })
      const res = await fetch(`/comm/propal/note.php?id=${id}`, { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quotations', 'detail', id, 'notes'] }),
  })
}

// --- Linked Files tab (comm/propal/document.php) ---------------------------

export interface QuotationDocumentsData {
  rows: OrderDocumentRow[]
  meta: DocumentsPageMeta
}

export function useQuotationDocuments(id: string | undefined) {
  return useQuery<QuotationDocumentsData>({
    queryKey: ['quotations', 'detail', id, 'documents'],
    queryFn: async () => {
      const html = await fetchHtml(`/comm/propal/document.php?id=${id}`)
      return { rows: parseOrderDocumentsHtml(html), meta: parseDocumentsPageMeta(html) }
    },
    enabled: !!id,
  })
}

export function useUploadQuotationDocument(id: string | undefined) {
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
      const res = await fetch(`/comm/propal/document.php?id=${id}&uploadform=1`, { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations', 'detail', id, 'documents'] })
    },
  })
}

// objecttype='propal' — Propal::$element, read directly from that class.
export function useLinkQuotationDocument(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { token: string; link: string; label: string }) => {
      const body = new URLSearchParams()
      body.set('token', input.token)
      body.set('link_section_dir', '')
      body.set('link_section_id', '0')
      body.set('link', input.link)
      body.set('label', input.label)
      body.set('objecttype', 'propal')
      body.set('objectid', id ?? '')
      body.set('linkit', 'Link')
      const res = await fetch(`/comm/propal/document.php?id=${id}&uploadform=1`, { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations', 'detail', id, 'documents'] })
    },
  })
}

// --- Stock Consumptions tab (custom/consumption/card.php?type=propal) -----

// Real `action=conso` handler (custom/consumption/card.php, read directly):
// product/id_entrepot/nbpiece/label/eatby/sellby/batch_number, redirects
// back to the same page on success (a real GET redirect, not JSON — the
// success/failure signal here is just whether the redirect happened).
// nbpiece's sign is meaningful on the real page itself (negative reduces
// stock, positive corrects/increases it) and is sent through unchanged.
export function useDeclareConsumption(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      productId: string
      warehouseId: string
      qty: number
      label: string
      lotSerial: string
      eatBy?: string
      sellBy?: string
    }) => {
      const body = new URLSearchParams({
        action: 'conso',
        type: 'propal',
        id: id ?? '',
        product: input.productId,
        id_entrepot: input.warehouseId,
        nbpiece: String(input.qty),
        label: input.label,
        batch_number: input.lotSerial,
        eatby: input.eatBy ?? '',
        sellby: input.sellBy ?? '',
      })
      const res = await fetch(`/custom/consumption/card.php?id=${id}&type=propal`, { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quotations', 'detail', id] }),
  })
}

// --- Events/Agenda tab (comm/propal/agenda.php) ----------------------------

export function useQuotationAgenda(id: string | undefined) {
  return useQuery<QuotationAgendaData>({
    queryKey: ['quotations', 'detail', id, 'agenda'],
    queryFn: async () => parseQuotationAgenda(await fetchHtml(`/comm/propal/agenda.php?id=${id}`)),
    enabled: !!id,
  })
}
