import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { loadExpenseList, loadExpenseTypes, searchEntities } from './expenseFapi'
import type { ExpenseParty } from './expensePagesParser'

// The expense module (expense/) is a custom SPA. Its reads now come from the key-authenticated expense/fapi (see expenseFapi.ts): the
// dashboard, approvals, payments, the report list, the types and entity pickers, advances, reimbursements, repayments, recurring,
// reports, analytics and budgets. The writes below still go to the module's own session endpoints, because the fapi writers
// (expense.php, lines.php, documents.php) only answer a plan ({executed: false, would_execute: [...]}) and write nothing: the New
// Expense form (lines.php createDraft / saveCachedLines / submitForValidation), approve / refuse (expense.php changeStatus), the payment
// (create_payment) and the advance / reimbursement / repayment / recurring creates. Those handlers were read directly (exact GETPOST
// parameter names, exact SQL writes).

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
  // Who the report belongs to and who it is linked to, for the party links (null when not linked to anyone).
  userParty: ExpenseParty | null
  linkedParty: ExpenseParty | null
}

export interface ExpenseListFilters {
  status: string
  dateFrom: string
  dateTo: string
  // Server-side: the search box, and one sortable column (named like the item's field, e.g. 'date_create') with its direction.
  search?: string
  orderBy?: string
  orderDir?: 'asc' | 'desc'
}

export function useExpenseReportsList(filters: ExpenseListFilters, page: number, length: number) {
  return useQuery({
    queryKey: ['expenses', 'list', filters, page, length],
    // expense/fapi/list.php: searched, sorted and paged by the backend, own + subordinates' reports unless the user may read all
    queryFn: (): Promise<{ rows: ExpenseReportRow[]; total: number; filtered: number }> => loadExpenseList(filters, page, length),
  })
}

export interface ExpenseTypeOption {
  id: number
  label: string
}
export function useExpenseTypes() {
  return useQuery({
    queryKey: ['expenses', 'types'],
    queryFn: (): Promise<ExpenseTypeOption[]> => loadExpenseTypes(),
    staleTime: 1000 * 60 * 10,
  })
}

// expense/fapi/entity_search.php: the user / customer / vendor pickers of the Create, Advance and Reimbursement forms.
export interface EntityOption {
  id: number
  text: string
}
export function useEntitySearch(type: 'user' | 'customer' | 'vendor', q: string, enabled = true) {
  return useQuery({
    queryKey: ['expenses', 'entitySearch', type, q],
    queryFn: (): Promise<EntityOption[]> => searchEntities(type, q),
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
