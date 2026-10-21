/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fapiGet, fapiPost } from '../../api/fapiEnvelope'
import { fapi } from '../../api/axios'
import { requireJson } from '../salesOrders/orderApi'
import { mapPurchaseOrderGet, PO_BASE, usePurchaseOrderFormOptions, type PurchaseOrderCardFull } from './purchaseOrderFapi'
import type { PurchaseOrderDispatchData, PurchaseOrderInfoData } from './purchaseOrderTypes'
import type { ContactRow, ContactFormOptions } from '../salesOrders/orderExtraTabTypes'
import type { OrderDocumentRow, DocumentsPageMeta } from '../salesOrders/orderDocumentTypes'

// fourn/commande/fapi/get.php: card, lines, totals, receipt progress and available_actions in one
// call.
export function usePurchaseOrderCard(id: string | undefined) {
  const options = usePurchaseOrderFormOptions()
  return useQuery<PurchaseOrderCardFull>({
    queryKey: ['purchaseOrders', 'detail', id],
    queryFn: async () => mapPurchaseOrderGet(await fapiGet(`${PO_BASE}/get.php`, { id }), Number(id), options.data),
    enabled: !!id,
  })
}

// Every lifecycle step goes through fourn/commande/fapi/actions.php, which re-checks the state and
// the caller's rights itself (the list in get.php is advice, this is the gate).
export type PurchaseOrderLifecycleAction =
  | 'validate'
  | 'approve'
  | 'make_order'
  | 'classify_billed'
  | 'classify_unbilled'
  | 'cancel'
  | 'reopen'
  | 'clone'
  | 'delete'
  | 'classify_received'
  | 'build_doc'

async function postLifecycle<T = { id?: number }>(id: string, action: PurchaseOrderLifecycleAction, extra: Record<string, unknown> = {}) {
  return fapiPost<T>(`${PO_BASE}/actions.php`, { id: Number(id), ...extra }, { action })
}

function invalidatePurchaseOrder(queryClient: ReturnType<typeof useQueryClient>, id?: string) {
  queryClient.invalidateQueries({ queryKey: id ? ['purchaseOrders', 'detail', id] : ['purchaseOrders', 'detail'] })
  queryClient.invalidateQueries({ queryKey: ['purchaseOrders', 'list'] })
}

// Validate and Approve need a warehouse when stock is managed; the form's default is sent.
export function usePurchaseOrderLifecycle() {
  const queryClient = useQueryClient()
  const options = usePurchaseOrderFormOptions()
  return useMutation({
    mutationFn: async ({ id, action, extra }: { id: string; action: PurchaseOrderLifecycleAction; extra?: Record<string, unknown> }) => {
      const warehouse = options.data?.defaults.warehouse_id
      const withWarehouse = (action === 'validate' || action === 'approve') && warehouse ? { warehouse_id: warehouse } : {}
      return postLifecycle(id, action, { ...withWarehouse, ...extra })
    },
    onSuccess: (_data, { id }) => invalidatePurchaseOrder(queryClient, id),
  })
}

// Re-Open and Classify Billed.
function useSimpleCardAction(fapiAction: PurchaseOrderLifecycleAction) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await postLifecycle(id, fapiAction)
    },
    onSuccess: (_data, id) => invalidatePurchaseOrder(queryClient, id),
  })
}

export function useReopenPurchaseOrder() {
  return useSimpleCardAction('reopen')
}
// actions.php?action=classify_received {id, type: tot|par|nev}: sets the reception state without moving stock, as the
// classic button does (receiving goods into a warehouse is dispatch.php).
export function useClassifyReceptionPurchaseOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await postLifecycle(id, 'classify_received', { type: 'tot' })
    },
    onSuccess: (_data, id) => invalidatePurchaseOrder(queryClient, id),
  })
}
export function useClassifyBilledPurchaseOrder() {
  return useSimpleCardAction('classify_billed')
}

export function useDeletePurchaseOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await postLifecycle(id, 'delete')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['purchaseOrders', 'list'] }),
  })
}

// Clone answers the new order's id (the classic page redirects to it instead).
export function useClonePurchaseOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, socid }: { id: string; socid: number | null }): Promise<string | null> => {
      const d = await postLifecycle(id, 'clone', socid ? { socid } : {})
      return d?.id ? String(d.id) : null
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['purchaseOrders', 'list'] }),
  })
}

// actions.php?action=build_doc {model, lang_id}: generates the PDF with the chosen template.
export function useGeneratePurchaseOrderDoc(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { token: string; model: string; langId: string }) => {
      await postLifecycle(id ?? '', 'build_doc', { model: input.model, lang_id: input.langId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders', 'detail', id] })
    },
  })
}

// --- Item Receipts tab (fourn/commande/fapi/dispatch.php) ------------------

export function usePurchaseOrderDispatch(id: string | undefined) {
  return useQuery<PurchaseOrderDispatchData>({
    queryKey: ['purchaseOrders', 'detail', id, 'dispatch'],
    queryFn: async () => {
      const d = await fapiGet<any>(`${PO_BASE}/dispatch.php`, { id })
      const warehouses = (d.warehouses ?? []).map((w: any) => ({ value: String(w.value ?? w.id), label: String(w.label ?? w.ref ?? w.value ?? w.id) }))
      return {
        date: d.order?.date ?? d.date ?? '',
        method: d.order?.method ?? d.method ?? '',
        requestAuthor: d.order?.author ?? d.request_author ?? '',
        receipts: (d.receipts ?? d.dispatched ?? d.rows ?? []).map((r: any) => ({
          receptionRef: String(r.reception_ref ?? r.ref ?? ''),
          receptionUrl: '',
          productRef: String(r.product_ref ?? ''),
          productLabel: String(r.product_label ?? r.label ?? ''),
          creationDate: String(r.date ?? r.datec ?? ''),
          plannedDeliveryDate: String(r.eta ?? r.planned_date ?? ''),
          qtyDispatched: String(r.qty ?? ''),
          warehouse: String(r.warehouse ?? r.warehouse_ref ?? ''),
          comment: String(r.comment ?? ''),
        })),
        warehouses,
        defaultWarehouseId: String(d.default_warehouse_id ?? warehouses[0]?.value ?? ''),
        lines: (d.lines ?? []).map((l: any) => ({
          lineId: Number(l.line_id ?? l.id),
          label: String(l.product_label ?? l.label ?? l.description ?? l.product_ref ?? ''),
          ordered: Number(l.ordered ?? l.qty) || 0,
          received: Number(l.received) || 0,
          remaining: Number(l.remaining) || 0,
          batchTracked: Boolean(l.batch_tracked ?? l.has_batch ?? l.tobatch),
        })),
      }
    },
    enabled: !!id,
  })
}

export interface ReceiveInput {
  lines: Array<{ lineId: number; qty: number; warehouseId: number; batch?: string; eatby?: string; comment?: string }>
}

// POST dispatch.php?action=receive: a multi-line receipt is one transaction, over-receipt is refused,
// and the order moves itself to partially / fully received (status_changed: false if that update failed).
export function useReceivePurchaseOrder(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: ReceiveInput) =>
      fapiPost<{ status_changed?: boolean }>(
        `${PO_BASE}/dispatch.php`,
        {
          id: Number(id),
          lines: input.lines.map((l) => ({ line_id: l.lineId, qty: l.qty, warehouse_id: l.warehouseId, batch: l.batch || undefined, eatby: l.eatby || undefined, comment: l.comment || undefined })),
        },
        { action: 'receive' },
      ),
    onSuccess: () => {
      invalidatePurchaseOrder(queryClient, id)
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders', 'detail', id, 'dispatch'] })
    },
  })
}

// --- Events/Agenda tab (fourn/commande/fapi/agenda.php) ---------------------

export function usePurchaseOrderInfo(id: string | undefined) {
  return useQuery<PurchaseOrderInfoData>({
    queryKey: ['purchaseOrders', 'detail', id, 'info'],
    queryFn: async () => {
      const d = await fapiGet<any>(`${PO_BASE}/agenda.php`, { id })
      return {
        createdBy: d.created_by ?? '',
        creationDate: d.creation_date ?? '',
        latestModificationDate: d.latest_modification_date ?? '',
        validatedBy: d.validated_by ?? '',
        validationDate: d.validation_date ?? '',
        approvedBy: d.approved_by ?? '',
        approvingDate: d.approving_date ?? d.approval_date ?? '',
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

// --- Contacts/Addresses tab (fourn/commande/fapi/contacts.php) --------------

export interface PurchaseOrderContactsData {
  rows: ContactRow[]
  formOptions: ContactFormOptions
}

// `newcompany` re-reads the options with another third-party's contacts pre-selected.
export function usePurchaseOrderContacts(id: string | undefined, newcompany?: string) {
  return useQuery<PurchaseOrderContactsData>({
    queryKey: ['purchaseOrders', 'detail', id, 'contacts', newcompany ?? ''],
    queryFn: async () => {
      const d = await fapiGet<any>(`${PO_BASE}/contacts.php`, { id, newcompany })
      const opts = d.options ?? {}
      const mapRows = (list: any[]): ContactRow[] =>
        list.map((c) => ({
          nature: c.nature_label ?? (c.nature === 'internal' ? 'User' : 'Third-Party Contact'),
          thirdParty: c.thirdparty ?? '',
          contact: c.name ?? '',
          contactType: c.type_label ?? '',
          status: c.status_label ?? '',
        }))
      const toOpts = (list: any[], placeholder?: string) => {
        const out = (list ?? []).map((o: any) => ({ value: String(o.value ?? o.id), label: o.label ?? o.name ?? '' }))
        return placeholder ? [{ value: '-1', label: placeholder }, ...out] : out
      }
      return {
        rows: [...mapRows(d.rows?.internal ?? []), ...mapRows(d.rows?.external ?? [])],
        formOptions: {
          issuerCompanyName: opts.issuer_company ?? '',
          internalUserOptions: toOpts(opts.users),
          internalTypeOptions: toOpts(opts.internal_types),
          companyOptions: toOpts(opts.companies),
          selectedCompanyId: String(opts.selected_company ?? ''),
          externalContactOptions: toOpts(opts.company_contacts, 'Select contact'),
          hasRealExternalContact: (opts.company_contacts ?? []).length > 0,
          externalTypeOptions: toOpts(opts.external_types),
        },
      }
    },
    enabled: !!id,
  })
}

export function useAddPurchaseOrderContact(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { source: 'internal' | 'external'; userid?: string; type?: string; contactid?: string; typecontact?: string }) => {
      const internal = input.source === 'internal'
      await fapiPost(
        `${PO_BASE}/contacts.php`,
        {
          id: Number(id),
          source: input.source,
          ...(internal ? { fk_user: Number(input.userid) } : { fk_socpeople: Number(input.contactid) }),
          type_contact: Number((internal ? input.type : input.typecontact) || 0),
        },
        { action: 'add' },
      )
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['purchaseOrders', 'detail', id, 'contacts'] }),
  })
}

// --- Linked Files tab (fourn/commande/fapi/documents.php) -------------------

export interface PurchaseOrderDocumentsData {
  rows: OrderDocumentRow[]
  meta: DocumentsPageMeta
}

export function usePurchaseOrderDocuments(id: string | undefined) {
  return useQuery<PurchaseOrderDocumentsData>({
    queryKey: ['purchaseOrders', 'detail', id, 'documents'],
    queryFn: async () => {
      const d = await fapiGet<any>(`${PO_BASE}/documents.php`, { id })
      const canEdit = Boolean(d.meta?.can_upload ?? d.meta?.can_edit)
      return {
        rows: (d.files ?? []).map((f: any) => ({ name: f.name ?? '', url: f.url ?? '', size: String(f.size ?? ''), date: f.date ?? '', deletable: canEdit })),
        meta: {
          attachedCount: d.meta?.attached_count ?? (d.files ?? []).length,
          totalSize: d.meta?.total_size ?? '',
          savingDocMask: d.meta?.saving_doc_mask ?? '',
          attachToken: '',
          links: (d.links ?? []).map((l: any) => ({ id: Number(l.id) || 0, label: l.label ?? '', url: l.url ?? '', date: l.date ?? '' })),
        },
      }
    },
    enabled: !!id,
  })
}

export function useUploadPurchaseOrderDocument(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { token: string; file: File; savingDocMask: string; useMask: boolean }) => {
      const body = new FormData()
      body.set('id', id ?? '')
      body.append('userfile[]', input.file)
      if (input.useMask) body.set('savingdocmask', input.savingDocMask)
      const res = requireJson(await fapi.post(`${PO_BASE}/documents.php?action=upload`, body))
      if (res.data?.success === false) throw new Error(res.data.message || 'Upload failed.')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['purchaseOrders', 'detail', id, 'documents'] }),
  })
}

export function useLinkPurchaseOrderDocument(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { token: string; link: string; label: string }) => {
      await fapiPost(`${PO_BASE}/documents.php`, { id: Number(id), link: input.link, label: input.label }, { action: 'link' })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['purchaseOrders', 'detail', id, 'documents'] }),
  })
}

// --- Lines of a draft (fourn/commande/fapi/lines.php) ------------------------
// POST ?action=add|update|delete, draft orders only (the guards answer 409 otherwise). A vendor price can be named
// with supplier_price_id instead of a number: the price, reference, discount and VAT are then read through
// get_buyprice(), the same call the card makes.
export interface PurchaseOrderLineInput {
  description: string
  qty: number
  unitPriceHt: number
  vatRate: number
  discountPercent?: number
  productId?: number
  supplierPriceId?: number
}

export function usePurchaseOrderLines(id: string | undefined) {
  const queryClient = useQueryClient()
  const refresh = () => invalidatePurchaseOrder(queryClient, id)
  const body = (input: PurchaseOrderLineInput) =>
    input.supplierPriceId
      ? { supplier_price_id: input.supplierPriceId, qty: input.qty }
      : {
          ...(input.productId ? { product_id: input.productId } : {}),
          description: input.description,
          qty: input.qty,
          pu_ht: input.unitPriceHt,
          tva_tx: input.vatRate,
          remise_percent: input.discountPercent ?? 0,
        }
  return {
    add: useMutation({ mutationFn: (input: PurchaseOrderLineInput) => fapiPost<any>(`${PO_BASE}/lines.php`, { id: Number(id), ...body(input) }, { action: 'add' }), onSuccess: refresh }),
    update: useMutation({ mutationFn: ({ lineId, ...input }: PurchaseOrderLineInput & { lineId: number }) => fapiPost<any>(`${PO_BASE}/lines.php`, { id: Number(id), line_id: lineId, ...body(input) }, { action: 'update' }), onSuccess: refresh }),
    remove: useMutation({ mutationFn: (lineId: number) => fapiPost<any>(`${PO_BASE}/lines.php`, { id: Number(id), line_id: lineId }, { action: 'delete' }), onSuccess: refresh }),
  }
}
