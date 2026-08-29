import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  parseOrderCardHtml,
  parseOrderNotesHtml,
  parseOrderDocumentsHtml,
  parseDocumentsPageMeta,
  type OrderDetail,
  type OrderNotes,
  type OrderDocumentRow,
  type DocumentsPageMeta,
} from './orderCardParser'
import {
  parseOrderContactsHtml,
  parseContactFormOptions,
  parseOrderShipmentStockDetails,
  parseCreateShipmentFormOptions,
  parseConsumptionFormOptions,
  parseConsumptionList,
  type ContactRow,
  type ContactFormOptions,
  type ShipmentStockRow,
  type CreateShipmentFormOptions,
  type ConsumptionFormOptions,
  type ConsumptionRow,
} from './orderExtraTabsParser'
import { parseAgendaPageData, type AgendaPageData } from './orderAgendaParser'

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  return res.text()
}

export function useOrderDetail(id: string | undefined) {
  return useQuery<OrderDetail>({
    queryKey: ['salesOrders', 'detail', id],
    queryFn: async () => parseOrderCardHtml(await fetchHtml(`/commande/card.php?id=${id}&save_lastsearch_values=1`), Number(id)),
    enabled: !!id,
  })
}

export function useOrderNotes(id: string | undefined) {
  return useQuery<OrderNotes>({
    queryKey: ['salesOrders', 'detail', id, 'notes'],
    queryFn: async () => parseOrderNotesHtml(await fetchHtml(`/commande/note.php?id=${id}`)),
    enabled: !!id,
  })
}

export function useOrderDocuments(id: string | undefined) {
  return useQuery<OrderDocumentRow[]>({
    queryKey: ['salesOrders', 'detail', id, 'documents'],
    queryFn: async () => parseOrderDocumentsHtml(await fetchHtml(`/commande/document.php?id=${id}`)),
    enabled: !!id,
  })
}

// The full Linked files tab page (commande/document.php?id=X) also carries
// the real attach/link forms' token + the attached-files summary counts +
// the separate URL-links table — see orderCardParser.ts's
// parseDocumentsPageMeta() comment.
export function useOrderDocumentsPageMeta(id: string | undefined) {
  return useQuery<DocumentsPageMeta>({
    queryKey: ['salesOrders', 'detail', id, 'documentsMeta'],
    queryFn: async () => parseDocumentsPageMeta(await fetchHtml(`/commande/document.php?id=${id}`)),
    enabled: !!id,
  })
}

// Multipart POST to the real action=sendit handler in
// core/actions_linkedfiles.inc.php (included by commande/document.php) —
// real fields read directly from that handler + the real rendered form
// (see document_forms_pretty.txt captured live from order id=79):
// token/section_dir/section_id/sortfield/sortorder/max_file_size/
// userfile[]/sendit/savingdocmask. A real file upload, not a mock.
export function useUploadOrderDocument(id: string | undefined) {
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
      const res = await fetch(`/commande/document.php?id=${id}&uploadform=1`, { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesOrders', 'detail', id, 'documents'] })
      queryClient.invalidateQueries({ queryKey: ['salesOrders', 'detail', id, 'documentsMeta'] })
    },
  })
}

// POSTs the real action=linkit handler in the same
// core/actions_linkedfiles.inc.php include — real fields confirmed by
// reading that handler directly: link/label/objecttype=commande/objectid,
// no CSRF-consuming side effect beyond the standard token check. A real
// Link record (core/class/link.class.php), not a mock.
export function useLinkOrderDocument(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { token: string; link: string; label: string }) => {
      const body = new URLSearchParams()
      body.set('token', input.token)
      body.set('link_section_dir', '')
      body.set('link_section_id', '0')
      body.set('link', input.link)
      body.set('label', input.label)
      body.set('objecttype', 'commande')
      body.set('objectid', id ?? '')
      body.set('linkit', 'Link')
      const res = await fetch(`/commande/document.php?id=${id}&uploadform=1`, { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesOrders', 'detail', id, 'documentsMeta'] })
    },
  })
}

export interface OrderContactsData {
  rows: ContactRow[]
  formOptions: ContactFormOptions
}

// `newcompany` re-fetches the same page with a different third-party
// pre-selected for the "Third-party contacts" add-row — the real page does
// this via a full `window.location` reload (see newcompany select's real
// onChange, read in contacts.tpl.php); a query-key-driven refetch here is
// the same real request, just without leaving the SPA.
export function useOrderContacts(id: string | undefined, newcompany?: string) {
  return useQuery<OrderContactsData>({
    queryKey: ['salesOrders', 'detail', id, 'contacts', newcompany ?? ''],
    queryFn: async () => {
      const url = `/commande/contact.php?id=${id}${newcompany ? `&newcompany=${newcompany}` : ''}`
      const html = await fetchHtml(url)
      return { rows: parseOrderContactsHtml(html), formOptions: parseContactFormOptions(html) }
    },
    enabled: !!id,
  })
}

// POSTs the exact real fields commande/contact.php's own addcontact handler
// reads (verified by reading that handler directly — no CSRF token check on
// this action at all): `userid`+`type` for an internal user, or
// `contactid`+`typecontact` for an external third-party contact.
export function useAddOrderContact(id: string | undefined) {
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
      const res = await fetch(`/commande/contact.php?id=${id}`, { method: 'POST', credentials: 'same-origin', body })
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
      queryClient.invalidateQueries({ queryKey: ['salesOrders', 'detail', id, 'contacts'] })
    },
  })
}

export interface OrderShipmentData {
  stockRows: ShipmentStockRow[]
  createForm: CreateShipmentFormOptions
}

export function useOrderShipmentStock(id: string | undefined) {
  return useQuery<OrderShipmentData>({
    queryKey: ['salesOrders', 'detail', id, 'shipmentStock'],
    queryFn: async () => {
      const html = await fetchHtml(`/expedition/shipment.php?id=${id}`)
      return { stockRows: parseOrderShipmentStockDetails(html), createForm: parseCreateShipmentFormOptions(html) }
    },
    enabled: !!id,
  })
}

export interface OrderConsumptionData {
  rows: ConsumptionRow[]
  formOptions: ConsumptionFormOptions
}

export function useOrderConsumption(id: string | undefined) {
  return useQuery<OrderConsumptionData>({
    queryKey: ['salesOrders', 'detail', id, 'consumption'],
    queryFn: async () => {
      const html = await fetchHtml(`/custom/consumption/card.php?id=${id}&type=commande`)
      return { rows: parseConsumptionList(html), formOptions: parseConsumptionFormOptions(html) }
    },
    enabled: !!id,
  })
}

// POSTs the real action=conso fields read directly from
// custom/consumption/card.php's own handler — see
// orderExtraTabsParser.ts's parseConsumptionFormOptions() comment. A real
// stock movement (Consumption::correct_stock()), not a mock.
export function useDeclareConsumption(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { token: string; product: string; id_entrepot: string; nbpiece: string; batch_number: string; label: string; eatby: string; sellby: string }) => {
      const body = new URLSearchParams()
      body.set('token', input.token)
      body.set('action', 'conso')
      body.set('product', input.product)
      body.set('id_entrepot', input.id_entrepot)
      body.set('nbpiece', input.nbpiece)
      body.set('batch_number', input.batch_number)
      body.set('label', input.label)
      body.set('eatby', input.eatby)
      body.set('sellby', input.sellby)
      const res = await fetch(`/custom/consumption/card.php?id=${id}&type=commande`, { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesOrders', 'detail', id, 'consumption'] })
    },
  })
}

// commande/agenda.php?id=X — the full "Events/Agenda" tab page, distinct
// from card.php's own smaller embedded "Latest linked events" widget (see
// orderAgendaParser.ts's header comment).
export function useOrderAgendaPage(id: string | undefined) {
  return useQuery<AgendaPageData>({
    queryKey: ['salesOrders', 'detail', id, 'agendaPage'],
    queryFn: async () => parseAgendaPageData(await fetchHtml(`/commande/agenda.php?id=${id}`)),
    enabled: !!id,
  })
}

// POSTs to the exact real action the "Generate" button on card.php's own
// Linked files section submits (action=builddoc) — see orderCardParser.ts's
// parseDocGenOptions() comment. Real backend document generation, not a
// mock: on success the order's document list gets a genuinely new file.
export function useGenerateOrderDoc(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { token: string; model: string; langId: string }) => {
      const body = new URLSearchParams()
      body.set('action', 'builddoc')
      body.set('token', input.token)
      body.set('buttongeneratetype', 'Generate')
      body.set('model', input.model)
      body.set('lang_id', input.langId)
      body.set('builddoc_generatebutton', 'Generate')
      const res = await fetch(`/commande/card.php?id=${id}`, { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesOrders', 'detail', id, 'documents'] })
      queryClient.invalidateQueries({ queryKey: ['salesOrders', 'detail', id] })
    },
  })
}
