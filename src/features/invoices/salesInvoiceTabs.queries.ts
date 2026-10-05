import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// Real contracts for the remaining compta/sales/card.php tabs — read
// verbatim from compta/sales/js/documents.js, ledgerentry.js, shipment.js,
// and the inline RecurringInvoiceModal script on the rendered page itself
// (see salesInvoice.queries.ts header comment for the parent investigation).
const SALES_BASE = '/compta/sales'

async function postForm<T = { success: boolean; error?: string; [k: string]: unknown }>(url: string, fd: FormData): Promise<T> {
  const res = await fetch(url, { method: 'POST', body: fd, credentials: 'same-origin' })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  const json = (await res.json()) as T & { success: boolean; error?: string }
  if (!json.success) throw new Error(json.error || 'The legacy backend rejected this request.')
  return json
}

// --- Linked Files (compta/sales/api/documents.php) -----------------------

export interface SalesDocumentFile {
  name: string
  size: string
  date: string
  is_pdf: boolean
  download_url: string
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

const DOCS_API = `${SALES_BASE}/api/documents.php`

export function useSalesInvoiceDocuments(facid: string | undefined) {
  return useQuery<SalesDocumentsData>({
    queryKey: ['salesInvoice', facid, 'documents'],
    queryFn: async () => {
      const res = await fetch(`${DOCS_API}?facid=${facid}`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Could not load linked files.')
      return json
    },
    enabled: !!facid,
  })
}

export function useUploadSalesDocument(facid: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData()
      fd.set('action', 'uploadfile')
      fd.set('facid', facid ?? '')
      fd.set('file', file)
      return postForm(DOCS_API, fd)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['salesInvoice', facid, 'documents'] }),
  })
}

export function useDeleteSalesDocument(facid: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (filename: string) => {
      const fd = new FormData()
      fd.set('action', 'deletefile')
      fd.set('facid', facid ?? '')
      fd.set('filename', filename)
      return postForm(DOCS_API, fd)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['salesInvoice', facid, 'documents'] }),
  })
}

export interface GenerateSalesDocumentInput {
  model: string
  lang: string
  token: string
  copy?: boolean
}

export function useGenerateSalesDocument(facid: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: GenerateSalesDocumentInput) => {
      const fd = new FormData()
      fd.set('action', 'generate')
      fd.set('facid', facid ?? '')
      fd.set('model', input.model)
      fd.set('lang', input.lang)
      fd.set('token', input.token)
      if (input.copy) fd.set('buttongeneratetype', 'Generate-copy')
      return postForm(DOCS_API, fd)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['salesInvoice', facid, 'documents'] }),
  })
}

export function useAddSalesDocumentLink(facid: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { label: string; url: string }) => {
      const fd = new FormData()
      fd.set('action', 'addlink')
      fd.set('facid', facid ?? '')
      fd.set('label', input.label)
      fd.set('url', input.url)
      return postForm(DOCS_API, fd)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['salesInvoice', facid, 'documents'] }),
  })
}

export function useDeleteSalesDocumentLink(facid: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (linkId: string) => {
      const fd = new FormData()
      fd.set('action', 'deletelink')
      fd.set('facid', facid ?? '')
      fd.set('linkid', linkId)
      return postForm(DOCS_API, fd)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['salesInvoice', facid, 'documents'] }),
  })
}

// Real linktype codes the page's own loadLinkableObjects() offers, each a
// classic Dolibarr object type.
export const LINKABLE_OBJECT_TYPES: { value: string; label: string }[] = [
  { value: 'invoice', label: 'Invoice' },
  { value: 'commande', label: 'Sales Order' },
  { value: 'propal', label: 'Quotation' },
  { value: 'contrat', label: 'Contract' },
  { value: 'fichinter', label: 'Intervention' },
  { value: 'supplier_proposal', label: 'Supplier Proposal' },
  { value: 'order_supplier', label: 'Purchase Order' },
  { value: 'invoice_supplier', label: 'Purchase Invoice' },
]

export interface LinkableObjectOption {
  id: string
  ref: string
}

export function useLinkableObjects(facid: string | undefined, linktype: string, enabled: boolean) {
  return useQuery<LinkableObjectOption[]>({
    queryKey: ['salesInvoice', facid, 'linkableObjects', linktype],
    queryFn: async () => {
      const res = await fetch(`${DOCS_API}?facid=${facid}&action=get_linkable_objects&linktype=${linktype}`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Could not load linkable objects.')
      return json.results ?? []
    },
    enabled: enabled && !!facid && !!linktype,
  })
}

export function useLinkSalesObject(facid: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { targettype: string; targetid: string }) => {
      const fd = new FormData()
      fd.set('action', 'add_object_linked')
      fd.set('facid', facid ?? '')
      fd.set('targettype', input.targettype)
      fd.set('targetid', input.targetid)
      return postForm(DOCS_API, fd)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['salesInvoice', facid, 'documents'] }),
  })
}

export function useUnlinkSalesObject(facid: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (eeRowid: string) => {
      const fd = new FormData()
      fd.set('action', 'delete_object_linked')
      fd.set('facid', facid ?? '')
      fd.set('ee_rowid', eeRowid)
      return postForm(DOCS_API, fd)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['salesInvoice', facid, 'documents'] }),
  })
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
      const fd = new FormData()
      fd.set('facid', facid ?? '')
      fd.set('action', 'selectinvoice')
      return postForm<ZraPortalDetails & { success: boolean }>(`${SALES_BASE}/api/zra.php`, fd)
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

const LEDGER_API = `${SALES_BASE}/api/ledgerentry.php`

export function useSalesInvoiceLedgerEntries(facid: string | undefined) {
  return useQuery<SalesLedgerEntryData>({
    queryKey: ['salesInvoice', facid, 'ledgerEntries'],
    queryFn: async () => {
      const res = await fetch(`${LEDGER_API}?facid=${facid}`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Could not load ledger entries.')
      return json
    },
    enabled: !!facid,
  })
}

export function useDeleteSalesLedgerEntries(facid: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const fd = new FormData()
      fd.set('action', 'delete')
      fd.set('facid', facid ?? '')
      return postForm(LEDGER_API, fd)
    },
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

const SHIPMENT_API = `${SALES_BASE}/api/shipment.php`

// Fields the real API omits entirely (rather than returning '') for an
// empty/never-saved shipment record — confirmed live: submitting an
// unguarded `undefined` through FormData.set() stringifies to the literal
// text "undefined", which the backend then happily persists. Normalized
// here so every consumer gets real empty strings, never a missing key.
// Also strips the literal text "undefined"/"null" — real corrupted values
// already written to some invoices by this exact bug before it was fixed
// here (FormData.set() stringifies a JS undefined/null to that literal
// text, which the backend then stores as-is).
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
      const res = await fetch(`${SHIPMENT_API}?facid=${facid}&action=get`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Could not load shipment/GRN details.')
      json.shipment = normalizeShipment(json.shipment)
      return json
    },
    enabled: !!facid,
  })
}

export function useSaveSalesInvoiceShipment(facid: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (rawInput: SalesShipmentDetails) => {
      const input = normalizeShipment(rawInput)
      const fd = new FormData()
      fd.set('action', 'save_shipment')
      fd.set('facid', facid ?? '')
      fd.set('gdn_no', input.gdn_no)
      fd.set('grn_no', input.grn_no)
      fd.set('month_year', input.month_year)
      fd.set('shipping_via', input.shipping_via)
      fd.set('shipping_date', input.shipping_date)
      fd.set('tracking_id', input.tracking_id)
      fd.set('transporter', input.transporter)
      fd.set('truck_details', input.truck_details)
      fd.set('shipping_address', input.shipping_address)
      return postForm(SHIPMENT_API, fd)
    },
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
  const fd = new FormData()
  fd.set('action', 'create')
  fd.set('facid', facid)
  fd.set('title', input.title)
  fd.set('frequency', input.frequency)
  fd.set('unit_frequency', input.unitFrequency)
  fd.set('reday', input.reday)
  fd.set('remonth', input.remonth)
  fd.set('reyear', input.reyear)
  fd.set('rehour', input.rehour)
  fd.set('nb_gen_max', input.nbGenMax)
  if (input.autoValidate) fd.set('auto_validate', '1')
  if (input.useNewPrice) fd.set('usenewprice', '1')
  if (input.generatePdf) fd.set('generate_pdf', '1')
  return postForm<{ success: boolean; error?: string; message?: string; redirect?: string; id?: number }>('/compta/sales/api/recurring_invoice.php', fd)
}

export function useConvertToRecurringInvoice(facid: string | undefined) {
  return useMutation({
    mutationFn: (input: RecurringInvoiceInput) => convertToRecurringInvoice(facid ?? '', input),
  })
}
