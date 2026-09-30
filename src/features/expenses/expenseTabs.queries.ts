import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchExpenseFragment } from './expensePages.queries'
import { postExpenseAction } from './expenses.queries'
import {
  parseAdvances,
  parseAnalytics,
  parseRecurring,
  parseReimbursements,
  parseReports,
  parseRepayments,
  type AdvancesPage,
  type AnalyticsPage,
  type RecurringPage,
  type ReimbursementsPage,
  type ReportsPage,
  type RepaymentsPage,
} from './expenseTabsParser'

// Reads of the expense module's Advances / Reimbursements / Repayments / Recurring / Reports / Analytics
// pages. Every key starts with 'expenses' so a mutation's invalidateQueries(['expenses']) refreshes them.
export function useAdvances() {
  return useQuery({ queryKey: ['expenses', 'page', 'advances'], queryFn: async (): Promise<AdvancesPage> => parseAdvances(await fetchExpenseFragment('advances')) })
}
export function useReimbursements() {
  return useQuery({ queryKey: ['expenses', 'page', 'reimbursements'], queryFn: async (): Promise<ReimbursementsPage> => parseReimbursements(await fetchExpenseFragment('reimbursements')) })
}
export function useRepayments() {
  return useQuery({ queryKey: ['expenses', 'page', 'repayments'], queryFn: async (): Promise<RepaymentsPage> => parseRepayments(await fetchExpenseFragment('repayments')) })
}
export function useRecurring() {
  return useQuery({ queryKey: ['expenses', 'page', 'recurring'], queryFn: async (): Promise<RecurringPage> => parseRecurring(await fetchExpenseFragment('recurring')) })
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
    queryFn: async (): Promise<ReportsPage> => {
      const params = filters
        ? { year_from: filters.yearFrom, month_from: filters.monthFrom, year_to: filters.yearTo, month_to: filters.monthTo, dept: filters.dept, branch: filters.branch }
        : undefined
      return parseReports(await fetchExpenseFragment('reports', undefined, params))
    },
  })
}
export function useExpenseAnalytics(year: string | null) {
  return useQuery({
    queryKey: ['expenses', 'page', 'analytics', year],
    queryFn: async (): Promise<AnalyticsPage> => parseAnalytics(await fetchExpenseFragment('analytics', undefined, year ? { year } : undefined)),
  })
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

// Pause / Resume is the page's own link (recurring.php?action=toggle_active&rid=…&active=…), a plain GET.
export const useToggleRecurring = () =>
  useExpenseWrite(async (i: { rid: string; active: string }) => {
    const res = await fetch(`/expense/recurring.php?${new URLSearchParams({ action: 'toggle_active', rid: i.rid, active: i.active })}`, { credentials: 'same-origin' })
    if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  })
