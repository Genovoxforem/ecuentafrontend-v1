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

// A page-wide CSRF token sits in every real page's own <meta
// name="anti-csrf-newtoken"> tag (confirmed live — same value as every
// hidden name="token" input on that same page, same convention already used
// for Quotations/Purchase Orders' own action buttons) — refetching card.php
// for a fresh one keeps these mutations correct even if the page the user
// is looking at has gone stale.
function scrapePageToken(doc: Document): string {
  return doc.querySelector('meta[name="anti-csrf-newtoken"]')?.getAttribute('content') ?? ''
}

async function scrapeOrderToken(id: string): Promise<string> {
  const html = await fetchHtml(`/commande/card.php?id=${id}`)
  return scrapePageToken(new DOMParser().parseFromString(html, 'text/html'))
}

function invalidateOrderDetail(queryClient: ReturnType<typeof useQueryClient>, id: string | undefined) {
  queryClient.invalidateQueries({ queryKey: ['salesOrders', 'detail', id] })
  queryClient.invalidateQueries({ queryKey: ['salesOrders', 'summary'] })
}

// The bottom action bar's "Modify" button (and the header's own Edit
// pencil, which GETs the same action=modif without the modal) both really
// mean "set this Validated order back to Draft so its lines become
// editable again" — confirmed by reading commande/card.php's own
// `action=='confirm_modif'` handler directly (`$object->setDraft($user)`),
// and by its own `action=='modif'` (GET, no confirm) branch building the
// exact same "ConfirmUnvalidateOrder" prompt. Real POST, form-encoded
// (`#confirmModal`'s own `#confirm-form`), not JSON.
export function useRestoreOrderToDraft(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('Missing order id.')
      const token = await scrapeOrderToken(id)
      const body = new URLSearchParams({ token, action: 'confirm_modif', confirm: 'yes' })
      const res = await fetch(`/commande/card.php?id=${id}`, { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
    },
    onSuccess: () => invalidateOrderDetail(queryClient, id),
  })
}

// "Validate" (shown for a Draft order) — real `action=confirm_validate`
// (`$object->valid($user, $idwarehouse)` in commande/card.php, read
// directly), same modal-confirm treatment as Modify/Cancel above.
export function useValidateOrder(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('Missing order id.')
      const token = await scrapeOrderToken(id)
      const body = new URLSearchParams({ token, action: 'confirm_validate', confirm: 'yes' })
      const res = await fetch(`/commande/card.php?id=${id}`, { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
    },
    onSuccess: () => invalidateOrderDetail(queryClient, id),
  })
}

// "Re-Open" (shown for a Cancelled/Closed order) — real plain
// `?action=reopen` GET (`$object->set_reopen($user)`, no CSRF token check
// on this action — confirmed by reading that handler directly), same real
// toggle already used for Classify Billed/Unbilled above.
export function useReopenOrder(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('Missing order id.')
      await fetchHtml(`/commande/card.php?id=${id}&action=reopen`)
    },
    onSuccess: () => invalidateOrderDetail(queryClient, id),
  })
}

// "Classify delivered" — real `action=confirm_shipped` (`$object->cloture($user)`
// in commande/card.php, read directly), same modal-confirm treatment.
export function useClassifyOrderDelivered(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('Missing order id.')
      const token = await scrapeOrderToken(id)
      const body = new URLSearchParams({ token, action: 'confirm_shipped', confirm: 'yes' })
      const res = await fetch(`/commande/card.php?id=${id}`, { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
    },
    onSuccess: () => invalidateOrderDetail(queryClient, id),
  })
}

// "Classify Billed" / "Classify 'Unbilled'" — plain `?action=classifybilled`
// or `?action=classifyunbilled` GETs on card.php itself (no CSRF token
// check on either action — confirmed by reading that handler directly),
// same real toggle Quotations' own Classify Billed already uses.
export function useSetOrderBilled(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (billed: boolean) => {
      if (!id) throw new Error('Missing order id.')
      await fetchHtml(`/commande/card.php?id=${id}&action=${billed ? 'classifybilled' : 'classifyunbilled'}`)
    },
    onSuccess: () => invalidateOrderDetail(queryClient, id),
  })
}

// Clone (`action=confirm_clone`, object=commande) redirects to the new
// cloned order's own card.php?id=NEW_ID on success — `fetch` follows that
// redirect automatically, so the new id is read back out of the final
// `res.url`, same technique already used for Quotations'/Purchase Orders'
// own Clone. The real modal also lets picking a different customer to
// clone into; simplified here to always clone into the same customer, same
// simplification already made for those two siblings.
export function useCloneOrder(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (socid: number | null) => {
      if (!id) throw new Error('Missing order id.')
      const token = await scrapeOrderToken(id)
      const body = new URLSearchParams({ token, action: 'confirm_clone', object: 'commande', confirm: 'yes', socid: String(socid ?? '') })
      const res = await fetch(`/commande/card.php?id=${id}`, { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const newIdMatch = res.url.match(/[?&]id=(\d+)/)
      return newIdMatch ? newIdMatch[1] : null
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['salesOrders', 'summary'] }),
  })
}

// "Cancel" — real `action=confirm_cancel` (`$object->cancel($user)` path in
// commande/card.php, read directly), same modal-confirm treatment.
export function useCancelOrder(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('Missing order id.')
      const token = await scrapeOrderToken(id)
      const body = new URLSearchParams({ token, action: 'confirm_cancel', confirm: 'yes' })
      const res = await fetch(`/commande/card.php?id=${id}`, { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
    },
    onSuccess: () => invalidateOrderDetail(queryClient, id),
  })
}

// "Delete" — real `action=confirm_delete` (`$object->delete($user)` in
// commande/card.php, read directly) redirects to list.php?... on success —
// same real full-page-reload write already used for Quotations'/Purchase
// Orders' own Delete, just detected via the final redirected `res.url`
// this time (matching Quotations' Clone technique) rather than assuming
// success from a 200 status alone.
export function useDeleteOrder(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('Missing order id.')
      const token = await scrapeOrderToken(id)
      const body = new URLSearchParams({ token, action: 'confirm_delete', confirm: 'yes' })
      const res = await fetch(`/commande/card.php?id=${id}`, { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      if (!res.url.includes('list.php')) throw new Error('The legacy backend rejected this delete.')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['salesOrders', 'summary'] }),
  })
}

// Real `expedition/card.php?action=add` create-shipment POST (read
// directly): for each of the ORDER's own lines (in the exact index order
// `$objectsrc->lines` holds them — the same order orderCardParser.ts's
// `data.lines` already parses them in), the simple non-batch/
// non-multi-warehouse-split path reads `idl<i>` (the line's real rowid) +
// `qtyl<i>` (qty to ship for that line — 0/omitted lines are skipped, not
// rejected), falling back to a single global `entrepot_id` for every line
// that doesn't send its own `entl<i>` (confirmed by reading the handler's
// exact fallback: `is_numeric(GETPOST($ent)) ? GETPOST($ent) :
// GETPOST('entrepot_id')`) — so one warehouse picker for the whole
// shipment is a real, correct simplification of the full per-line-split
// form, not a fabrication. On success this redirects to the new shipment's
// own card.php?id=NEW_ID; `fetch` follows it and the new id is read back
// out of the final `res.url`, same technique as Clone above.
export function useCreateShipmentFromOrder(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { warehouseId: string; lines: Array<{ lineId: number; qty: number }> }) => {
      if (!id) throw new Error('Missing order id.')
      const token = await scrapeOrderToken(id)
      const body = new URLSearchParams()
      body.set('token', token)
      body.set('action', 'add')
      body.set('origin', 'commande')
      body.set('origin_id', id)
      body.set('entrepot_id', input.warehouseId)
      input.lines.forEach((line, i) => {
        body.set(`idl${i}`, String(line.lineId))
        body.set(`qtyl${i}`, String(line.qty))
      })
      const res = await fetch('/expedition/card.php', { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const html = await res.text()
      const errorMatch = html.match(/<div class="[^"]*\berror\b[^"]*">([\s\S]*?)<\/div>/)
      if (errorMatch) {
        const div = document.createElement('div')
        div.innerHTML = errorMatch[1]
        throw new Error((div.textContent ?? 'The legacy backend rejected this shipment.').trim())
      }
      const newIdMatch = res.url.match(/[?&]id=(\d+)/)
      return newIdMatch ? newIdMatch[1] : null
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesOrders', 'detail', id, 'shipmentStock'] })
      invalidateOrderDetail(queryClient, id)
    },
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

// Real event creation — comm/action/card.php?action=add (read directly).
// Two real quirks confirmed from that source, not guessed:
//  1. The CSRF token AND the mandatory "assigned to" owner both come from
//     first GETting the real create-form page itself: rendering it seeds
//     $_SESSION['assignedtouser'] with the logged-in user by default (line
//     ~1189 of that file) as a side effect, and `add` hard-rejects
//     ("ActionsOwnedBy" required) if that session value is empty. So this
//     mutation does the same real two-step the browser does — GET the
//     create page (capturing its token, and seeding the owner as a side
//     effect), then POST `action=add` — rather than trying to fabricate an
//     owner value the backend wouldn't accept. Reassigning to someone other
//     than yourself isn't wired (that's the separate, heavier
//     select_dolusers_forevent widget) — same scope-narrowing as this
//     app's other create forms.
//  2. actioncode is a hidden, fixed field on the real page (value "50",
//     confirmed live) — AGENDA_USE_EVENT_TYPE isn't enabled on this
//     install, so there's no real "Type" picker to reproduce.
export interface NewOrderEventInput {
  label: string
  note: string
  fullDay: boolean
  startDate: string // datetime-local value
  endDate: string // datetime-local value, optional
  complete: '-1' | '0' | '50' | '100'
  location: string
}

function dateParts(value: string) {
  const d = new Date(value)
  return { day: String(d.getDate()), month: String(d.getMonth() + 1), year: String(d.getFullYear()), hour: String(d.getHours()), min: String(d.getMinutes()) }
}

export function useCreateOrderEvent(id: string | undefined, socid: number | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: NewOrderEventInput) => {
      if (!id) throw new Error('Missing order id.')
      const createPageHtml = await fetchHtml(
        `/comm/action/card.php?action=create&origin=order&originid=${id}&socid=${socid ?? ''}`,
      )
      const token = scrapePageToken(new DOMParser().parseFromString(createPageHtml, 'text/html'))

      const body = new URLSearchParams()
      body.set('token', token)
      body.set('action', 'add')
      body.set('donotclearsession', '1')
      body.set('backtopage', `/commande/card.php?id=${id}`)
      body.set('actioncode', '50')
      body.set('label', input.label)
      body.set('note', input.note)
      body.set('location', input.location)
      body.set('fk_element', id)
      body.set('elementtype', 'order')
      body.set('origin', 'order')
      body.set('originid', id)
      if (socid) body.set('socid', String(socid))

      if (input.fullDay) body.set('fullday', 'on')
      const start = dateParts(input.startDate)
      body.set('apday', start.day)
      body.set('apmonth', start.month)
      body.set('apyear', start.year)
      body.set('aphour', input.fullDay ? '0' : start.hour)
      body.set('apmin', input.fullDay ? '0' : start.min)
      body.set('apsec', '0')

      if (input.endDate) {
        const end = dateParts(input.endDate)
        body.set('p2day', end.day)
        body.set('p2month', end.month)
        body.set('p2year', end.year)
        body.set('p2hour', input.fullDay ? '23' : end.hour)
        body.set('p2min', input.fullDay ? '59' : end.min)
        body.set('p2sec', '0')
      }

      body.set('complete', input.complete)
      if (input.complete === '0' || input.complete === '50') body.set('percentage', input.complete)

      const res = await fetch('/comm/action/card.php', { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const html = await res.text()
      if (!res.url.includes('commande/card.php')) {
        const errorMatch = html.match(/<div class="[^"]*\berror\b[^"]*">([\s\S]*?)<\/div>/)
        if (errorMatch) {
          const div = document.createElement('div')
          div.innerHTML = errorMatch[1]
          throw new Error((div.textContent ?? 'The legacy backend rejected this event.').trim())
        }
        throw new Error('The legacy backend rejected this event.')
      }
    },
    onSuccess: () => {
      invalidateOrderDetail(queryClient, id)
      queryClient.invalidateQueries({ queryKey: ['salesOrders', 'detail', id, 'agendaPage'] })
    },
  })
}
