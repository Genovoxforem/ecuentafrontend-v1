import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { fetchSocieteFormContext } from './thirdPartyOptions.queries'

// Real, working REST API found by watching societe/card.php?socid=X's own
// network traffic while switching tabs — a full societe/api/{transactions,
// activities,contacts,contracts,customer,agenda}.php namespace, session-
// cookie authenticated like the rest of societe/api/*, all filtered by
// ?socid=. This directly replaces this page's earlier "not built yet" cards
// for these tabs, which were based on the dead /api/customers/* namespace,
// not on checking this real one.

// These endpoints' own JSON returns real legacy page URLs prefixed with
// this dev environment's document root (e.g.
// "/ecuenta9/htdocs/contrat/card.php?..."), which only resolves against the
// real backend origin, not this app's dev-server origin (see vite.config.ts
// — production deploys onto the backend's own origin, where this prefix
// doesn't exist at all, but dev needs it stripped before using the URL as a
// same-origin link/proxy target).
export function stripBackendPrefix(url: string): string {
  return url.replace(/^\/[^/]+\/htdocs(?=\/|$)/, '')
}

// The 6 tabs below this comment (Transactions/Activities/Contacts/
// Contracts/Customer/Agenda) only ever return 200 with ok:true on success,
// so the original version of this helper only checked res.ok and
// data.message. The 9 tabs added after them (Tickets/Consumption/Payment
// Modes/Notify/Documents/Pricing Groups/Accounts Receivable/Accounts
// Payable/General Ledger — found the same way, by reading
// societe/api/*.php directly) genuinely reject with non-2xx statuses
// (403/404/405/400) and put the real reason in `error`, not `message` — so
// this now always tries to parse the body first and prefers that over a
// generic "Legacy backend returned <status>" fallback.
async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'same-origin' })
  let data: (T & { ok?: boolean; error?: string; message?: string }) | null = null
  try {
    data = await res.json()
  } catch {
    // Non-JSON body (e.g. an HTML error page) — fall through to the
    // res.ok/status check below, which still produces a useful message.
  }
  if (!res.ok || data?.ok === false) {
    throw new Error(data?.error ?? data?.message ?? `Legacy backend returned ${res.status}.`)
  }
  return data as T
}

// Shared write helper for the four tabs below with real mutations (Payment
// Modes, Notify, Documents, Pricing Groups) — same token-in-body +
// validateStatus:()=>true pattern as useUpdateCustomer in
// customerDetail.queries.ts, since these endpoints share the same
// sc_api_check_token() CSRF guard as societe/api/societes.php.
async function postAction<T extends { ok: boolean; error?: string; message?: string }>(url: string, body: Record<string, unknown>): Promise<T> {
  const { token } = await fetchSocieteFormContext()
  const { data } = await axios.post<T>(
    url,
    { token, ...body },
    { headers: { 'Content-Type': 'application/json' }, validateStatus: () => true },
  )
  if (!data.ok) throw new Error(data.error ?? data.message ?? 'Request failed')
  return data
}

// --- Transactions (per-account ledger) --------------------------------

export interface LedgerRow {
  type: 'opening' | 'closing' | 'row'
  date: string
  entry_type: string
  reference: string
  contra: string
  description: string
  debit: number
  credit: number
  cumulative: number
}

export interface LedgerResponse {
  account_code: string
  account_label: string
  account_title: string
  date_from: string
  date_to: string
  rows: Array<Partial<LedgerRow> & { debit_total?: number; credit_total?: number }>
  totals: { debit: number; credit: number; balance: number }
}

function normalizeLedgerRow(raw: LedgerResponse['rows'][number]): LedgerRow {
  return {
    type: (raw.type as LedgerRow['type']) ?? 'row',
    date: raw.date ?? '',
    entry_type: raw.entry_type ?? '',
    reference: raw.reference ?? '',
    contra: raw.contra ?? '',
    description: raw.description ?? '',
    debit: raw.debit ?? raw.debit_total ?? 0,
    credit: raw.credit ?? raw.credit_total ?? 0,
    cumulative: raw.cumulative ?? 0,
  }
}

// datefilter is sent exactly as the legacy UI's own daterangepicker posts it
// ("MM/DD/YYYY - MM/DD/YYYY") — confirmed live, this is the same string
// transactions.php's own account_title/date_from response echoes back.
export function useCustomerLedger(socid: string | undefined, dateFrom: string, dateTo: string) {
  const datefilter = `${dateFrom} - ${dateTo}`
  return useQuery({
    queryKey: ['customers', 'detail', socid, 'ledger', dateFrom, dateTo],
    queryFn: async () => {
      const data = await fetchJson<LedgerResponse>(
        `/societe/api/transactions.php?action=ledger&datefilter=${encodeURIComponent(datefilter)}&socid=${socid}`,
      )
      return { ...data, rows: data.rows.map(normalizeLedgerRow) }
    },
    enabled: !!socid,
  })
}

// --- Activities (Tasks / Meetings / Calls) -----------------------------

export interface ActivityItem {
  id: number
  subject: string
  description: string
  priority: string
  status: string
  processtype: string
  duedate: string
  createddate: string
  relatedto: string
  location: string
  callstatus: string
  callpurpose: string
  creator_name: string
}

export interface ActivityListResponse {
  items: ActivityItem[]
  open: ActivityItem[]
  closed: ActivityItem[]
}

export type ActivityType = 'tasks' | 'meetings' | 'calls'

export function useCustomerActivities(socid: string | undefined, type: ActivityType) {
  return useQuery({
    queryKey: ['customers', 'detail', socid, 'activities', type],
    queryFn: () => fetchJson<ActivityListResponse>(`/societe/api/activities.php?type=${type}&socid=${socid}`),
    enabled: !!socid,
  })
}

export interface ActivitiesMeta {
  accounting_needs: Array<{ value: string; label: string }>
}
export function useCustomerActivitiesMeta(socid: string | undefined) {
  return useQuery({
    queryKey: ['customers', 'detail', socid, 'activitiesMeta'],
    queryFn: () => fetchJson<ActivitiesMeta>(`/societe/api/activities.php?action=meta&socid=${socid}`),
    enabled: !!socid,
    staleTime: 1000 * 60 * 10,
  })
}

// --- Contacts ------------------------------------------------------------

export interface ContactRow {
  id: number
  lastname: string
  firstname: string
  poste: string
  email: string
  phone: string
  address?: string
}

export interface ContactsResponse {
  can_edit: boolean
  rows: ContactRow[]
}

export function useCustomerContacts(socid: string | undefined) {
  return useQuery({
    queryKey: ['customers', 'detail', socid, 'contacts'],
    queryFn: () => fetchJson<ContactsResponse>(`/societe/api/contacts.php?socid=${socid}`),
    enabled: !!socid,
  })
}

// --- Contract-Follow -------------------------------------------------------

export interface ContractSummaryCard {
  title: string
  items: Array<{ label: string; value: number }>
}

export interface ContractRow {
  ref: string
  ref_customer: string
  ref_supplier: string
  sales_representatives: string
  date_contract: string
  lower_planned_end_date: string
  service_status: string
}

export interface ContractsResponse {
  rows: ContractRow[]
  summary: { cards: ContractSummaryCard[] }
  urls: { create: string; legacy: string }
}

export function useCustomerContracts(socid: string | undefined) {
  return useQuery({
    queryKey: ['customers', 'detail', socid, 'contracts'],
    queryFn: () => fetchJson<ContractsResponse>(`/societe/api/contracts.php?sortfield=c.ref&sortorder=DESC&socid=${socid}`),
    enabled: !!socid,
  })
}

// --- Customer tab (discount/payment/prospect + document KPIs) -----------

export interface CustomerTabButton {
  key: string
  label: string
  url: string
  visible: boolean
  refused?: boolean
  title?: string
}

export interface CustomerTabDocRow {
  ref?: string
  date?: string
  total_ht?: number
  status_label?: string
}

export interface CustomerTabResponse {
  client_label: string
  code_client: string
  code_compta: string
  prospectlevel: string
  stcomm_id: number
  outstanding: { total_ht: number; opened: number }
  proposals_kpi: { total_ht: number; opened: number }
  orders_kpi: { total_ht: number; opened: number }
  advance: number
  sales_reps: string[]
  categories: string[]
  prospect_levels: Array<{ code: string; label: string }>
  stcomms: Array<{ id: number; code: string; label: string }>
  cond_reglement_label: string
  mode_reglement_label: string
  remise_client: number
  remise_percent: number
  proposals: { count: number; rows: CustomerTabDocRow[] }
  orders: { count: number; rows: CustomerTabDocRow[] }
  invoices: { count: number; rows: CustomerTabDocRow[] }
  buttons: CustomerTabButton[]
}

export function useCustomerTab(socid: string | undefined) {
  return useQuery({
    queryKey: ['customers', 'detail', socid, 'customerTab'],
    queryFn: () => fetchJson<CustomerTabResponse>(`/societe/api/customer.php?socid=${socid}`),
    enabled: !!socid,
  })
}

// --- Events/Agenda (full activity timeline) ------------------------------

export interface AgendaEvent {
  id: number
  type: string
  type_label: string
  label: string
  note: string
  date: string
  time: string
  user: string
  status: string
  status_label: string
  late: boolean
  icon: string
  url: string
}

export interface AgendaDay {
  date: string
  date_label: string
  events: AgendaEvent[]
}

export interface AgendaFilterOption {
  value: string
  label: string
}

export interface AgendaResponse {
  timeline: AgendaDay[]
  filters: {
    types: AgendaFilterOption[]
    users: AgendaFilterOption[]
    statuses: AgendaFilterOption[]
  }
}

export interface AgendaFilters {
  type?: string
  status?: string
  user?: string
  search?: string
}

export function useCustomerAgenda(socid: string | undefined, filters: AgendaFilters) {
  return useQuery({
    queryKey: ['customers', 'detail', socid, 'agenda', filters],
    queryFn: () => {
      const params = new URLSearchParams({ socid: socid ?? '' })
      if (filters.type) params.set('type', filters.type)
      if (filters.status) params.set('status', filters.status)
      if (filters.user) params.set('user', filters.user)
      if (filters.search) params.set('search', filters.search)
      return fetchJson<AgendaResponse>(`/societe/api/agenda.php?${params.toString()}`)
    },
    enabled: !!socid,
  })
}

// --- Tickets ---------------------------------------------------------------
// societe/api/tickets.php — real, session-cookie-authenticated (parity with
// ticket/list.php?socid=X). Read-only from this app for now: creating a
// ticket is a full separate module, out of scope here, same as this page's
// existing "Add contact" link opening the legacy page instead of a form.

export interface TicketRow {
  id: number
  ref: string
  track_id: string
  subject: string
  type_label: string
  severity_label: string
  status: number
  status_label: string
  progress: number
  author: string
  assigned_to: string
  date_created: string
  url: string
}

export interface TicketFilterOption {
  value: string
  label: string
}

export interface TicketsResponse {
  count: number
  rows: TicketRow[]
  filter_options: { status: TicketFilterOption[]; types: TicketFilterOption[]; severities: TicketFilterOption[] }
  can_create: boolean
  urls: { create: string; legacy: string }
}

export function useCustomerTickets(socid: string | undefined, status: string) {
  return useQuery({
    queryKey: ['customers', 'detail', socid, 'tickets', status],
    queryFn: () => fetchJson<TicketsResponse>(`/societe/api/tickets.php?socid=${socid}&search_status=${encodeURIComponent(status)}&limit=100`),
    enabled: !!socid,
  })
}

// --- Consumption (Related Items) -------------------------------------------
// societe/api/consumption.php — aggregates propals/orders/invoices/
// interventions (and supplier orders/invoices when this record isn't a
// customer) by fk_soc. Read-only, same as the legacy page.

export interface ConsumptionRow {
  id: number
  ref: string
  date: string
  total: number
  url?: string
}

export interface ConsumptionResponse {
  summary: Record<string, number>
  sections: Record<string, ConsumptionRow[]>
  section_labels: Record<string, string>
}

export function useCustomerConsumption(socid: string | undefined) {
  return useQuery({
    queryKey: ['customers', 'detail', socid, 'consumption'],
    queryFn: () => fetchJson<ConsumptionResponse>(`/societe/api/consumption.php?socid=${socid}&limit=10`),
    enabled: !!socid,
  })
}

// --- Payment modes (RIB / bank accounts) ------------------------------------
// societe/api/paymentmodes.php — full CRUD against llx_societe_rib (or
// CompanyBankAccount when that class is present). Only label+bank are
// required by the backend; the rest of CompanyBankAccount's fields are
// left to the legacy edit page, same scope this app already draws for
// Third-party's own edit form (plain fields only, no full picker forms).

export interface PaymentModeRow {
  id: number
  label: string
  bank: string
  number: string
  iban: string
  bic: string
  default_rib: number
}

export interface PaymentModesResponse {
  can_edit: boolean
  rows: PaymentModeRow[]
}

export function useCustomerPaymentModes(socid: string | undefined) {
  return useQuery({
    queryKey: ['customers', 'detail', socid, 'paymentmodes'],
    queryFn: () => fetchJson<PaymentModesResponse>(`/societe/api/paymentmodes.php?socid=${socid}`),
    enabled: !!socid,
  })
}

export interface NewPaymentModeInput {
  label: string
  bank: string
  number?: string
  iban?: string
  bic?: string
}

export function useAddPaymentMode(socid: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: NewPaymentModeInput) => postAction(`/societe/api/paymentmodes.php?socid=${socid}`, { ...input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers', 'detail', socid, 'paymentmodes'] }),
  })
}

export function useDeletePaymentMode(socid: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (bankid: number) => postAction(`/societe/api/paymentmodes.php?socid=${socid}`, { action: 'delete', bankid }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers', 'detail', socid, 'paymentmodes'] }),
  })
}

// --- Notifications -----------------------------------------------------
// societe/api/notify.php — notify_def rows (which contact gets notified on
// which trigger event), full CRUD.

export interface NotifyAssignedRow {
  id: number
  action_id: number
  contact_id: number
  contact_name: string
  code: string
  label: string
}

export interface NotifyOption {
  id: number
  code: string
  label: string
}

export interface NotifyContact {
  id: number
  name: string
}

export interface NotifyResponse {
  can_edit: boolean
  assigned: NotifyAssignedRow[]
  available: NotifyOption[]
  contacts: NotifyContact[]
}

export function useCustomerNotify(socid: string | undefined) {
  return useQuery({
    queryKey: ['customers', 'detail', socid, 'notify'],
    queryFn: () => fetchJson<NotifyResponse>(`/societe/api/notify.php?socid=${socid}`),
    enabled: !!socid,
  })
}

export function useAddNotify(socid: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { actionId: number; contactId: number }) =>
      postAction(`/societe/api/notify.php?socid=${socid}`, { action: 'add', action_id: input.actionId, contact_id: input.contactId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers', 'detail', socid, 'notify'] }),
  })
}

export function useRemoveNotify(socid: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (actid: number) => postAction(`/societe/api/notify.php?socid=${socid}`, { action: 'delete', actid }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers', 'detail', socid, 'notify'] }),
  })
}

// --- Linked files (Documents) ------------------------------------------
// societe/api/documents.php — real files under the third party's own
// document.php?modulepart=societe storage dir, full upload/list/delete.

export interface DocumentRow {
  name: string
  size: string
  date: string
  download_url: string
}

export interface DocumentsResponse {
  can_edit: boolean
  rows: DocumentRow[]
}

export function useCustomerDocuments(socid: string | undefined) {
  return useQuery({
    queryKey: ['customers', 'detail', socid, 'documents'],
    queryFn: () => fetchJson<DocumentsResponse>(`/societe/api/documents.php?socid=${socid}`),
    enabled: !!socid,
  })
}

// Documents is the one write action that needs multipart/form-data instead
// of JSON (real file upload) — sc_api_input() on the backend falls back to
// $_POST when the body isn't JSON, so the token still just needs to be a
// plain form field alongside the file, same CSRF contract as the other
// three mutating tabs.
export function useUploadDocument(socid: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const { token } = await fetchSocieteFormContext()
      const form = new FormData()
      form.set('token', token)
      form.set('file', file)
      const { data } = await axios.post<{ ok: boolean; error?: string; message?: string }>(`/societe/api/documents.php?socid=${socid}`, form, {
        validateStatus: () => true,
      })
      if (!data.ok) throw new Error(data.error ?? data.message ?? 'Upload failed')
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers', 'detail', socid, 'documents'] }),
  })
}

export function useDeleteDocument(socid: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => postAction(`/societe/api/documents.php?socid=${socid}`, { action: 'delete', name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers', 'detail', socid, 'documents'] }),
  })
}

// --- Pricing groups ------------------------------------------------------
// societe/api/pricing_groups.php — a custom addition on this backend (not
// stock Dolibarr), backed by llx_custom_group/llx_group_price_product.
// This tab only assigns an *existing* group to the third party — building
// groups themselves is Customer Groups' own feature elsewhere in this app
// (customerGroups.queries.ts), not duplicated here.

export interface PricingGroupRow {
  id: number
  label: string
  discount: number
  discount_type: string
  description: string
}

export interface PricingGroupsResponse {
  can_edit: boolean
  rows: PricingGroupRow[]
  group_id: number
  message?: string
}

export function useCustomerPricingGroups(socid: string | undefined) {
  return useQuery({
    queryKey: ['customers', 'detail', socid, 'pricingGroups'],
    queryFn: () => fetchJson<PricingGroupsResponse>(`/societe/api/pricing_groups.php?socid=${socid}`),
    enabled: !!socid,
  })
}

export function useAssignPricingGroup(socid: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (groupId: number) => postAction(`/societe/api/pricing_groups.php?socid=${socid}`, { action: 'assign', group_id: groupId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers', 'detail', socid, 'pricingGroups'] }),
  })
}

// --- Accounts Receivable / Accounts Payable ---------------------------------
// societe/api/accounting_ar.php + accounting_ap.php — real open-invoice
// summaries (Client::getOutstandingBills() for AR; a direct facture_fourn
// query for AP). Both read-only, same shape.

export interface AccountingSummary {
  total_invoiced: number
  total_paid: number
  total_open: number
  invoice_count: number
  open_count: number
}

export interface AccountingInvoiceRow {
  id: number
  ref: string
  date: string
  due_date: string
  total_ht: number
  total_ttc: number
  paid: number
  open: number
  paye: number
}

export interface AccountingResponse {
  summary: AccountingSummary
  rows: AccountingInvoiceRow[]
}

export function useCustomerAccountingAr(socid: string | undefined) {
  return useQuery({
    queryKey: ['customers', 'detail', socid, 'accountingAr'],
    queryFn: () => fetchJson<AccountingResponse>(`/societe/api/accounting_ar.php?socid=${socid}`),
    enabled: !!socid,
  })
}

export function useCustomerAccountingAp(socid: string | undefined) {
  return useQuery({
    queryKey: ['customers', 'detail', socid, 'accountingAp'],
    queryFn: () => fetchJson<AccountingResponse>(`/societe/api/accounting_ap.php?socid=${socid}`),
    enabled: !!socid,
  })
}

// --- General ledger ----------------------------------------------------
// societe/api/general_ledger.php — bank lines linked to this third party
// (bank_url type='company') plus bookkeeping lines matched by its
// accounting code, merged and read-only.

export interface LedgerMovementRow {
  id: number
  source: 'bank' | 'bookkeeping'
  date: string
  amount: number
  label: string
  account: string
  debit?: number
  credit?: number
}

export interface GeneralLedgerResponse {
  rows: LedgerMovementRow[]
  code_compta: string
}

export function useCustomerGeneralLedger(socid: string | undefined) {
  return useQuery({
    queryKey: ['customers', 'detail', socid, 'generalLedger'],
    queryFn: () => fetchJson<GeneralLedgerResponse>(`/societe/api/general_ledger.php?socid=${socid}&limit=50`),
    enabled: !!socid,
  })
}
