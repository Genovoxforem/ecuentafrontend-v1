import { useQuery } from '@tanstack/react-query'

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

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  const data = (await res.json()) as T & { ok?: boolean; message?: string }
  if (data.ok === false) throw new Error(data.message ?? 'Legacy backend rejected the request.')
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
