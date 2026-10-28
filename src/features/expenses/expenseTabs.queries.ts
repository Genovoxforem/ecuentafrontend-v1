import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { postExpenseAction } from './expenses.queries'
import { createBudget, loadAdvances, loadAnalytics, loadBudgets, loadRecurring, loadReimbursements, loadReports, loadRepayments, toggleRecurring, type BudgetsPage, type NewBudgetInput } from './expenseFapi'
import type { AdvancesPage, AnalyticsPage, RecurringPage, ReimbursementsPage, ReportsPage, RepaymentsPage } from './expenseTabs.types'

// Reads of the expense module's Advances / Reimbursements / Repayments / Recurring / Reports / Analytics / Budgets pages, from
// expense/fapi (expenseFapi.ts). Every key starts with 'expenses' so a mutation's invalidateQueries(['expenses']) refreshes them.
export function useAdvances() {
  return useQuery({ queryKey: ['expenses', 'page', 'advances'], queryFn: (): Promise<AdvancesPage> => loadAdvances() })
}
export function useReimbursements() {
  return useQuery({ queryKey: ['expenses', 'page', 'reimbursements'], queryFn: (): Promise<ReimbursementsPage> => loadReimbursements() })
}
export function useRepayments() {
  return useQuery({ queryKey: ['expenses', 'page', 'repayments'], queryFn: (): Promise<RepaymentsPage> => loadRepayments() })
}
export function useRecurring() {
  return useQuery({ queryKey: ['expenses', 'page', 'recurring'], queryFn: (): Promise<RecurringPage> => loadRecurring() })
}

export interface ReportsFilters {
  yearFrom: string
  monthFrom: string
  yearTo: string
  monthTo: string
  dept: string
  branch: string
}
// `filters` null = the page's own defaults (this year, January to December).
export function useExpenseReportsPage(filters: ReportsFilters | null) {
  return useQuery({
    queryKey: ['expenses', 'page', 'reports', filters],
    queryFn: (): Promise<ReportsPage> => loadReports(filters),
  })
}
export function useExpenseAnalytics(year: string | null) {
  return useQuery({
    queryKey: ['expenses', 'page', 'analytics', year],
    queryFn: (): Promise<AnalyticsPage> => loadAnalytics(year),
  })
}

export function useExpenseBudgets(year: string) {
  return useQuery({ queryKey: ['expenses', 'page', 'budgets', year], queryFn: (): Promise<BudgetsPage> => loadBudgets(year) })
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
}
export const useCreateAdvance = () =>
  useExpenseWrite((i: CreateAdvanceInput) =>
    call('create_advance', { fk_user: i.userId, amount: i.amount, method: i.method, accountid: i.accountId, date_advance: i.date, note: i.note }, 'Could not create the advance payment.'),
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
    call('repay_advance', { advance_id: i.id, amount: i.amount, method: i.method, accountid: i.accountId, num_payment: i.numPayment, note: i.note }, 'Could not record the return.'),
  )

// Money collected against a repayment (an expense report whose advance was larger than the expense).
export const useSettleRepayment = () =>
  useExpenseWrite((i: MoneyBackInput) =>
    call('settle_repayment', { fk_expensereport: i.id, amount: i.amount, method: i.method, accountid: i.accountId, num_payment: i.numPayment, note: i.note }, 'Could not record the return.'),
  )

export const useApproveRepayment = () => useExpenseWrite((id: string) => call('approve_repayment', { fk_expensereport: id }, 'Could not approve the repayment.'))

export interface CreateReimbursementInput {
  reportId: string
  recipientId: string
  recipientType: string
  claimAmount: string
}
export const useCreateReimbursement = () =>
  useExpenseWrite((i: CreateReimbursementInput) =>
    call('create_reimburse', { fk_expensereport: i.reportId, fk_user_employee: i.recipientId, recipient_type: i.recipientType, claim_amount: i.claimAmount }, 'Could not create the reimbursement.'),
  )

export interface CreateRepaymentInput {
  reportId: string
  advanceAmount: string
  method: string
  settleAmount: string
}
export const useCreateRepayment = () =>
  useExpenseWrite((i: CreateRepaymentInput) =>
    call('create_repayment', { fk_expensereport: i.reportId, advance_amount: i.advanceAmount, method: i.method, settle_amount: i.settleAmount }, 'Could not save the repayment.'),
  )

export interface CreateRecurringInput {
  templateId: string
  frequency: string
  dateStart: string
  dateEnd: string
  autoCreate: boolean
}
export const useCreateRecurring = () =>
  useExpenseWrite((i: CreateRecurringInput) =>
    call(
      'create_recurring',
      { fk_expensereport_tpl: i.templateId, frequency: i.frequency, date_start: i.dateStart, date_end: i.dateEnd, auto_create: i.autoCreate ? '1' : '0', active: '1' },
      'Could not create the recurring template.',
    ),
  )

// Pause / Resume: expense/fapi/recurring.php?action=toggle_active (`active` is the state the schedule switches to, '1' or '0').
export const useToggleRecurring = () => useExpenseWrite(async (i: { rid: string; active: string }) => void (await toggleRecurring(i.rid, i.active === '1')))

// A new budget line: expense/fapi/budgets.php?action=create.
export const useCreateBudget = () => useExpenseWrite(async (i: NewBudgetInput) => void (await createBudget(i)))
