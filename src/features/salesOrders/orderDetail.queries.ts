import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fapi } from '../../api/axios'
import axios from 'axios'
import type {
  OrderDetail,
  OrderNotes,
  OrderDocumentRow,
  DocumentsPageMeta,
  ContactRow,
  ContactFormOptions,
  ShipmentStockRow,
  CreateShipmentFormOptions,
  ConsumptionFormOptions,
  ConsumptionRow,
  AgendaPageData,
} from './orderDetail.types'

// All order-detail data/mutations now go through commande/fapi/*.php — the
// pure-JSON layer built on the real Commande business object (valid/
// setDraft/cloture/cancel/classifyBilled/createFromClone/delete,
// generateDocument, add_contact/swapContactStatus/delete_contact,
// update_note, dol_add_file_process/dol_delete_file, Expedition::create,
// Consumption::correct_stock, ActionComm::create, CMailFile) — preserving
// hooks, triggers, stock, accounting and entity/permission isolation. No
// HTML scraping, no CSRF-token extraction, no legacy form posts.

interface FapiEnvelope<T> {
  success: boolean
  data: T
  message: string | null
  errors: unknown
}

async function fapiGet<T>(path: string): Promise<T> {
  const res = await fapi.get<FapiEnvelope<T>>(path)
  const body = res.data
  if (body && body.success === false) throw new Error(body.message || 'Request failed.')
  return body.data
}

async function fapiPost<T>(path: string, payload: unknown): Promise<T> {
  try {
    const res = await fapi.post<FapiEnvelope<T>>(path, payload)
    const body = res.data
    if (body && body.success === false) throw new Error(body.message || 'Request failed.')
    return body.data
  } catch (e) {
    if (axios.isAxiosError(e)) {
      const msg = e.response?.data?.message
      throw new Error(typeof msg === 'string' ? msg : `Backend returned ${e.response?.status ?? 'no response'}.`)
    }
    throw e
  }
}

// For multipart bodies (file upload, email attachments).
async function fapiPostForm<T>(path: string, body: FormData): Promise<T> {
  try {
    const res = await fapi.post<FapiEnvelope<T>>(path, body)
    const payload = res.data
    if (payload && payload.success === false) throw new Error(payload.message || 'Request failed.')
    return payload.data
  } catch (e) {
    if (axios.isAxiosError(e)) {
      const msg = e.response?.data?.message
      throw new Error(typeof msg === 'string' ? msg : `Backend returned ${e.response?.status ?? 'no response'}.`)
    }
    throw e
  }
}

// Shared warehouse dropdown — product/stock/fapi/warehouses.php (entity-
// isolated, stock.lire-checked). Replaces the product/stock/list.php scrape.
export function useWarehouseOptions() {
  return useQuery<{ id: number; ref: string }[]>({
    queryKey: ['warehouses', 'fapiOptions'],
    queryFn: async () => {
      const d = await fapiGet<{ items: { id: number; ref: string; label?: string }[] }>(`/product/stock/fapi/warehouses.php?limit=500`)
      return (d.items ?? []).map((w) => ({ id: w.id, ref: w.ref ?? w.label ?? '' }))
    },
    staleTime: 1000 * 60 * 5,
  })
}

function invalidateOrderDetail(queryClient: ReturnType<typeof useQueryClient>, id: string | undefined) {
  queryClient.invalidateQueries({ queryKey: ['salesOrders', 'detail', id] })
  queryClient.invalidateQueries({ queryKey: ['salesOrders', 'summary'] })
}

async function postOrderAction(id: string | undefined, action: string, extra: Record<string, unknown> = {}) {
  if (!id) throw new Error('Missing order id.')
  return fapiPost<{ id: number }>(`/commande/fapi/actions.php`, { id, action, ...extra })
}

// ------------------------------------------------------------- detail ------
// Maps get.php's native JSON to the OrderDetail shape the components render.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapOrderDetail(d: any, id: number): OrderDetail {
  const legacyCard = `/commande/card.php?id=${id}`
  return {
    id,
    ref: d.ref ?? '',
    refCustomer: d.ref_customer ?? d.ref_client ?? '',
    statusLabel: d.status_label ?? '',
    statusBadgeNumber: typeof d.status_badge === 'number' ? d.status_badge : null,
    thirdPartyName: d.third_party_name ?? d.thirdparty?.name ?? '',
    thirdPartySocid: d.third_party_socid ?? d.thirdparty?.id ?? null,
    projectRef: d.project?.ref ?? '',
    projectLabel: d.project?.label ?? '',
    projectId: d.project?.id ?? null,
    orderDate: d.order_date ?? '',
    plannedDelivery: d.planned_delivery ?? '',
    shippingMethod: d.shipping_method ?? '',
    paymentTerms: d.payment_terms ?? '',
    paymentType: d.payment_type ?? '',
    currencyLabel: d.currency_label ?? '',
    availabilityDelay: d.availability ?? '',
    channel: d.channel ?? '',
    incoterms: d.incoterms ?? '',
    bankAccountLabel: d.bank_account ?? '',
    discountNote: d.discount_note ?? '',
    stockReserveEnabled: d.stock_reserve ? Boolean(d.stock_reserve.enabled) : null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    lines: (d.lines ?? []).map((l: any) => ({
      id: Number(l.id) || 0,
      productId: Number(l.fk_product ?? l.product_id) || 0,
      productRef: l.product_ref ?? '',
      productLabel: l.product_label ?? '',
      description: l.description ?? '',
      qty: Number(l.qty) || 0,
      unitPriceExcl: Number(l.price_ht) || 0,
      unitPriceIncl: Number(l.price_ttc) || 0,
      vatRate: Number(l.tva_tx ?? l.vat_rate) || 0,
      vatCode: l.vat_code ?? '',
      discountPercent: Number(l.remise_percent) || 0,
      costPrice: Number(l.cost_price) || 0,
      totalTtc: Number(l.total_ttc) || 0,
      stockReserve: Number(l.stock_reserve) === 1,
    })),
    totalHt: Number(d.total_ht) || 0,
    totalVat: Number(d.total_vat) || 0,
    totalTtc: Number(d.total_ttc) || 0,
    // Per-field pencils still open the real legacy edit dialogs — an
    // outbound navigation link only, not an HTML integration.
    editUrl: `${legacyCard}&action=modif`,
    refEditUrl: `${legacyCard}&action=editref`,
    refCustomerEditUrl: `${legacyCard}&action=editref_client`,
    projectEditUrl: `${legacyCard}&action=classify`,
    otherOrdersUrl: d.third_party_socid ? `/commande/list.php?socid=${d.third_party_socid}` : '',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    actions: (d.actions ?? []).map((a: any) => ({ label: a.label ?? '', url: a.url ?? '', enabled: a.enabled !== false })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    relatedObjects: (d.related_objects ?? []).map((o: any) => ({
      type: o.type ?? '',
      ref: o.ref ?? '',
      url: '',
      date: o.date ?? '',
      amount: Number(o.amount) || 0,
      statusLabel: o.status_label ?? '',
      linkid: o.linkid ?? null,
    })),
    docGenOptions: {
      modelOptions: d.doc_gen?.models ?? [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      langOptions: (d.doc_gen?.languages ?? []).map((l: any) => ({ value: l.value ?? l.code ?? '', label: l.label ?? l.value ?? '' })),
      defaultLang: d.doc_gen?.default_lang || 'en_US',
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    marginRows: (d.margins ?? []).map((m: any) => ({
      label: m.label ?? '',
      sellingPrice: Number(m.selling ?? m.sellingPrice) || 0,
      costPrice: Number(m.cost ?? m.costPrice) || 0,
      margin: Number(m.margin) || 0,
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    linkedEvents: (d.linked_events ?? []).map((e: any) => ({
      ref: e.ref ?? '',
      url: '',
      date: e.date ?? '',
      by: e.by ?? '',
      type: e.type ?? '',
      title: e.label ?? '',
    })),
    notesBadge: Number(d.badges?.notes) || 0,
    documentsBadge: Number(d.badges?.documents) || 0,
    agendaBadge: Number(d.badges?.agenda) || 0,
  }
}

export function useOrderDetail(id: string | undefined) {
  return useQuery<OrderDetail>({
    queryKey: ['salesOrders', 'detail', id],
    queryFn: async () => mapOrderDetail(await fapiGet(`/commande/fapi/get.php?id=${id}`), Number(id)),
    enabled: !!id,
  })
}

// -------------------------------------------------------------- notes ------
export function useOrderNotes(id: string | undefined) {
  return useQuery<OrderNotes>({
    queryKey: ['salesOrders', 'detail', id, 'notes'],
    queryFn: async () => {
      const d = await fapiGet<{ note_public: string; note_private: string }>(`/commande/fapi/notes.php?id=${id}`)
      return {
        notePublic: d.note_public ?? '',
        notePrivate: d.note_private ?? '',
        notePublicEditUrl: `/commande/note.php?id=${id}&action=editnote_public`,
        notePrivateEditUrl: `/commande/note.php?id=${id}&action=editnote_private`,
      }
    },
    enabled: !!id,
  })
}

// ---------------------------------------------------------- documents ------
interface DocListResponse {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  files: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  links: any[]
  meta: { attached_count: number; total_size: string; saving_doc_mask: string; can_upload: boolean }
}

export function useOrderDocuments(id: string | undefined) {
  return useQuery<OrderDocumentRow[]>({
    queryKey: ['salesOrders', 'detail', id, 'documents'],
    queryFn: async () => {
      const d = await fapiGet<DocListResponse>(`/commande/fapi/documents.php?id=${id}`)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (d.files ?? []).map((f: any) => ({
        name: f.name ?? '',
        url: f.url ?? '',
        size: f.size ?? '',
        date: f.date ?? '',
        deletable: Boolean(d.meta?.can_upload),
      }))
    },
    enabled: !!id,
  })
}

export function useOrderDocumentsPageMeta(id: string | undefined) {
  return useQuery<DocumentsPageMeta>({
    queryKey: ['salesOrders', 'detail', id, 'documentsMeta'],
    queryFn: async () => {
      const d = await fapiGet<DocListResponse>(`/commande/fapi/documents.php?id=${id}`)
      return {
        attachedCount: d.meta?.attached_count ?? 0,
        totalSize: d.meta?.total_size ?? '',
        savingDocMask: d.meta?.saving_doc_mask ?? '',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        links: (d.links ?? []).map((l: any) => ({ id: Number(l.id) || 0, label: l.label ?? '', url: l.url ?? '', date: l.date ?? '' })),
      }
    },
    enabled: !!id,
  })
}

export function useUploadOrderDocument(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { file: File; savingDocMask: string; useMask: boolean }) => {
      const body = new FormData()
      body.set('action', 'upload')
      body.set('id', id ?? '')
      body.append('userfile[]', input.file)
      if (input.useMask) body.set('savingdocmask', input.savingDocMask)
      await fapiPostForm(`/commande/fapi/documents.php`, body)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesOrders', 'detail', id, 'documents'] })
      queryClient.invalidateQueries({ queryKey: ['salesOrders', 'detail', id, 'documentsMeta'] })
    },
  })
}

export function useLinkOrderDocument(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { link: string; label: string }) => {
      await fapiPost(`/commande/fapi/documents.php`, { action: 'link', id, link: input.link, label: input.label })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesOrders', 'detail', id, 'documentsMeta'] })
    },
  })
}

// ----------------------------------------------------------- contacts ------
export interface OrderContactsData {
  rows: ContactRow[]
  formOptions: ContactFormOptions
}

export function useOrderContacts(id: string | undefined, newcompany?: string) {
  return useQuery<OrderContactsData>({
    queryKey: ['salesOrders', 'detail', id, 'contacts', newcompany ?? ''],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d = await fapiGet<any>(`/commande/fapi/contacts.php?id=${id}${newcompany ? `&newcompany=${newcompany}` : ''}`)
      const opts = d.options ?? {}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapRows = (list: any[]): ContactRow[] =>
        list.map((c) => ({
          nature: c.nature_label ?? (c.nature === 'internal' ? 'User' : 'Third-Party Contact'),
          thirdParty: c.thirdparty ?? '',
          contact: c.name ?? '',
          contactType: c.type_label ?? '',
          status: c.status_label ?? '',
        }))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const toOpts = (list: any[], placeholder?: string) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const out = (list ?? []).map((o: any) => ({ value: String(o.value ?? o.id), label: o.label ?? o.name ?? '' }))
        return placeholder ? [{ value: '-1', label: placeholder }, ...out] : out
      }
      const externalContacts = toOpts(opts.company_contacts, 'Select contact')
      return {
        rows: [...mapRows(d.rows?.internal ?? []), ...mapRows(d.rows?.external ?? [])],
        formOptions: {
          issuerCompanyName: opts.issuer_company ?? '',
          internalUserOptions: toOpts(opts.users),
          internalTypeOptions: toOpts(opts.internal_types),
          companyOptions: toOpts(opts.companies),
          selectedCompanyId: String(opts.selected_company ?? ''),
          externalContactOptions: externalContacts,
          hasRealExternalContact: (opts.company_contacts ?? []).length > 0,
          externalTypeOptions: toOpts(opts.external_types),
        },
      }
    },
    enabled: !!id,
  })
}

export function useAddOrderContact(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { source: 'internal' | 'external'; userid?: string; type?: string; contactid?: string; typecontact?: string }) => {
      await fapiPost(`/commande/fapi/contacts.php`, {
        action: 'add',
        id,
        source: input.source,
        userid: input.userid ? Number(input.userid) : undefined,
        type: input.type ? Number(input.type) : undefined,
        contactid: input.contactid ? Number(input.contactid) : undefined,
        typecontact: input.typecontact ? Number(input.typecontact) : undefined,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesOrders', 'detail', id, 'contacts'] })
    },
  })
}

// ---------------------------------------------------------- shipments ------
export interface OrderShipmentData {
  stockRows: ShipmentStockRow[]
  createForm: CreateShipmentFormOptions
}

export function useOrderShipmentStock(id: string | undefined) {
  return useQuery<OrderShipmentData>({
    queryKey: ['salesOrders', 'detail', id, 'shipmentStock'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d = await fapiGet<any>(`/commande/fapi/shipments.php?id=${id}`)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const warehouses = (d.warehouses ?? []).map((w: any) => ({ value: String(w.id), label: w.lieu ? `${w.ref} — ${w.lieu}` : w.ref }))
      return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        stockRows: (d.stock_rows ?? []).map((r: any) => ({
          description: r.description || r.label || r.product_ref || '',
          qtyOrdered: Number(r.qty_ordered) || 0,
          qtyShipped: Number(r.qty_shipped) || 0,
          remainToShip: Number(r.qty_to_ship) || 0,
          realStock: r.real_stock == null ? 0 : Number(r.real_stock),
        })),
        createForm: {
          warehouseOptions: warehouses,
          defaultWarehouseId: d.default_warehouse_id ? String(d.default_warehouse_id) : (warehouses[0]?.value ?? ''),
        },
      }
    },
    enabled: !!id,
  })
}

export interface OrderConsumptionData {
  rows: ConsumptionRow[]
  formOptions: ConsumptionFormOptions
}

// --------------------------------------------------------- consumption -----
export function useOrderConsumption(id: string | undefined) {
  return useQuery<OrderConsumptionData>({
    queryKey: ['salesOrders', 'detail', id, 'consumption'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d = await fapiGet<any>(`/commande/fapi/consumption.php?id=${id}`)
      const opts = d.options ?? {}
      return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rows: (d.rows ?? []).map((r: any) => ({
          ref: String(r.ref ?? r.id ?? ''),
          date: r.date ?? '',
          productRef: r.product_ref ?? '',
          lotSerial: r.lot_serial ?? '',
          warehouse: r.warehouse ?? '',
          invMovCode: r.inv_mov_code ?? '',
          labelOfMovement: r.label_of_movement ?? '',
          origin: r.origin ?? '',
          qty: String(r.qty ?? ''),
        })),
        formOptions: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          warehouseOptions: (opts.warehouses ?? []).map((w: any) => ({ value: String(w.id), label: w.lieu ? `${w.ref} — ${w.lieu}` : w.ref })),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          productOptions: (opts.products ?? []).map((p: any) => ({ value: String(p.id), label: p.label ?? '' })),
          defaultLabel: opts.default_label ?? '',
        },
      }
    },
    enabled: !!id,
  })
}

export function useDeclareConsumption(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { product: string; id_entrepot: string; nbpiece: string; batch_number: string; label: string; eatby: string; sellby: string }) => {
      await fapiPost(`/commande/fapi/consumption.php`, {
        id,
        product: Number(input.product),
        id_entrepot: Number(input.id_entrepot),
        nbpiece: input.nbpiece,
        batch_number: input.batch_number,
        label: input.label,
        eatby: input.eatby,
        sellby: input.sellby,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesOrders', 'detail', id, 'consumption'] })
    },
  })
}

// ------------------------------------------------------------- agenda ------
export function useOrderAgendaPage(id: string | undefined) {
  return useQuery<AgendaPageData>({
    queryKey: ['salesOrders', 'detail', id, 'agendaPage'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d = await fapiGet<any>(`/commande/fapi/agenda.php?id=${id}`)
      return {
        createdBy: d.created_by ?? '',
        creationDate: d.creation_date ?? '',
        latestModificationDate: d.latest_modification_date ?? '',
        validatedBy: d.validated_by ?? '',
        validationDate: d.validation_date ?? '',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        events: (d.events ?? []).map((e: any) => ({
          ref: String(e.ref ?? e.id ?? ''),
          url: e.url ?? '',
          date: e.date ?? '',
          owner: e.owner ?? '',
          label: e.label ?? '',
          relatedObjectRef: e.related_object_ref ?? '',
          relatedObjectUrl: e.related_object_url ?? '',
          statusLabel: e.status_label ?? '',
        })),
      }
    },
    enabled: !!id,
  })
}

// ---------------------------------------------------------- workflow -------
// Each maps to the same Commande business method commande/card.php calls.
export function useRestoreOrderToDraft(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => postOrderAction(id, 'modif'),
    onSuccess: () => invalidateOrderDetail(queryClient, id),
  })
}

export function useValidateOrder(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => postOrderAction(id, 'validate'),
    onSuccess: () => invalidateOrderDetail(queryClient, id),
  })
}

export function useReopenOrder(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => postOrderAction(id, 'reopen'),
    onSuccess: () => invalidateOrderDetail(queryClient, id),
  })
}

export function useClassifyOrderDelivered(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => postOrderAction(id, 'shipped'),
    onSuccess: () => invalidateOrderDetail(queryClient, id),
  })
}

export function useSetOrderBilled(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (billed: boolean) => postOrderAction(id, billed ? 'classifybilled' : 'classifyunbilled'),
    onSuccess: () => invalidateOrderDetail(queryClient, id),
  })
}

export function useCloneOrder(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (socid: number | null) => {
      const d = await postOrderAction(id, 'clone', socid != null ? { socid } : {})
      return d?.id ? String(d.id) : null
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['salesOrders', 'summary'] }),
  })
}

export function useCancelOrder(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => postOrderAction(id, 'cancel'),
    onSuccess: () => invalidateOrderDetail(queryClient, id),
  })
}

export function useDeleteOrder(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => postOrderAction(id, 'delete'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['salesOrders', 'summary'] }),
  })
}

// Unlink a related object (element_link rowid from get.php's related_objects).
export function useRemoveOrderLink(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (linkid: number) => postOrderAction(id, 'dellink', { dellinkid: linkid }),
    onSuccess: () => invalidateOrderDetail(queryClient, id),
  })
}

// POST /commande/fapi/shipments.php — Expedition::create via the same
// per-line {line_id, qty} contract as the legacy idl<i>/qtyl<i> fields.
export function useCreateShipmentFromOrder(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { warehouseId: string; lines: Array<{ lineId: number; qty: number }> }) => {
      if (!id) throw new Error('Missing order id.')
      const d = await fapiPost<{ id: number; ref: string }>(`/commande/fapi/shipments.php`, {
        id,
        warehouse_id: Number(input.warehouseId),
        lines: input.lines.map((l) => ({ line_id: l.lineId, qty: l.qty })),
      })
      return d?.id ? String(d.id) : null
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesOrders', 'detail', id, 'shipmentStock'] })
      invalidateOrderDetail(queryClient, id)
    },
  })
}

// actions.php action=builddoc → Commande::generateDocument (real PDF on disk).
export function useGenerateOrderDoc(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { model: string; langId: string }) => {
      await postOrderAction(id, 'builddoc', { model: input.model, lang_id: input.langId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesOrders', 'detail', id, 'documents'] })
      queryClient.invalidateQueries({ queryKey: ['salesOrders', 'detail', id] })
    },
  })
}

// POST /commande/fapi/agenda.php — ActionComm::create linked via
// fk_element/elementtype='order', same link the legacy form writes.
export interface NewOrderEventInput {
  label: string
  note: string
  fullDay: boolean
  startDate: string // datetime-local value
  endDate: string // datetime-local value, optional
  complete: '-1' | '0' | '50' | '100'
  location: string
}

export function useCreateOrderEvent(id: string | undefined, socid: number | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: NewOrderEventInput) => {
      if (!id) throw new Error('Missing order id.')
      await fapiPost(`/commande/fapi/agenda.php`, {
        id,
        label: input.label,
        note: input.note,
        location: input.location,
        fullday: input.fullDay ? 1 : 0,
        start: input.startDate,
        end: input.endDate || undefined,
        complete: input.complete,
        socid: socid ?? undefined,
      })
    },
    onSuccess: () => {
      invalidateOrderDetail(queryClient, id)
      queryClient.invalidateQueries({ queryKey: ['salesOrders', 'detail', id, 'agendaPage'] })
    },
  })
}
