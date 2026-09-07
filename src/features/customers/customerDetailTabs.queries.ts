import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

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
//
// Full real contract confirmed this session by reading
// societe/api/activities.php directly (not guessed): sc_act_row() is the
// exact field set both the list and the detail=X actions return, and the
// meta/create/update/schedule/close/delete branches below name their own
// accepted POST fields explicitly. Mirrors the same real 3-icon Actions
// column (View/Edit/Schedule) and Schedule-follow-up flow the legacy JS
// widget (societe/assets/js/components/activities.js) implements — Edit and
// Schedule only apply to OPEN items there, so the same restriction is kept
// here.

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

// Full detail row — every field sc_act_row() actually returns, not just the
// list-table subset ActivityItem covers. `*_raw` fields are DB-format
// (Y-m-d H:i:s), suitable for seeding a <input type="datetime-local">
// (via .slice(0,16)) when editing/scheduling.
export interface ActivityDetail extends ActivityItem {
  startdate: string
  startdate_raw: string
  duedate_raw: string
  industry: string
  assign_salesperson: number
  assign_salesperson_name: string
  fk_parent_id: number
  reminder: boolean
  remtime: string
  remtime_raw: string
  repeatp: boolean
  reptime: string
  userremainder: string
  participentsremainder: string
  demo_given: string
  proposal_shared: string
  demo_date: string
  demo_date_raw: string
  proposal_date: string
  proposal_date_raw: string
  status_code: string
  loss_reason: string
  decision_maker: string
  statusdescription: string
  agenda: string
  followup_type: string
  lead_type: string
  last_contact_date: string
  last_contact_date_raw: string
  closedby_name: string
  statusupdatedtime: string
}

export function useActivityDetail(socid: string | undefined, activityId: number | null) {
  return useQuery({
    queryKey: ['customers', 'detail', socid, 'activityDetail', activityId],
    queryFn: async (): Promise<ActivityDetail> => {
      const data = await fetchJson<{ activity: ActivityDetail }>(`/societe/api/activities.php?action=detail&activity_id=${activityId}&socid=${socid}`)
      return data.activity
    },
    enabled: !!socid && !!activityId,
  })
}

// Real via ?action=meta&socid= — the exact dropdown sources
// buildTaskForm/buildMeetingForm/buildCallForm read from (this.meta in the
// legacy JS), confirmed by reading that GET branch directly.
export interface ActivitiesMeta {
  users: Array<{ id: number; name: string }>
  parents: Array<{ id: number; subject: string }>
  accounting_needs: Array<{ value: string; label: string }>
  priorities: string[]
  call_statuses: string[]
  call_purposes: string[]
  followup_types: Record<string, string>
  lead_types: string[]
  meeting_statuses: Record<string, string>
}
export function useCustomerActivitiesMeta(socid: string | undefined) {
  return useQuery({
    queryKey: ['customers', 'detail', socid, 'activitiesMeta'],
    queryFn: () => fetchJson<ActivitiesMeta>(`/societe/api/activities.php?action=meta&socid=${socid}`),
    enabled: !!socid,
    staleTime: 1000 * 60 * 10,
  })
}

// One shape covers all 3 processtypes — every field is optional and only
// the ones relevant to the active type are ever sent (see
// ActivityFormModal), matching exactly the column set each of the 3
// INSERT branches (task/meeting/calls) in activities.php reads.
export interface ActivityFormInput {
  subject: string
  description: string
  relatedto: string
  fk_parent_id: number
  // Task
  duedate: string
  priority: string
  industry: string
  assign_salesperson: number | ''
  reminder: boolean
  remtime: string
  repeatp: boolean
  reptime: string
  // Meeting
  location: string
  startdate: string
  demo_given: string
  demo_date: string
  userremainder: number[]
  participentsremainder: number[]
  proposal_shared: string
  proposal_date: string
  statusdescription: string
  status_code: string
  loss_reason: string
  decision_maker: string
  // Calls
  callstatus: string
  callpurpose: string
  agenda: string
  followup_type: string
  lead_type: string
  last_contact_date: string
}

function activityFormBody(type: ActivityType, input: Partial<ActivityFormInput>) {
  const processtype = type === 'tasks' ? 'task' : type === 'meetings' ? 'meeting' : 'calls'
  const body: Record<string, unknown> = { processtype, subject: input.subject, description: input.description, relatedto: input.relatedto, fk_parent_id: input.fk_parent_id }
  if (processtype === 'task') {
    Object.assign(body, {
      duedate: input.duedate,
      priority: input.priority,
      industry: input.industry,
      assign_salesperson: input.assign_salesperson || undefined,
      reminder: input.reminder,
      remtime: input.remtime,
      repeatp: input.repeatp,
      reptime: input.reptime,
    })
  } else if (processtype === 'meeting') {
    Object.assign(body, {
      location: input.location,
      startdate: input.startdate,
      duedate: input.duedate,
      demo_given: input.demo_given,
      demo_date: input.demo_date,
      userremainder: input.userremainder,
      participentsremainder: input.participentsremainder,
      proposal_shared: input.proposal_shared,
      proposal_date: input.proposal_date,
      statusdescription: input.statusdescription,
      status_code: input.status_code,
      loss_reason: input.loss_reason,
      decision_maker: input.decision_maker,
      reminder: input.reminder,
      remtime: input.remtime,
    })
  } else {
    Object.assign(body, {
      duedate: input.duedate,
      callstatus: input.callstatus,
      callpurpose: input.callpurpose,
      agenda: input.agenda,
      followup_type: input.followup_type,
      lead_type: input.lead_type,
      assign_salesperson: input.assign_salesperson || undefined,
      last_contact_date: input.last_contact_date,
      remtime: input.remtime,
    })
  }
  return body
}

// Real POST to the same societe/api/activities.php namespace the list above
// reads from (?type=tasks|meetings|calls&socid=), CSRF-token-gated exactly
// like societe/api/contacts.php's own create action (see
// scrapeSocieteToken/useCreateContact below — same token, same third party
// page it's scraped from). Not live-tested against this instance's database
// (mutation, requires per-instance approval) — same standing caveat as
// every other write in this file.
export function useCreateActivity(socid: string | undefined, type: ActivityType) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: ActivityFormInput) => {
      if (!socid) throw new Error('Missing third party id.')
      const token = await scrapeSocieteToken(socid)
      const res = await fetch(`/societe/api/activities.php?socid=${socid}`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...activityFormBody(type, input), action: 'create', type, token }),
      })
      const data = (await res.json()) as { ok: boolean; error?: string; id?: number }
      if (!data.ok) throw new Error(data.error ?? 'Could not create the activity.')
      return data.id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', 'detail', socid, 'activities', type] })
    },
  })
}

// Real POST action=update (activities.php also accepts 'edit'/'save' as
// aliases, or a plain PUT — 'update' is used here to match the legacy JS's
// own bindEditForm). Only changed/relevant fields need to be sent — the
// backend does a real column-by-column `isset($input[...])` merge, not a
// full-row replace.
export function useUpdateActivity(socid: string | undefined, type: ActivityType) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: ActivityFormInput }) => {
      if (!socid) throw new Error('Missing third party id.')
      const token = await scrapeSocieteToken(socid)
      const res = await fetch(`/societe/api/activities.php?socid=${socid}`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...activityFormBody(type, input), action: 'update', activity_id: id, token }),
      })
      const data = (await res.json()) as { ok: boolean; error?: string }
      if (!data.ok) throw new Error(data.error ?? 'Could not update the activity.')
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['customers', 'detail', socid, 'activities', type] })
      queryClient.invalidateQueries({ queryKey: ['customers', 'detail', socid, 'activityDetail', id] })
    },
  })
}

export interface ScheduleActivityInput {
  description: string
  schedule_at: string
  reminder: boolean
  remtime: string
  status_code?: string
  loss_reason?: string
  statusdescription?: string
  demo_date?: string
  proposal_date?: string
  last_contact_date?: string
}

// Real POST action=schedule — a real "log a follow-up / reschedule" action
// (not a calendar add): moves duedate (and startdate for meetings) to
// schedule_at, requires a non-empty description, reopens the activity, and
// optionally arms a reminder. This is the 3rd Actions-column icon in the
// legacy UI (fa-calendar-plus, titled "Schedule") — confirmed by reading
// societe/assets/js/components/activities.js's bindScheduleForm directly,
// not guessed.
export function useScheduleActivity(socid: string | undefined, type: ActivityType) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, processtype, input }: { id: number; processtype: string; input: ScheduleActivityInput }) => {
      if (!socid) throw new Error('Missing third party id.')
      const token = await scrapeSocieteToken(socid)
      const res = await fetch(`/societe/api/activities.php?socid=${socid}`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...input, action: 'schedule', activity_id: id, processtype, token }),
      })
      const data = (await res.json()) as { ok: boolean; error?: string }
      if (!data.ok) throw new Error(data.error ?? 'Could not schedule the follow-up.')
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['customers', 'detail', socid, 'activities', type] })
      queryClient.invalidateQueries({ queryKey: ['customers', 'detail', socid, 'activityDetail', id] })
    },
  })
}

// Real POST action=close — the legacy panel's green "Close" quick-action
// (from both the View tab and the Schedule tab).
export function useCloseActivity(socid: string | undefined, type: ActivityType) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, processtype, description }: { id: number; processtype: string; description?: string }) => {
      if (!socid) throw new Error('Missing third party id.')
      const token = await scrapeSocieteToken(socid)
      const res = await fetch(`/societe/api/activities.php?socid=${socid}`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close', activity_id: id, processtype, description, token }),
      })
      const data = (await res.json()) as { ok: boolean; error?: string }
      if (!data.ok) throw new Error(data.error ?? 'Could not close the activity.')
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['customers', 'detail', socid, 'activities', type] })
      queryClient.invalidateQueries({ queryKey: ['customers', 'detail', socid, 'activityDetail', id] })
    },
  })
}

// Real POST action=delete — only ever offered for OPEN items in the legacy
// Edit panel (matches this file's own `mode === 'edit' && d.status ===
// 'open'` guard on the Delete button).
export function useDeleteActivity(socid: string | undefined, type: ActivityType) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      if (!socid) throw new Error('Missing third party id.')
      const token = await scrapeSocieteToken(socid)
      const res = await fetch(`/societe/api/activities.php?socid=${socid}`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', activity_id: id, token }),
      })
      const data = (await res.json()) as { ok: boolean; error?: string }
      if (!data.ok) throw new Error(data.error ?? 'Could not delete the activity.')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', 'detail', socid, 'activities', type] })
    },
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

export interface CreateContactInput {
  lastname: string
  firstname: string
  email: string
  phone: string
  phone_mobile: string
  poste: string
}

// Real via societe/api/contacts.php (POST, action=create) — same real
// societe/api/* namespace as the GET above, confirmed by reading the PHP
// source directly. Write actions go through sc_api_check_token(), which
// validates against this session's own server-side CSRF token — there's no
// dedicated token-issuing endpoint, so a fresh one is scraped off
// societe/card.php's own hidden `token` field (same technique already used
// for the real Warehouse edit form). Not live-tested against this
// instance's database (mutation, requires per-instance approval).
async function scrapeSocieteToken(socid: string): Promise<string> {
  const res = await fetch(`/societe/card.php?socid=${socid}`, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  const html = await res.text()
  const match = html.match(/name="token"\s+value="([^"]+)"/)
  if (!match) throw new Error('Could not find a CSRF token on the third party page.')
  return match[1]
}

export function useCreateContact(socid: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateContactInput) => {
      if (!socid) throw new Error('Missing third party id.')
      const token = await scrapeSocieteToken(socid)
      const res = await fetch(`/societe/api/contacts.php?socid=${socid}`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...input, token }),
      })
      const data = (await res.json()) as { ok: boolean; error?: string; id?: number }
      if (!data.ok) throw new Error(data.error ?? 'Could not create the contact.')
      return data.id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', 'detail', socid, 'contacts'] })
    },
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
  // Real, ready-made links societe/api/customer.php already returns
  // (DOL_URL_ROOT-relative) — confirmed by reading that file directly.
  // discount -> comm/remise.php, the real "manage discounts" page;
  // proposals_list/orders_list/invoices_list -> the real filtered legacy
  // list pages for this customer; *_create mirror the same create buttons
  // already surfaced in `buttons` above, just addressable directly per KPI.
  urls: {
    legacy: string
    discount: string
    proposals_list: string
    proposals_create: string
    orders_list: string
    orders_create: string
    invoices_list: string
    invoices_create: string
  }
}

export function useCustomerTab(socid: string | undefined) {
  return useQuery({
    queryKey: ['customers', 'detail', socid, 'customerTab'],
    queryFn: () => fetchJson<CustomerTabResponse>(`/societe/api/customer.php?socid=${socid}`),
    enabled: !!socid,
  })
}

// --- Vendor tab (fourn/card.php's real data, confirmed live) ------------
// societe/api/supplier.php is a real, already-built sibling of customer.php
// above — read directly and confirmed live (socid=6, "Vendor2"): real KPIs
// (proposals_kpi/orders_kpi/supplier_outstanding), real payment-term/mode
// labels, real category list, and real action-button URLs
// (create_proposal/create_order/create_invoice point at the actual
// supplier_proposal/fourn.commande/fourn.purchase create pages). No
// separate "invoices_kpi" bucket exists in the response the way
// proposals/orders each have one — supplier_outstanding.total_ht is used
// for the "Invoices" stat tile here since it's the only real invoiced-
// amount figure this endpoint returns; the real page's "Current
// Outstanding Bill"/"Advance" tiles map to supplier_outstanding.opened and
// fields.advance respectively (no Used/Pending breakdown exists in this
// response, so that real sub-line isn't reproduced).
export interface VendorTabResponse {
  fournisseur: number
  code_fournisseur: string
  code_compta_fournisseur: string
  supplier_outstanding: { total_ht: number; opened: number }
  orders_kpi: { total_ht: number; opened: number }
  proposals_kpi: { total_ht: number; opened: number }
  cond_reglement_label: string
  mode_reglement_label: string
  fields: {
    tva_intra: string
    capital: string
    advance: number
    remise_percent: number
    remise_absolue: number
    categories: string[]
  }
  buttons: { create_proposal: string; create_order: string; create_invoice: string }
}

export function useVendorTab(socid: string | undefined) {
  return useQuery({
    queryKey: ['customers', 'detail', socid, 'vendorTab'],
    queryFn: () => fetchJson<VendorTabResponse>(`/societe/api/supplier.php?socid=${socid}`),
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

// --- Pricing Groups ---------------------------------------------------
// societe/api/pricing_groups.php — real, global custom_group table (not
// scoped to a single third party beyond the assigned group_id). Read-only
// here since the real page itself only shows a plain table, no inline
// create/edit UI, per the actual screenshot verified against.

export interface PricingGroupRow {
  id: number
  label: string
  discount: number
  discount_type: string
  customer_method: string
  description: string
  tms: string
}

export interface PricingGroupsResponse {
  groups: PricingGroupRow[]
  group_id: number
}

export function useCustomerPricingGroups(socid: string | undefined) {
  return useQuery({
    queryKey: ['customers', 'detail', socid, 'pricingGroups'],
    queryFn: () => fetchJson<PricingGroupsResponse>(`/societe/api/pricing_groups.php?socid=${socid}`),
    enabled: !!socid,
  })
}

// --- Linked Files (Documents) ------------------------------------------
// societe/api/documents.php — real files on disk under
// documents/societe/<id>/, confirmed by reading the file directly
// (dol_dir_list against the real upload_dir, real download_url via
// document.php?modulepart=societe).

export interface DocumentRow {
  name: string
  size: string
  size_bytes: number
  date: string
  download_url: string
}

export interface DocumentsResponse {
  can_edit: boolean
  documents: DocumentRow[]
}

export function useCustomerDocuments(socid: string | undefined) {
  return useQuery({
    queryKey: ['customers', 'detail', socid, 'documents'],
    queryFn: () => fetchJson<DocumentsResponse>(`/societe/api/documents.php?socid=${socid}`),
    enabled: !!socid,
  })
}

// --- Notifications -------------------------------------------------------
// societe/api/notify.php — real notify_def rows, confirmed by reading the
// file directly (real INNER JOIN against c_action_trigger/socpeople).

export interface NotificationRow {
  id: number
  action_id: number
  contact_id: number
  contact_name: string
  code: string
  label: string
}

export interface NotificationOption {
  id: number
  code?: string
  label: string
  name?: string
}

export interface NotificationsResponse {
  can_edit: boolean
  assigned: NotificationRow[]
  available: NotificationOption[]
  contacts: NotificationOption[]
}

export function useCustomerNotifications(socid: string | undefined) {
  return useQuery({
    queryKey: ['customers', 'detail', socid, 'notifications'],
    queryFn: () => fetchJson<NotificationsResponse>(`/societe/api/notify.php?socid=${socid}`),
    enabled: !!socid,
  })
}

// --- Related Items (Consumption) ----------------------------------------
// societe/api/consumption.php — real per-table counts/rows (propal/
// commande/facture/fichinter, or the supplier-side tables for a vendor),
// confirmed by reading the file directly. Read-only, matches the real
// page's own "Open list"/"All" links out rather than any inline action.

export interface ConsumptionRow {
  id: number
  ref: string
  date: string
  total: number
  url: string
}

export interface ConsumptionResponse {
  summary: Record<string, number>
  sections: Record<string, ConsumptionRow[]>
  section_labels: Record<string, string>
  urls: { legacy: string; lists: Record<string, string> }
}

export function useCustomerConsumption(socid: string | undefined) {
  return useQuery({
    queryKey: ['customers', 'detail', socid, 'consumption'],
    queryFn: () => fetchJson<ConsumptionResponse>(`/societe/api/consumption.php?socid=${socid}`),
    enabled: !!socid,
  })
}

// --- Tickets ---------------------------------------------------------------
// societe/api/tickets.php — real llx_ticket rows scoped to this third
// party, confirmed by reading the file directly (real filters/status
// options straight off c_ticket_type/c_ticket_severity).

export interface TicketFilterOption {
  value: string
  label: string
}

export interface TicketRow {
  id: number
  ref: string
  track_id: string
  subject: string
  type_label: string
  severity_label: string
  status_label: string
  author: string
  assigned_to: string
  date_created: string
  url: string
}

export interface TicketsFilters {
  search?: string
  status?: string
  type?: string
  severity?: string
}

export interface TicketsResponse {
  count: number
  rows: TicketRow[]
  filters: { search: string; search_status: string; search_type: string; search_severity: string }
  filter_options: { status: TicketFilterOption[]; types: TicketFilterOption[]; severities: TicketFilterOption[] }
  urls: { list: string; create: string; legacy: string }
  can_create: boolean
}

export function useCustomerTickets(socid: string | undefined, filters: TicketsFilters) {
  return useQuery({
    queryKey: ['customers', 'detail', socid, 'tickets', filters],
    queryFn: () => {
      const params = new URLSearchParams({ socid: socid ?? '' })
      if (filters.search) params.set('search', filters.search)
      if (filters.status) params.set('search_status', filters.status)
      if (filters.type) params.set('search_type', filters.type)
      if (filters.severity) params.set('search_severity', filters.severity)
      return fetchJson<TicketsResponse>(`/societe/api/tickets.php?${params.toString()}`)
    },
    enabled: !!socid,
  })
}

// --- Projects (linked to this third party) --------------------------------
// societe/api/projects.php — real llx_projet rows scoped to fk_soc,
// confirmed by reading that file directly.

export interface CustomerProjectRow {
  id: number
  ref: string
  title: string
  status: number
  date_start: string
  date_end: string
  budget: number
  task_count: number
  url: string
}

export interface CustomerProjectsResponse {
  projects: CustomerProjectRow[]
  urls: { list: string; create: string; legacy: string }
}

export function useCustomerProjects(socid: string | undefined) {
  return useQuery({
    queryKey: ['customers', 'detail', socid, 'projects'],
    queryFn: () => fetchJson<CustomerProjectsResponse>(`/societe/api/projects.php?socid=${socid}`),
    enabled: !!socid,
  })
}

// --- Expenses ---------------------------------------------------------
// societe/api/expenses.php — real llx_expensereport rows when a fk_soc link
// exists; on this deployment (no fk_soc column on expensereport or
// expensereport_det), it always reports back a real, honest `message`
// instead of guessing at rows — confirmed by reading that file directly.

export interface ExpenseRow {
  id: number
  ref: string
  date_start: string
  date_end: string
  total_ht: number
  total_ttc: number
  status: number
  url: string
}

export interface ExpensesResponse {
  expenses: ExpenseRow[]
  message?: string
  urls?: { list: string; create: string }
}

export function useCustomerExpenses(socid: string | undefined) {
  return useQuery({
    queryKey: ['customers', 'detail', socid, 'expenses'],
    queryFn: () => fetchJson<ExpensesResponse>(`/societe/api/expenses.php?socid=${socid}`),
    enabled: !!socid,
  })
}

// --- Payment Information (bank accounts / RIB) --------------------------
// societe/api/paymentmodes.php — real llx_societe_rib rows (or
// CompanyBankAccount when that class is present), confirmed by reading
// that file directly.

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
  paymentmodes: PaymentModeRow[]
}

export function useCustomerPaymentModes(socid: string | undefined) {
  return useQuery({
    queryKey: ['customers', 'detail', socid, 'paymentmodes'],
    queryFn: () => fetchJson<PaymentModesResponse>(`/societe/api/paymentmodes.php?socid=${socid}`),
    enabled: !!socid,
  })
}

// --- Accounts Receivable / Accounts Payable ------------------------------
// societe/api/accounting_ar.php and accounting_ap.php — real open-invoice
// summaries (llx_facture / llx_facture_fourn), confirmed by reading both
// files directly.

export interface AccountingInvoiceRow {
  id: number
  ref: string
  date: string
  due_date: string
  total_ht: number
  total_ttc: number
  paid: number
  open: number
  status: number
  paye: number
}

export interface AccountingSummary {
  total_invoiced: number
  total_paid: number
  total_open: number
  invoice_count: number
  open_count: number
}

export interface AccountingResponse {
  summary: AccountingSummary
  invoices: AccountingInvoiceRow[]
}

export function useCustomerAccountsReceivable(socid: string | undefined) {
  return useQuery({
    queryKey: ['customers', 'detail', socid, 'accountingAr'],
    queryFn: () => fetchJson<AccountingResponse>(`/societe/api/accounting_ar.php?socid=${socid}`),
    enabled: !!socid,
  })
}

export function useCustomerAccountsPayable(socid: string | undefined) {
  return useQuery({
    queryKey: ['customers', 'detail', socid, 'accountingAp'],
    queryFn: () => fetchJson<AccountingResponse>(`/societe/api/accounting_ap.php?socid=${socid}`),
    enabled: !!socid,
  })
}

// --- General Ledger -----------------------------------------------------
// societe/api/general_ledger.php — real bank movements (via bank_url) plus
// real bookkeeping lines (accounting_bookkeeping matched on this record's
// own accounting code), confirmed by reading that file directly.

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
  movements: LedgerMovementRow[]
  code_compta: string
}

export function useCustomerGeneralLedger(socid: string | undefined) {
  return useQuery({
    queryKey: ['customers', 'detail', socid, 'generalLedger'],
    queryFn: () => fetchJson<GeneralLedgerResponse>(`/societe/api/general_ledger.php?socid=${socid}`),
    enabled: !!socid,
  })
}
