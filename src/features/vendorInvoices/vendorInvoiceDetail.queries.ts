/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fapi } from '../../api/axios'
import { fapiPost as post } from '../../api/fapiEnvelope'
import { requireJson } from '../salesOrders/orderApi'
import { fapiGet, mapVendorInvoiceGet, mapVendorInvoiceLedger, VI_BASE } from './vendorInvoiceFapi'
import type { VendorInvoiceDetail, VendorInvoiceContactRow, VendorInvoiceLogData } from './vendorInvoiceTypes'
import type { OrderDocumentRow, DocumentsPageMeta } from '../salesOrders/orderDocumentTypes'
import type { InvoiceLedgerEntryData } from '../invoices/invoiceTypes'

// The vendor invoice card and its tabs, all on fourn/facture/fapi: get.php (header, lines, payments, available
// actions), contacts.php, documents.php, agenda.php, ledger.php and notes.php (the notes tab is the shared
// RecordNotesTab). These endpoints load the invoice through FactureFournisseur::fetch(), so on an instance whose
// llx_facture_fourn lacks the fork's internal_exp column they answer 500 "This instance cannot read any vendor invoice"
// until the ALTER TABLE named in the response is run.

export function useVendorInvoiceDetail(id: string | undefined) {
  return useQuery<VendorInvoiceDetail>({
    queryKey: ['vendorInvoices', 'detail', id],
    queryFn: async () => mapVendorInvoiceGet(await fapiGet(`${VI_BASE}/get.php`, { id }), Number(id)),
    enabled: !!id,
  })
}

// --- Contacts/Addresses --------------------------------------------------

export function useVendorInvoiceContacts(id: string | undefined) {
  return useQuery<VendorInvoiceContactRow[]>({
    queryKey: ['vendorInvoices', 'detail', id, 'contacts'],
    queryFn: async () => {
      const d = await fapiGet<any>(`${VI_BASE}/contacts.php`, { id })
      const rows: any[] = Array.isArray(d.rows) ? d.rows : [...(d.rows?.internal ?? []), ...(d.rows?.external ?? [])]
      return rows.map((c) => ({
        nature: c.nature_label ?? (c.nature === 'internal' ? 'User' : 'Third-Party Contact'),
        thirdParty: c.thirdparty ?? '',
        contact: c.name ?? '',
        contactType: c.type_label ?? '',
        status: c.status_label ?? '',
      }))
    },
    enabled: !!id,
  })
}

// --- Linked Files (Documents) ------------------------------------------

export function useVendorInvoiceDocuments(id: string | undefined) {
  return useQuery<OrderDocumentRow[]>({
    queryKey: ['vendorInvoices', 'detail', id, 'documents'],
    queryFn: async () => {
      const d = await fapiGet<any>(`${VI_BASE}/documents.php`, { id })
      const canEdit = Boolean(d.meta?.can_upload ?? d.meta?.can_edit)
      return (d.files ?? []).map((f: any) => ({ name: f.name ?? '', url: f.url ?? '', size: String(f.size ?? ''), date: f.date ?? '', deletable: canEdit }))
    },
    enabled: !!id,
  })
}

export function useVendorInvoiceDocumentsPageMeta(id: string | undefined) {
  return useQuery<DocumentsPageMeta>({
    queryKey: ['vendorInvoices', 'detail', id, 'documentsMeta'],
    queryFn: async () => {
      const d = await fapiGet<any>(`${VI_BASE}/documents.php`, { id })
      return {
        attachedCount: d.meta?.attached_count ?? (d.files ?? []).length,
        totalSize: d.meta?.total_size ?? '',
        savingDocMask: d.meta?.saving_doc_mask ?? '',
        attachToken: '',
        links: (d.links ?? []).map((l: any) => ({ id: Number(l.id) || 0, label: l.label ?? '', url: l.url ?? '', date: l.date ?? '' })),
      }
    },
    enabled: !!id,
  })
}

export function useUploadVendorInvoiceDocument(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { token: string; file: File; savingDocMask: string; useMask: boolean }) => {
      const body = new FormData()
      body.set('id', id ?? '')
      body.append('userfile[]', input.file)
      if (input.useMask) body.set('savingdocmask', input.savingDocMask)
      const res = requireJson(await fapi.post(`${VI_BASE}/documents.php?action=upload`, body))
      if (res.data?.success === false) throw new Error(res.data.message || 'Upload failed.')
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
    queryFn: async () => {
      const d = await fapiGet<any>(`${VI_BASE}/agenda.php`, { id })
      return {
        createdBy: d.created_by ?? '',
        creationDate: d.creation_date ?? '',
        latestModificationDate: d.latest_modification_date ?? '',
        validatedBy: d.validated_by ?? '',
        validationDate: d.validation_date ?? '',
      }
    },
    enabled: !!id,
  })
}

// --- Ledger Entry ---------------------------------------------------------

export function useVendorInvoiceLedgerEntries(id: string | undefined) {
  return useQuery<InvoiceLedgerEntryData>({
    queryKey: ['vendorInvoices', 'detail', id, 'ledgerEntries'],
    queryFn: async () => mapVendorInvoiceLedger(await fapiGet(`${VI_BASE}/ledger.php`, { id })),
    enabled: !!id,
  })
}

function useRefresh(id: string | undefined) {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['vendorInvoices', 'detail', id] })
    void queryClient.invalidateQueries({ queryKey: ['vendor-invoices'] })
  }
}

// --- Lifecycle (fourn/facture/fapi/actions.php) -----------------------------
// POST actions.php?action=<key>: re-checks the state and the right itself (409 / 403). `key` comes from get.php's
// available_actions, so the buttons never offer one the server would refuse. Row shapes of these three endpoints
// (actions, payments, lines) are read from the reference, not from live data: newecuenta cannot read any vendor
// invoice until llx_facture_fourn.internal_exp exists.
export function useVendorInvoiceAction(id: string | undefined) {
  const refresh = useRefresh(id)
  return useMutation({
    mutationFn: async ({ action, extra }: { action: string; extra?: Record<string, unknown> }) => post<any>(`${VI_BASE}/actions.php`, { id: Number(id), ...extra }, { action }),
    onSuccess: refresh,
  })
}

// --- Payments (fourn/facture/fapi/payments.php) -----------------------------
// ?action=add posts the payment to the bank in one transaction and refuses an amount above what is outstanding unless
// allow_overpay is sent; ?action=delete refuses a payment that is reconciled with a bank line.
export interface VendorPaymentInput {
  amount: number
  date: string
  modeId: number
  accountId: number
  allowOverpay?: boolean
}

export function useVendorInvoicePayments(id: string | undefined) {
  const refresh = useRefresh(id)
  return {
    add: useMutation({
      mutationFn: async (input: VendorPaymentInput) =>
        post<any>(
          `${VI_BASE}/payments.php`,
          { id: Number(id), amount: input.amount, date: input.date, mode_id: input.modeId, payment_mode_id: input.modeId, account_id: input.accountId, fk_account: input.accountId, allow_overpay: input.allowOverpay || undefined },
          { action: 'add' },
        ),
      onSuccess: refresh,
    }),
    remove: useMutation({ mutationFn: async (paymentId: number) => post<any>(`${VI_BASE}/payments.php`, { id: Number(id), payment_id: paymentId }, { action: 'delete' }), onSuccess: refresh }),
  }
}

// --- Lines of a draft (fourn/facture/fapi/lines.php) -------------------------
export interface VendorInvoiceLineInput {
  description: string
  qty: number
  unitPriceHt: number
  vatRate: number
  discountPercent?: number
  productId?: number
}

export function useVendorInvoiceLines(id: string | undefined) {
  const refresh = useRefresh(id)
  const body = (input: VendorInvoiceLineInput) => ({
    ...(input.productId ? { product_id: input.productId } : {}),
    description: input.description,
    qty: input.qty,
    pu_ht: input.unitPriceHt,
    tva_tx: input.vatRate,
    remise_percent: input.discountPercent ?? 0,
  })
  return {
    add: useMutation({ mutationFn: (input: VendorInvoiceLineInput) => post<any>(`${VI_BASE}/lines.php`, { id: Number(id), ...body(input) }, { action: 'add' }), onSuccess: refresh }),
    update: useMutation({ mutationFn: ({ lineId, ...input }: VendorInvoiceLineInput & { lineId: number }) => post<any>(`${VI_BASE}/lines.php`, { id: Number(id), line_id: lineId, ...body(input) }, { action: 'update' }), onSuccess: refresh }),
    remove: useMutation({ mutationFn: (lineId: number) => post<any>(`${VI_BASE}/lines.php`, { id: Number(id), line_id: lineId }, { action: 'delete' }), onSuccess: refresh }),
  }
}
