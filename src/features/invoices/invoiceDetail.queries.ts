import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// Real, dedicated backend for this exact page — compta/sales/api/*.php,
// confirmed by reading every file directly and live-testing against a real
// invoice (facid=383): invoice.php (main tab), contacts.php, notes.php,
// documents.php, agenda.php, shipment.php, ledgerentry.php,
// standingorders.php all return real, live JSON (not scraped HTML — most
// of this backend is genuinely clean JSON, unlike the DataTables-list
// endpoints elsewhere in this app). This is a purpose-built API for
// compta/sales/card.php (a newer custom page, not the classic Dolibarr
// compta/facture/card.php), same "Ecuenta Development Team" layer as
// compta/facture/api/unified_invoice_api.php.

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  const data = (await res.json()) as T & { success?: boolean; error?: string }
  if (data.success === false) throw new Error(data.error ?? 'Legacy backend rejected the request.')
  return data
}

async function postForm<T>(url: string, body: URLSearchParams | FormData): Promise<T> {
  const res = await fetch(url, { method: 'POST', credentials: 'same-origin', body })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  const data = (await res.json()) as T & { success?: boolean; error?: string }
  if (data.success === false) throw new Error(data.error ?? 'Legacy backend rejected the request.')
  return data
}

// --- Main invoice tab ------------------------------------------------------

export interface InvoiceLineRow {
  rowid: string
  seq: number
  product_ref: string
  label: string
  desc: string
  qty: string
  pu_ht_f: string
  pu_ttc_f: string
  tva_tx: string
  remise_percent: string
  total_ttc_f: string
  product_url: string | null
}

export interface InvoiceDetailData {
  id: string
  ref: string
  ref_client: string
  statut: string
  paye: string
  status_label: string
  payment_status: string
  type_label: string
  date: string
  date_due: string
  total_ht_f: string
  total_tva_f: string
  total_ttc_f: string
  currency: string
  discount_info: string
  mode_reglement_label: string
  cond_reglement_label: string
  online_pay_url: string
  nb_files: number
}

export interface InvoiceDetailResponse {
  invoice: InvoiceDetailData
  lines: InvoiceLineRow[]
  payments: unknown[]
  balance: string
  zra: { status: string; receipt_no: string }
  customer: { id: string; name: string; url: string }
  cond_options: Array<{ id: string; label: string }>
  mode_options: Array<{ id: string; code: string; label: string }>
  margin: { enabled: boolean; margin_info: string }
}

export function useInvoiceDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['invoices', 'detail', id],
    queryFn: () => fetchJson<InvoiceDetailResponse>(`/compta/sales/api/invoice.php?facid=${id}`),
    enabled: !!id,
  })
}

// --- Notes -------------------------------------------------------------

export interface InvoiceNotesResponse {
  note_public: string | null
  note_private: string | null
}

export function useInvoiceNotes(id: string | undefined) {
  return useQuery({
    queryKey: ['invoices', 'detail', id, 'notes'],
    queryFn: () => fetchJson<InvoiceNotesResponse>(`/compta/sales/api/notes.php?facid=${id}`),
    enabled: !!id,
  })
}

export function useSaveInvoiceNotes(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (fields: { note_public: string; note_private: string }) =>
      postForm(`/compta/sales/api/notes.php`, new URLSearchParams({ facid: id ?? '', action: 'save', ...fields })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices', 'detail', id, 'notes'] }),
  })
}

// --- Contacts/Addresses --------------------------------------------------

export interface InvoiceContactRow {
  rowid: string
  contactid: string
  name: string
  type_label: string
  status: string
}

export interface InvoiceContactsResponse {
  internal: InvoiceContactRow[]
  external: InvoiceContactRow[]
  total: number
}

export function useInvoiceContacts(id: string | undefined) {
  return useQuery({
    queryKey: ['invoices', 'detail', id, 'contacts'],
    queryFn: () => fetchJson<InvoiceContactsResponse>(`/compta/sales/api/contacts.php?facid=${id}`),
    enabled: !!id,
  })
}

// --- Direct Debit Orders (standing orders) --------------------------------

export interface StandingOrderRow {
  id: string
  ref: string
  amount: string
  date: string
  status: string
}

export interface StandingOrdersResponse {
  orders: StandingOrderRow[]
  history: unknown[]
  count: number
  can_create: boolean
  remaining_amount: string
}

export function useInvoiceStandingOrders(id: string | undefined) {
  return useQuery({
    queryKey: ['invoices', 'detail', id, 'standingOrders'],
    queryFn: () => fetchJson<StandingOrdersResponse>(`/compta/sales/api/standingorders.php?facid=${id}`),
    enabled: !!id,
  })
}

// --- Linked Files (Documents) ------------------------------------------

export interface InvoiceDocumentRow {
  name: string
  size: string
  date: string
  url: string
}

export interface InvoiceDocumentsResponse {
  files: InvoiceDocumentRow[]
  links: Array<{ id: string; label: string; url: string }>
  related: Array<{ type: string; ref: string; date: string; amount: string; status: string }>
  models: Array<{ value: string; label: string; selected: boolean }>
  nb_files: number
  margin: { enabled: boolean; margin_info: string }
}

export function useInvoiceDocuments(id: string | undefined) {
  return useQuery({
    queryKey: ['invoices', 'detail', id, 'documents'],
    queryFn: () => fetchJson<InvoiceDocumentsResponse>(`/compta/sales/api/documents.php?facid=${id}`),
    enabled: !!id,
  })
}

export function useUploadInvoiceDocument(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.set('facid', id ?? '')
      form.set('action', 'uploadfile')
      form.set('file', file)
      return postForm(`/compta/sales/api/documents.php`, form)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices', 'detail', id, 'documents'] }),
  })
}

// --- Events/Agenda (read-only) -------------------------------------------

export interface InvoiceAgendaEvent {
  id: string
  label: string
  type: string
  color: string
  date: string
  user: string
}

export interface InvoiceAgendaResponse {
  events: InvoiceAgendaEvent[]
  count: number
}

export function useInvoiceAgenda(id: string | undefined) {
  return useQuery({
    queryKey: ['invoices', 'detail', id, 'agenda'],
    queryFn: () => fetchJson<InvoiceAgendaResponse>(`/compta/sales/api/agenda.php?facid=${id}`),
    enabled: !!id,
  })
}

// --- Shipment / GRN --------------------------------------------------------

export interface ShipmentDetail {
  gdn_no: string
  grn_no: string
  shipment_month: string
  shipping_via: string
  shipping_date: string
  tracking_id: string
  transporter: string
  truck_details: string
  shipping_address: string
}

export interface ShipmentResponse {
  shipment: ShipmentDetail[] | ShipmentDetail
}

export function useInvoiceShipment(id: string | undefined) {
  return useQuery({
    queryKey: ['invoices', 'detail', id, 'shipment'],
    queryFn: () => fetchJson<ShipmentResponse>(`/compta/sales/api/shipment.php?facid=${id}`),
    enabled: !!id,
  })
}

export function useSaveInvoiceShipment(id: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (fields: Omit<ShipmentDetail, 'shipment_month'> & { month_year: string }) =>
      postForm(`/compta/sales/api/shipment.php`, new URLSearchParams({ facid: id ?? '', action: 'save_shipment', ...fields })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices', 'detail', id, 'shipment'] }),
  })
}

// --- Ledger Entry ---------------------------------------------------------

export interface LedgerEntryRow {
  rowid: string
  date: string
  piece: string
  ref: string
  journal: string
  account: string
  label: string
  debit: string
  credit: string
}

export interface LedgerEntryResponse {
  entries: LedgerEntryRow[]
  total_debit: string
  total_credit: string
  balance: string
  count: number
}

export function useInvoiceLedgerEntries(id: string | undefined) {
  return useQuery({
    queryKey: ['invoices', 'detail', id, 'ledgerEntries'],
    queryFn: () => fetchJson<LedgerEntryResponse>(`/compta/sales/api/ledgerentry.php?facid=${id}`),
    enabled: !!id,
  })
}
