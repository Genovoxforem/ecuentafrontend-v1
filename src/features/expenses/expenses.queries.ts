import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// The real backend at expense/ is a custom-built SPA — 11 tabs, each its own PHP page, routed client-side
// via expense/js/expense-spa.js's hash router and fetched through
// expense/api/expense_content.php (action=<tab>&ajax=1 → {success, html}).
// Most tabs are server-rendered PHP+SQL with no JSON read endpoint. The ones this app shows natively
// (Dashboard, Approvals, Payments and the New Expense form's dropdowns) are read from those fragments —
// see expensePagesParser.ts / expensePages.queries.ts. The others (Advances, Reimbursements, Repayments,
// Recurring, Reports, Analytics) still build on the JSON below.
//
// What IS real and JSON: (1) expense/ajax/expense_list.php — a genuine,
// permission-checked (hasRight('expensereport','lire')), filterable,
// sortable, real-child-user-scoped DataTables endpoint against
// llx_expensereport, confirmed to return every matching row unpaginated
// when `length=-1` (`if ($rowperpage > 0) plimit(...)`) — reused below by
// several screens (Reports/Analytics, the List, plus
// the Create/Reimbursement/Repayment/Recurring forms' own report-picker
// dropdowns) instead of scraping each tab's own broken/absent list.
// (2) expense/api/expense_types.php + expense/ajax/entity_search.php —
// real Select2-style dropdown feeds (expense types, users, customers,
// vendors) against llx_c_type_fees/llx_user/llx_societe.
// (3) expense/api/lines.php and expense/api/expense.php — real, genuine
// mutating JSON actions (create draft, add/save lines, submit for
// validation, approve/refuse, create payment, create advance, reconcile
// advance, create reimbursement, create repayment, approve repayment,
// create recurring template) — every one confirmed by reading its handler
// function directly (exact GETPOST param names, exact SQL writes), not
// guessed. Wired below and consumed by the rebuilt screens.
//
// Two real, confirmed-live quirks worth knowing when reading the screens
// built against this file: (a) the Dashboard's own real "Pending Approval"
// KPI counts fk_statut=1, a status value nothing in this module ever
// actually sets (submissions go 0→2 directly) — this app's Overview page
// instead counts fk_statut=2 ("Submitted"), which is what a user actually
// means by that label; (b) llx_expensereport's `repay_status`/
// `advance_amount` columns (Repayments) and llx_expense_advance/
// llx_expense_reimbursement (Advances/Reimbursements) have real create/
// approve JSON actions but no real JSON list endpoint at all, so those 3
// screens' own history tables have no live data source and say so rather
// than being invented or scraped.

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

export interface ExpenseReportRow {
  id: number
  ref: string
  linkedTo: string
  user: string
  dateStart: string
  dateEnd: string
  dateCreate: string
  totalHt: string
  totalTva: string
  totalTtc: string
  status: string
  paid: boolean
  notes: string
  // The user / linked-to cells as the backend prints them (link, photo, hover card); parse with parseParty.
  userHtml: string
  linkedHtml: string
}
interface RawExpenseListResponse {
  draw: number
  recordsTotal: number
  recordsFiltered: number
  aaData: Array<{
    ref: string
    rowid: number
    linked_to: string
    user: string
    date_debut: string
    date_fin: string
    date_create: string
    total_ht: string
    total_tva: string
    total_ttc: string
    status: string
    paid: string
    notes: string
  }>
  error?: string
}

export interface ExpenseListFilters {
  status: string
  dateFrom: string
  dateTo: string
  // Server-side, like the backend's own table: the search box, and one sortable column (a key of the
  // endpoint's `columns[].data`, e.g. 'date_create') with its direction.
  search?: string
  orderBy?: string
  orderDir?: 'asc' | 'desc'
}

export function useExpenseReportsList(filters: ExpenseListFilters, page: number, length: number) {
  return useQuery({
    queryKey: ['expenses', 'list', filters, page, length],
    queryFn: async (): Promise<{ rows: ExpenseReportRow[]; total: number; filtered: number }> => {
      const body = new URLSearchParams({ draw: '1', start: String(page * length), length: String(length) })
      if (filters.status) body.set('filter_status', filters.status)
      if (filters.dateFrom) body.set('filter_date_from', filters.dateFrom)
      if (filters.dateTo) body.set('filter_date_to', filters.dateTo)
      if (filters.search) body.set('search[value]', filters.search)
      if (filters.orderBy) {
        body.set('order[0][column]', '0')
        body.set('order[0][dir]', filters.orderDir ?? 'desc')
        body.set('columns[0][data]', filters.orderBy)
      }
      const res = await fetch('/expense/ajax/expense_list.php', { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const data: RawExpenseListResponse = await res.json()
      if (data.error) throw new Error(data.error)
      return {
        rows: data.aaData.map((r) => ({
          id: r.rowid,
          ref: stripTags(r.ref),
          linkedTo: stripTags(r.linked_to),
          user: stripTags(r.user),
          dateStart: r.date_debut,
          dateEnd: r.date_fin,
          dateCreate: r.date_create,
          totalHt: r.total_ht,
          totalTva: r.total_tva,
          totalTtc: r.total_ttc,
          status: stripTags(r.status),
          paid: stripTags(r.paid).toLowerCase() === 'paid',
          notes: r.notes,
          userHtml: r.user,
          linkedHtml: r.linked_to,
        })),
        total: data.recordsTotal,
        filtered: data.recordsFiltered,
      }
    },
  })
}

// Thin convenience wrapper over the same real endpoint with length=-1 (see
// header comment) — used by every screen below that needs the full real
// row set to compute its own view (Dashboard KPIs/trend, Approvals list,
// Payments list, Reports "By Employee", Analytics charts, and the report-
// picker dropdowns on the Reimbursement/Repayment/Recurring forms).
export function useAllExpenseReports(status = '') {
  return useExpenseReportsList({ status, dateFrom: '', dateTo: '' }, 0, -1)
}

export interface ExpenseTypeOption {
  id: number
  label: string
}
interface RawExpenseTypesResponse {
  success: boolean
  results: Array<{ id: number; text: string }>
}
export function useExpenseTypes() {
  return useQuery({
    queryKey: ['expenses', 'types'],
    queryFn: async (): Promise<ExpenseTypeOption[]> => {
      const res = await fetch('/expense/api/expense_types.php', { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const data: RawExpenseTypesResponse = await res.json()
      if (!data.success) throw new Error('Legacy backend rejected the request.')
      return data.results.map((r) => ({ id: r.id, label: r.text }))
    },
    staleTime: 1000 * 60 * 10,
  })
}

// Real via expense/ajax/entity_search.php — Select2-style search feeds for
// the Create/Advance/Reimbursement forms' user/customer/vendor pickers.
export interface EntityOption {
  id: number
  text: string
}
export function useEntitySearch(type: 'user' | 'customer' | 'vendor', q: string, enabled = true) {
  return useQuery({
    queryKey: ['expenses', 'entitySearch', type, q],
    queryFn: async (): Promise<EntityOption[]> => {
      const body = new URLSearchParams({ type, q })
      const res = await fetch('/expense/ajax/entity_search.php', { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const data: { results: EntityOption[] } = await res.json()
      return data.results
    },
    enabled,
    staleTime: 30_000,
  })
}

function toEpochSeconds(dateStr: string): number {
  return Math.floor(new Date(`${dateStr}T00:00:00`).getTime() / 1000)
}

export interface RawActionResponse {
  success: boolean
  message?: string
  data?: Record<string, unknown>
}

export async function postExpenseAction(action: string, params: Record<string, string>): Promise<RawActionResponse> {
  const body = new URLSearchParams({ action, ...params })
  const res = await fetch('/expense/api/expense.php', { method: 'POST', credentials: 'same-origin', body })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  return res.json()
}

async function postLinesAction(action: string, params: Record<string, string>): Promise<RawActionResponse> {
  const body = new URLSearchParams({ action, ...params })
  const res = await fetch('/expense/api/lines.php', { method: 'POST', credentials: 'same-origin', body })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  return res.json()
}

// ── Create / New Expense (expense/api/lines.php) ───────────────────────────
// Real via action=createDraft — genuine INSERT into llx_expensereport plus
// the module's own bolted-on expense_type/socid/employeeid columns
// (expenseSaveExtended()). date_debut/date_fin are read server-side via
// GETPOST(...,'int') — real epoch seconds, not a date string.
export interface CreateExpenseDraftInput {
  dateStart: string
  dateEnd: string
  userId: number
  validatorId?: number
  projectId?: number
  notePublic?: string
  notePrivate?: string
  expenseType: 'internal' | 'employee' | 'customer' | 'vendor'
  socid?: number
  employeeId?: number
}
export function useCreateExpenseDraft() {
  return useMutation({
    mutationFn: async (input: CreateExpenseDraftInput): Promise<number> => {
      const params: Record<string, string> = {
        date_debut: String(toEpochSeconds(input.dateStart)),
        date_fin: String(toEpochSeconds(input.dateEnd || input.dateStart)),
        fk_user_author: String(input.userId),
        expense_type: input.expenseType,
      }
      if (input.validatorId) params.fk_user_validator = String(input.validatorId)
      if (input.projectId) params.fk_project = String(input.projectId)
      if (input.notePublic) params.note_public = input.notePublic
      if (input.notePrivate) params.note_private = input.notePrivate
      if (input.socid) params.socid = String(input.socid)
      if (input.employeeId) params.employeeid = String(input.employeeId)
      const json = (await postLinesAction('createDraft', params)) as RawActionResponse & { expense_report_id?: number }
      if (!json.success || !json.expense_report_id) throw new Error(json.message || 'Could not create the draft expense report.')
      return json.expense_report_id
    },
  })
}

// Real via action=saveCachedLines — bulk-saves the Item Table's rows
// (obj->addline() per row) in one call, matching the real form's own
// "cache lines until Save" behavior. `date` here is a plain YYYY-MM-DD
// string (server does strtotime()), unlike the header's epoch-int dates.
export interface ExpenseDraftLine {
  fkTypeFees: number
  date: string
  comments?: string
  qty: number
  valueUnit: number
  vatrate: string
  fkProject?: number
  fkProduct?: number
}
export function useSaveExpenseLines() {
  return useMutation({
    mutationFn: async ({ expenseReportId, lines }: { expenseReportId: number; lines: ExpenseDraftLine[] }) => {
      const json = await postLinesAction('saveCachedLines', {
        expense_report_id: String(expenseReportId),
        lines: JSON.stringify(
          lines.map((l) => ({
            fk_c_type_fees: l.fkTypeFees,
            date: l.date,
            comments: l.comments ?? '',
            qty: l.qty,
            value_unit: l.valueUnit,
            vatrate: l.vatrate,
            fk_project: l.fkProject ?? 0,
            fk_product: l.fkProduct ?? 0,
          })),
        ),
      })
      if (!json.success) throw new Error(json.message || 'Could not save the expense lines.')
      return json.data
    },
  })
}

// Real via action=submitForValidation — sets fk_statut 0→2, only from Draft.
export function useSubmitExpenseForValidation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (expenseReportId: number) => {
      const json = await postLinesAction('submitForValidation', { expense_report_id: String(expenseReportId) })
      if (!json.success) throw new Error(json.message || 'Could not submit the expense report for validation.')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses'] }),
  })
}

// ── Header-level mutations (expense/api/expense.php) ────────────────────────
// Real via action=changeStatus — approve calls ExpenseReport->setApproved()
// (falls back to raw SQL fk_statut=5); refuse falls back to fk_statut=99.
export function useChangeExpenseStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status, comment }: { id: number; status: 'approve' | 'refuse'; comment?: string }) => {
      const json = await postExpenseAction('changeStatus', { id: String(id), status, comment: comment ?? '' })
      if (!json.success) throw new Error(json.message || `Could not ${status} the expense report.`)
      return json.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses'] }),
  })
}

// Real via action=create_payment — genuine PaymentExpenseReport::create() +
// addPaymentToBank(), only allowed from fk_statut 5/3 ("to_paid" right
// required server-side). fk_typepayment is the c_paiement CODE (e.g. "LIQ"),
// not a numeric id — the server resolves it itself.
export interface CreateExpensePaymentInput {
  id: number
  amount: number
  fkTypePayment: string
  accountId?: number
  date: string
  numPayment?: string
  notePublic?: string
}
export function useCreateExpensePayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateExpensePaymentInput) => {
      const d = new Date(`${input.date}T00:00:00`)
      const params: Record<string, string> = {
        id: String(input.id),
        amount: String(input.amount),
        fk_typepayment: input.fkTypePayment,
        reday: String(d.getDate()),
        remonth: String(d.getMonth() + 1),
        reyear: String(d.getFullYear()),
      }
      if (input.accountId) params.accountid = String(input.accountId)
      if (input.numPayment) params.num_payment = input.numPayment
      if (input.notePublic) params.note_public = input.notePublic
      const json = await postExpenseAction('create_payment', params)
      if (!json.success) throw new Error(json.message || 'Could not record the payment.')
      return json.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses'] }),
  })
}

// Real payment-mode / bank-account dropdown feeds — core Dolibarr APIs
// (outside expense/) that the real Payments modal's own Select2s call.
export interface PaymentTypeOption {
  id: string
  text: string
}
export function usePaymentTypes() {
  return useQuery({
    queryKey: ['expenses', 'paymentTypes'],
    queryFn: async (): Promise<PaymentTypeOption[]> => {
      const res = await fetch('/api/payment_types.php', { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const data: { results?: PaymentTypeOption[] } = await res.json()
      return data.results ?? []
    },
    staleTime: 1000 * 60 * 10,
  })
}
export interface BankAccountOption {
  id: number
  text: string
}
export function useBankAccounts() {
  return useQuery({
    queryKey: ['expenses', 'bankAccounts'],
    queryFn: async (): Promise<BankAccountOption[]> => {
      const res = await fetch('/api/bank_accounts.php', { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const data: { results?: BankAccountOption[] } = await res.json()
      return data.results ?? []
    },
    staleTime: 1000 * 60 * 10,
  })
}
