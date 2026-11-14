import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { postExpenseAction } from './expenses.queries'
import { notAvailable } from './expenseJsonSource'
import { readAnalytics, readReportsPage, type ReportsFilters } from './expenseJsonSource'
import type {
  AdvancesPage,
  AnalyticsPage,
  BudgetsPage,
  NewBudgetInput,
  RecurringPage,
  ReimbursementsPage,
  ReportsPage,
  RepaymentsPage,
} from './expenseTabs.types'

export type { BudgetsPage, NewBudgetInput }

// Advances, Reimbursements, Repayments, Recurring, Reports, Analytics and Budgets have no JSON feed on any backend checked (expense/fapi is a 404
// everywhere, and the module's own pages for them are HTML), so each says so instead of reading a page. Every key starts with 'expenses' so a
// mutation's invalidateQueries(['expenses']) refreshes them.
const unavailable = (what: string) => async (): Promise<never> => {
  throw notAvailable(what)
}
export function useAdvances() {
  return useQuery({ queryKey: ['expenses', 'page', 'advances'], queryFn: unavailable('Advances') as () => Promise<AdvancesPage> })
}
export function useReimbursements() {
  return useQuery({ queryKey: ['expenses', 'page', 'reimbursements'], queryFn: unavailable('Reimbursements') as () => Promise<ReimbursementsPage> })
}
export function useRepayments() {
  return useQuery({ queryKey: ['expenses', 'page', 'repayments'], queryFn: unavailable('Repayments') as () => Promise<RepaymentsPage> })
}
export function useRecurring() {
  return useQuery({ queryKey: ['expenses', 'page', 'recurring'], queryFn: unavailable('Recurring expenses') as () => Promise<RecurringPage> })
}

export type { ReportsFilters } from './expenseJsonSource'
// `filters` null = the page's own defaults (this year, January to December).
export function useExpenseReportsPage(filters: ReportsFilters | null) {
  return useQuery({ queryKey: ['expenses', 'page', 'reports', filters], queryFn: (): Promise<ReportsPage> => readReportsPage(filters) })
}
export function useExpenseAnalytics(year: string | null) {
  return useQuery({ queryKey: ['expenses', 'page', 'analytics', year], queryFn: (): Promise<AnalyticsPage> => readAnalytics(year) })
}

export function useExpenseBudgets(year: string) {
  return useQuery({ queryKey: ['expenses', 'page', 'budgets', year], queryFn: unavailable('Budgets') as () => Promise<BudgetsPage> })
}

// ── Writes (expense/api/expense.php) ────────────────────────────────────────────────────────────────
function useExpenseWrite<TInput>(run: (input: TInput) => Promise<void>) {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: run, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses'] }) })
}

async function call(action: string, params: Record<string, string>, fallback: string): Promise<void> {
  const json = await postExpenseAction(action, params)
  if (!json.success) throw new Error(json.message || fallback)
}

// `method` is a c_paiement code (LIQ, VIR, CHQ…) or "salary"; every method but salary posts to a bank account.
export interface CreateAdvanceInput {
  userId: string
  amount: string
  method: string
  accountId: string
  date: string
  note: string
  // The ledger account the page's form shows read-only (Accounting > Default accounts) and posts as account_code.
  accountCode?: string
}
export const useCreateAdvance = () =>
  useExpenseWrite((i: CreateAdvanceInput) =>
    call(
      'create_advance',
      {
        fk_user: i.userId,
        amount: i.amount,
        method: i.method,
        accountid: i.accountId,
        date_advance: i.date,
        note: i.note,
        ...(i.accountCode ? { account_code: i.accountCode } : {}),
      },
      'Could not create the advance payment.',
    ),
  )

export interface MoneyBackInput {
  id: string
  amount: string
  method: string
  accountId: string
  numPayment: string
  note: string
}
// Money the employee hands back against an open advance.
export const useRepayAdvance = () =>
  useExpenseWrite((i: MoneyBackInput) =>
    call(
      'repay_advance',
      { advance_id: i.id, amount: i.amount, method: i.method, accountid: i.accountId, num_payment: i.numPayment, note: i.note },
      'Could not record the return.',
    ),
  )

// Money collected against a repayment (an expense report whose advance was larger than the expense).
export const useSettleRepayment = () =>
  useExpenseWrite((i: MoneyBackInput) =>
    call(
      'settle_repayment',
      { fk_expensereport: i.id, amount: i.amount, method: i.method, accountid: i.accountId, num_payment: i.numPayment, note: i.note },
      'Could not record the return.',
    ),
  )

export const useApproveRepayment = () =>
  useExpenseWrite((id: string) => call('approve_repayment', { fk_expensereport: id }, 'Could not approve the repayment.'))

export interface CreateReimbursementInput {
  reportId: string
  recipientId: string
  recipientType: string
  claimAmount: string
}
export const useCreateReimbursement = () =>
  useExpenseWrite((i: CreateReimbursementInput) =>
    call(
      'create_reimburse',
      { fk_expensereport: i.reportId, fk_user_employee: i.recipientId, recipient_type: i.recipientType, claim_amount: i.claimAmount },
      'Could not create the reimbursement.',
    ),
  )

export interface CreateRepaymentInput {
  reportId: string
  advanceAmount: string
  method: string
  settleAmount: string
}
export const useCreateRepayment = () =>
  useExpenseWrite((i: CreateRepaymentInput) =>
    call(
      'create_repayment',
      { fk_expensereport: i.reportId, advance_amount: i.advanceAmount, method: i.method, settle_amount: i.settleAmount },
      'Could not save the repayment.',
    ),
  )

export interface CreateRecurringInput {
  templateId: string
  frequency: string
  dateStart: string
  dateEnd: string
  autoCreate: boolean
  // "Amount (opt.)": what each run books when it differs from the template; empty = the template's own total.
  amount?: string
  // Set when editing a schedule (the page's form then sends update_recurring with its id).
  rid?: string
}
export const useCreateRecurring = () =>
  useExpenseWrite((i: CreateRecurringInput) =>
    call(
      i.rid ? 'update_recurring' : 'create_recurring',
      {
        ...(i.rid ? { rid: i.rid } : { fk_expensereport_tpl: i.templateId, active: '1' }),
        frequency: i.frequency,
        date_start: i.dateStart,
        ...(i.dateEnd ? { date_end: i.dateEnd } : {}),
        auto_create: i.autoCreate ? '1' : '0',
        amount: i.amount ?? '',
      },
      i.rid ? 'Could not update the schedule.' : 'Could not create the recurring template.',
    ),
  )

// The row buttons of the page: pause_recurring / resume_recurring / delete_recurring (rid = the schedule id), and "Run recurring".
export const useRecurringAction = () =>
  useExpenseWrite((i: { action: 'pause_recurring' | 'resume_recurring' | 'delete_recurring'; rid: string }) =>
    call(i.action, { rid: i.rid }, 'The schedule could not be changed.'),
  )
export const useRunRecurring = () => useExpenseWrite((_: void) => call('run_recurring', {}, 'The recurring run failed.'))

export interface RecurringRun {
  run_date: string
  ref?: string
  expense_id?: number | string
  result: string
  error?: string
  datec?: string
}
// The History dialog: every run of one schedule.
export async function fetchRecurringHistory(rid: string): Promise<RecurringRun[]> {
  const json = await postExpenseAction('recurring_history', { rid })
  if (!json.success) throw new Error(json.message || 'Could not load the history.')
  return (json.data as unknown as RecurringRun[]) ?? []
}

// Pause / Resume of the Recurring page: the page's own pause_recurring / resume_recurring actions.
export const useToggleRecurring = () =>
  useExpenseWrite(async (i: { rid: string; active: string }) =>
    call(i.active === '1' ? 'resume_recurring' : 'pause_recurring', { rid: i.rid }, 'The schedule could not be changed.'),
  )

// Budgets have no endpoint on any backend checked.
export const useCreateBudget = () =>
  useExpenseWrite(async (_: NewBudgetInput) => {
    throw notAvailable('Budgets')
  })
