import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fapi } from '../../api/axios'
import { fapiGet, fapiPost } from '../../api/fapiEnvelope'

// The invoice card's tabs, all on compta/facture/fapi (key-authenticated JSON; the compta/sales/api/* files they replace
// need a PHP session cookie). Every call takes the invoice id as `id`; writes are POST ?action=.
const FAPI = '/compta/facture/fapi'

// --- Linked Files (compta/facture/fapi/documents.php) ---------------------

export interface SalesDocumentFile {
  name: string
  size: string
  date: string
  is_pdf: boolean
  download_url: string
  view_url?: string
  preview_html?: string
}

export interface SalesDocumentLink {
  rowid: string
  label: string
  url: string
  date: string
}

export interface SalesDocumentRelated {
  type_label: string
  ref: string
  url: string
  date: string
  amount_ht: string
  status: string
  ee_rowid: string
}

export interface SalesDocumentsData {
  nb_files: number
  files: SalesDocumentFile[]
  margin: { enabled: boolean; margin_info: string }
  models: { value: string; label: string; selected: boolean }[]
  links: SalesDocumentLink[]
  related: SalesDocumentRelated[]
}

const DOCS = `${FAPI}/documents.php`

interface RawDocuments {
  files?: Array<{ name: string; size_label?: string; size?: number | string; date?: string; is_pdf?: boolean; download_url?: string; view_url?: string }>
  links?: Array<{ id: number | string; label?: string; url?: string; date?: string }>
  related?: Array<Record<string, unknown>>
  models?: Array<{ value: string; label: string; selected?: boolean }>
  meta?: { attached_count?: number }
}

export function useSalesInvoiceDocuments(facid: string | undefined) {
  return useQuery<SalesDocumentsData>({
    queryKey: ['salesInvoice', facid, 'documents'],
    queryFn: async () => {
      const d = await fapiGet<RawDocuments>(DOCS, { id: facid })
      return {
        nb_files: d.meta?.attached_count ?? (d.files ?? []).length,
        files: (d.files ?? []).map((f) => ({ name: f.name, size: f.size_label ?? String(f.size ?? ''), date: f.date ?? '', is_pdf: Boolean(f.is_pdf), download_url: f.download_url ?? '', view_url: f.view_url })),
        margin: { enabled: false, margin_info: '' },
        models: (d.models ?? []).map((m) => ({ value: m.value, label: m.label, selected: Boolean(m.selected) })),
        links: (d.links ?? []).map((l) => ({ rowid: String(l.id), label: l.label ?? '', url: l.url ?? '', date: l.date ?? '' })),
        related: (d.related ?? []).map((r) => ({
          type_label: String(r.type_label ?? r.type ?? ''),
          ref: String(r.ref ?? ''),
          url: String(r.url ?? ''),
          date: String(r.date ?? ''),
          amount_ht: String(r.amount_ht ?? r.total_ht ?? ''),
          status: String(r.status_label ?? r.status ?? ''),
          ee_rowid: String(r.rowid ?? r.ee_rowid ?? r.id ?? ''),
        })),
      }
    },
    enabled: !!facid,
  })
}

function useDocsMutation<I>(facid: string | undefined, run: (input: I) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: run,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['salesInvoice', facid, 'documents'] }),
  })
}

export function useUploadSalesDocument(facid: string | undefined) {
  return useDocsMutation(facid, async (file: File) => {
    const fd = new FormData()
    fd.set('id', facid ?? '')
    fd.set('file', file)
    return fapi.post(DOCS, fd, { params: { action: 'upload' } })
  })
}

export function useDeleteSalesDocument(facid: string | undefined) {
  return useDocsMutation(facid, (name: string) => fapiPost(DOCS, { id: Number(facid), name }, { action: 'delete_file' }))
}

export interface GenerateSalesDocumentInput {
  model: string
  lang: string
  token?: string
  copy?: boolean
}

export function useGenerateSalesDocument(facid: string | undefined) {
  return useDocsMutation(facid, (input: GenerateSalesDocumentInput) => fapiPost(DOCS, { id: Number(facid), model: input.model, lang_id: input.lang }, { action: 'generate' }))
}

export function useAddSalesDocumentLink(facid: string | undefined) {
  return useDocsMutation(facid, (input: { label: string; url: string }) => fapiPost(DOCS, { id: Number(facid), link: input.url, label: input.label }, { action: 'link' }))
}

export function useDeleteSalesDocumentLink(facid: string | undefined) {
  return useDocsMutation(facid, (linkId: string) => fapiPost(DOCS, { id: Number(facid), linkid: Number(linkId) }, { action: 'delete_link' }))
}

// The element types documents.php can link to (its linkable_types).
export const LINKABLE_OBJECT_TYPES: { value: string; label: string }[] = [
  { value: 'facture', label: 'Invoice' },
  { value: 'commande', label: 'Sales Order' },
  { value: 'propal', label: 'Quotation' },
  { value: 'contrat', label: 'Contract' },
  { value: 'shipping', label: 'Shipment' },
]

export interface LinkableObjectOption {
  id: string
  ref: string
}

export function useLinkableObjects(facid: string | undefined, linktype: string, enabled: boolean) {
  return useQuery<LinkableObjectOption[]>({
    queryKey: ['salesInvoice', facid, 'linkableObjects', linktype],
    queryFn: async () => {
      const d = await fapiGet<{ items?: Array<{ id: number | string; ref?: string }> }>(DOCS, { id: facid, action: 'linkable_objects', type: linktype })
      return (d.items ?? []).map((o) => ({ id: String(o.id), ref: o.ref ?? String(o.id) }))
    },
    enabled: enabled && !!facid && !!linktype,
  })
}

export function useLinkSalesObject(facid: string | undefined) {
  return useDocsMutation(facid, (input: { targettype: string; targetid: string }) => fapiPost(DOCS, { id: Number(facid), type: input.targettype, target_id: Number(input.targetid) }, { action: 'link_object' }))
}

export function useUnlinkSalesObject(facid: string | undefined) {
  return useDocsMutation(facid, (eeRowid: string) => fapiPost(DOCS, { id: Number(facid), rowid: Number(eeRowid) }, { action: 'unlink_object' }))
}

// --- ZRA Portal Details (compta/sales/api/zra.php) ------------------------

export interface ZraPortalDetails {
  portal: {
    errorcode: string
    errormessage: string
    invoice_no: string
    receipt_no: string
    date: string
    internal_data: string
    signature: string
    sdc_id: string
    mrc: string
    qr_url: string
  }
  invoice_ref: string
  customer: string
  request_sent: boolean
}

export function useSalesInvoiceZraPortal(facid: string | undefined, enabled: boolean) {
  return useQuery<ZraPortalDetails>({
    queryKey: ['salesInvoice', facid, 'zraPortal'],
    queryFn: async () => {
      const d = await fapiGet<{ portal?: Partial<ZraPortalDetails['portal']>; invoice_ref?: string; customer?: string; request_sent?: boolean }>(`${FAPI}/zra.php`, { id: facid })
      const p = d.portal ?? {}
      return {
        portal: {
          errorcode: p.errorcode ?? '',
          errormessage: p.errormessage ?? '',
          invoice_no: p.invoice_no ?? '',
          receipt_no: p.receipt_no ?? '',
          date: p.date ?? '',
          internal_data: p.internal_data ?? '',
          signature: p.signature ?? '',
          sdc_id: p.sdc_id ?? '',
          mrc: p.mrc ?? '',
          qr_url: p.qr_url ?? '',
        },
        invoice_ref: d.invoice_ref ?? '',
        customer: d.customer ?? '',
        request_sent: Boolean(d.request_sent),
      }
    },
    enabled: enabled && !!facid,
  })
}

// --- Ledger Entries (compta/sales/api/ledgerentry.php) --------------------

export interface SalesLedgerEntry {
  date: string
  piece: string
  ref: string
  journal: string
  account: string
  label: string
  debit: string
  debit_raw: number
  credit: string
  credit_raw: number
  amount: string
}

export interface SalesLedgerEntryData {
  count: number
  entries: SalesLedgerEntry[]
  total_debit: string
  total_credit: string
  balance: string
}

interface RawLedgerEntry {
  date?: string
  piece?: string
  ref?: string
  journal?: string
  account?: string
  label?: string
  debit?: number | string
  credit?: number | string
  amount?: number | string
}
const money = (v: number | string | undefined) => (typeof v === 'number' ? v.toFixed(2) : String(v ?? ''))

export function useSalesInvoiceLedgerEntries(facid: string | undefined) {
  return useQuery<SalesLedgerEntryData>({
    queryKey: ['salesInvoice', facid, 'ledgerEntries'],
    queryFn: async () => {
      const d = await fapiGet<{ entries?: RawLedgerEntry[]; count?: number; total_debit?: number; total_credit?: number; balance?: number }>(`${FAPI}/ledger.php`, { id: facid })
      return {
        count: d.count ?? (d.entries ?? []).length,
        entries: (d.entries ?? []).map((e) => ({
          date: e.date ?? '',
          piece: e.piece ?? '',
          ref: e.ref ?? '',
          journal: e.journal ?? '',
          account: e.account ?? '',
          label: e.label ?? '',
          debit: money(e.debit),
          debit_raw: Number(e.debit) || 0,
          credit: money(e.credit),
          credit_raw: Number(e.credit) || 0,
          amount: money(e.amount ?? (Number(e.debit) || 0) - (Number(e.credit) || 0)),
        })),
        total_debit: money(d.total_debit),
        total_credit: money(d.total_credit),
        balance: money(d.balance),
      }
    },
    enabled: !!facid,
  })
}

export function useDeleteSalesLedgerEntries(facid: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => fapiPost(`${FAPI}/ledger.php`, { id: Number(facid) }, { action: 'delete' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['salesInvoice', facid, 'ledgerEntries'] }),
  })
}

// --- Shipment / GRN (compta/sales/api/shipment.php) -----------------------

export interface SalesShipmentDetails {
  gdn_no: string
  grn_no: string
  month_year: string
  shipping_via: string
  shipping_date: string
  tracking_id: string
  transporter: string
  truck_details: string
  shipping_address: string
}

export interface SalesShipmentData {
  warning?: string
  shipment: SalesShipmentDetails
}

// Fields the API omits entirely (rather than returning '') for an
// empty/never-saved shipment record. Submitting an unguarded `undefined`
// through FormData.set() stringifies to the literal text "undefined",
// which the backend then persists, so these are normalized here: every
// consumer gets empty strings, never a missing key. The literal text
// "undefined"/"null" is stripped too, since some invoices already hold
// such stored values.
function cleanShipmentField(v: string | undefined | null): string {
  if (!v || v === 'undefined' || v === 'null') return ''
  return v
}

function normalizeShipment(raw: Partial<SalesShipmentDetails> | undefined): SalesShipmentDetails {
  return {
    gdn_no: cleanShipmentField(raw?.gdn_no),
    grn_no: cleanShipmentField(raw?.grn_no),
    month_year: cleanShipmentField(raw?.month_year),
    shipping_via: cleanShipmentField(raw?.shipping_via),
    shipping_date: cleanShipmentField(raw?.shipping_date),
    tracking_id: cleanShipmentField(raw?.tracking_id),
    transporter: cleanShipmentField(raw?.transporter),
    truck_details: cleanShipmentField(raw?.truck_details),
    shipping_address: cleanShipmentField(raw?.shipping_address),
  }
}

export function useSalesInvoiceShipment(facid: string | undefined) {
  return useQuery<SalesShipmentData>({
    queryKey: ['salesInvoice', facid, 'shipment'],
    queryFn: async () => {
      const d = await fapiGet<{ shipment?: Partial<SalesShipmentDetails> }>(`${FAPI}/shipment.php`, { id: facid })
      return { shipment: normalizeShipment(d.shipment) }
    },
    enabled: !!facid,
  })
}

export function useSaveSalesInvoiceShipment(facid: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (rawInput: SalesShipmentDetails) => fapiPost(`${FAPI}/shipment.php`, { id: Number(facid), ...normalizeShipment(rawInput) }, { action: 'save' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['salesInvoice', facid, 'shipment'] }),
  })
}

// --- Convert to Recurring Invoice (hardcoded absolute path in the real
// page's own inline script, not built from SALES_BASE) -------------------

export interface RecurringInvoiceInput {
  title: string
  frequency: string
  unitFrequency: 'd' | 'm' | 'y'
  reday: string
  remonth: string
  reyear: string
  rehour: string
  nbGenMax: string
  autoValidate: boolean
  useNewPrice: boolean
  generatePdf: boolean
}

// The conversion itself, for callers that only learn the invoice id after
// creating it (the create page's "Template invoice" type).
export function convertToRecurringInvoice(facid: string, input: RecurringInvoiceInput) {
  return fapiPost<{ id?: number }>(`${FAPI}/recurring_invoices.php`, {
    id: Number(facid),
    title: input.title,
    frequency: Number(input.frequency),
    unit_frequency: input.unitFrequency,
    reday: Number(input.reday),
    remonth: Number(input.remonth),
    reyear: Number(input.reyear),
    rehour: Number(input.rehour),
    nb_gen_max: Number(input.nbGenMax) || 0,
    auto_validate: input.autoValidate ? 1 : 0,
    usenewprice: input.useNewPrice ? 1 : 0,
    generate_pdf: input.generatePdf ? 1 : 0,
  }, { action: 'create' })
}

export function useConvertToRecurringInvoice(facid: string | undefined) {
  return useMutation({
    mutationFn: (input: RecurringInvoiceInput) => convertToRecurringInvoice(facid ?? '', input),
  })
}
