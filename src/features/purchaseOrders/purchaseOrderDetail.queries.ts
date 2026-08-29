import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { parsePurchaseOrderCard, type PurchaseOrderCard } from './purchaseOrderCardParser'
import { parsePurchaseOrderDispatch, type PurchaseOrderDispatchData } from './purchaseOrderDispatchParser'
import { parsePurchaseOrderInfo, type PurchaseOrderInfoData } from './purchaseOrderInfoParser'
// fourn/commande/contact.php and fourn/commande/document.php render the
// exact same generic Dolibarr templates (core/tpl/contacts.tpl.php,
// core/tpl/document_actions_post_headers.tpl.php) Sales Orders' own
// commande/contact.php and commande/document.php already do — confirmed by
// reading both PHP files directly, not assumed. Reused here rather than
// duplicated, since these parse the shared template's output, not anything
// sales-order-specific.
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

export function usePurchaseOrderCard(id: string | undefined) {
  return useQuery<PurchaseOrderCard>({
    queryKey: ['purchaseOrders', 'detail', id],
    queryFn: async () => parsePurchaseOrderCard(await fetchHtml(`/fourn/commande/card.php?id=${id}`), Number(id)),
    enabled: !!id,
  })
}

// Re-Open / Classify Reception / Classify Billed are all plain
// `?id=X&action=Y` GETs on card.php itself in the real page (read directly
// from its action-buttons block) — no request body, no separate JSON
// contract, just a same-origin navigation the real "ReOpen"/"Classify
// Reception"/"Classify Billed" buttons perform. Reproduced here as a GET
// fetch instead of a real navigation so the SPA can re-render the result
// inline rather than losing the app shell.
function useSimpleCardAction(action: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await fetchHtml(`/fourn/commande/card.php?id=${id}&action=${action}`)
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders', 'detail', id] })
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders', 'list'] })
    },
  })
}

export function useReopenPurchaseOrder() {
  return useSimpleCardAction('reopen')
}
export function useClassifyReceptionPurchaseOrder() {
  return useSimpleCardAction('classifyreception')
}
export function useClassifyBilledPurchaseOrder() {
  return useSimpleCardAction('classifybilled')
}

// Delete needs the real per-page CSRF token (`?action=delete&token=X` —
// read directly from card.php's own Delete button href), unlike the 3
// actions above which carry no token check at all in that same source.
// Scraped fresh from the card page's own hidden `token` field right before
// submitting, same as this app's other real-token mutations
// (ThirdPartyCreateForm.tsx's societeToken pattern).
export function useDeletePurchaseOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const html = await fetchHtml(`/fourn/commande/card.php?id=${id}`)
      const doc = new DOMParser().parseFromString(html, 'text/html')
      const token = doc.querySelector('a.butActionDelete')?.getAttribute('href')?.match(/token=([a-f0-9]+)/)?.[1] ?? ''
      await fetchHtml(`/fourn/commande/card.php?id=${id}&action=delete&token=${token}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders', 'list'] })
    },
  })
}

// Clone (`?action=clone&object=order&socid=X`) redirects to the new cloned
// order's own card.php?id=NEW_ID on success (real behavior, confirmed from
// card.php's own clone handling) — `fetch` follows that redirect
// automatically, so the new id is read back out of the final `res.url`
// rather than the response body.
export function useClonePurchaseOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, socid }: { id: string; socid: number | null }) => {
      const res = await fetch(`/fourn/commande/card.php?id=${id}&socid=${socid ?? ''}&action=clone&object=order`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const newIdMatch = res.url.match(/[?&]id=(\d+)/)
      return newIdMatch ? newIdMatch[1] : null
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders', 'list'] })
    },
  })
}

// Real doc-gen contract — same generic Dolibarr FormFile mechanism already
// used for Warehouses (see warehouseExtras.queries.ts's
// useGenerateWarehouseDoc), just posted to this page's own URL instead.
export function useGeneratePurchaseOrderDoc(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { token: string; model: string; langId: string }) => {
      const body = new URLSearchParams()
      body.set('action', 'builddoc')
      body.set('token', input.token)
      body.set('model', input.model)
      body.set('lang_id', input.langId)
      body.set('builddoc_generatebutton', 'Generate')
      const res = await fetch(`/fourn/commande/card.php?id=${id}`, { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders', 'detail', id] })
    },
  })
}

// --- Item Receipts tab (fourn/commande/dispatch.php) ---------------------

export function usePurchaseOrderDispatch(id: string | undefined) {
  return useQuery<PurchaseOrderDispatchData>({
    queryKey: ['purchaseOrders', 'detail', id, 'dispatch'],
    queryFn: async () => parsePurchaseOrderDispatch(await fetchHtml(`/fourn/commande/dispatch.php?id=${id}`)),
    enabled: !!id,
  })
}

// --- Events/Agenda tab (fourn/commande/info.php) --------------------------

export function usePurchaseOrderInfo(id: string | undefined) {
  return useQuery<PurchaseOrderInfoData>({
    queryKey: ['purchaseOrders', 'detail', id, 'info'],
    queryFn: async () => parsePurchaseOrderInfo(await fetchHtml(`/fourn/commande/info.php?id=${id}`)),
    enabled: !!id,
  })
}

// --- Contacts/Addresses tab (fourn/commande/contact.php) ------------------

export interface PurchaseOrderContactsData {
  rows: ContactRow[]
  formOptions: ContactFormOptions
}

// `newcompany` re-fetches the page with a different third-party pre-selected
// for the "Third-party contacts" add-row — same real behavior as Sales
// Orders' useOrderContacts (a full page reload on the real site).
export function usePurchaseOrderContacts(id: string | undefined, newcompany?: string) {
  return useQuery<PurchaseOrderContactsData>({
    queryKey: ['purchaseOrders', 'detail', id, 'contacts', newcompany ?? ''],
    queryFn: async () => {
      const url = `/fourn/commande/contact.php?id=${id}${newcompany ? `&newcompany=${newcompany}` : ''}`
      const html = await fetchHtml(url)
      return { rows: parseOrderContactsHtml(html), formOptions: parseContactFormOptions(html) }
    },
    enabled: !!id,
  })
}

// Identical real contract to Sales Orders' useAddOrderContact (both post
// action=addcontact to their own contact.php, no CSRF token check on this
// action — confirmed by reading fourn/commande/contact.php's own handler
// directly), just targeting the supplier-order page.
export function useAddPurchaseOrderContact(id: string | undefined) {
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
      const res = await fetch(`/fourn/commande/contact.php?id=${id}`, { method: 'POST', credentials: 'same-origin', body })
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
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders', 'detail', id, 'contacts'] })
    },
  })
}

// --- Linked Files tab (fourn/commande/document.php) -----------------------

export interface PurchaseOrderDocumentsData {
  rows: OrderDocumentRow[]
  meta: DocumentsPageMeta
}

export function usePurchaseOrderDocuments(id: string | undefined) {
  return useQuery<PurchaseOrderDocumentsData>({
    queryKey: ['purchaseOrders', 'detail', id, 'documents'],
    queryFn: async () => {
      const html = await fetchHtml(`/fourn/commande/document.php?id=${id}`)
      return { rows: parseOrderDocumentsHtml(html), meta: parseDocumentsPageMeta(html) }
    },
    enabled: !!id,
  })
}

export function useUploadPurchaseOrderDocument(id: string | undefined) {
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
      const res = await fetch(`/fourn/commande/document.php?id=${id}&uploadform=1`, { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders', 'detail', id, 'documents'] })
    },
  })
}

// objecttype='order_supplier' — CommandeFournisseur::$element, read directly
// from that class (not 'commande', which is Sales Orders' own element name).
export function useLinkPurchaseOrderDocument(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { token: string; link: string; label: string }) => {
      const body = new URLSearchParams()
      body.set('token', input.token)
      body.set('link_section_dir', '')
      body.set('link_section_id', '0')
      body.set('link', input.link)
      body.set('label', input.label)
      body.set('objecttype', 'order_supplier')
      body.set('objectid', id ?? '')
      body.set('linkit', 'Link')
      const res = await fetch(`/fourn/commande/document.php?id=${id}&uploadform=1`, { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders', 'detail', id, 'documents'] })
    },
  })
}
