import { useQuery } from '@tanstack/react-query'
import { looksLikeLegacyLoginPageText, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'
import { parseApprovals, parseExpenseCreateForm, parseExpenseDashboard, parsePayments, type ApprovalRow, type ExpenseCreateForm, type ExpenseDashboard, type PaymentRow } from './expensePagesParser'

// The expense module's own tabs are PHP pages the backend serves as `{ success, html }` from
// expense/api/expense_content.php?action=<tab>&ajax=1 (the same call its own tab bar makes).
export type Tab = 'overview' | 'approvals' | 'payments' | 'create' | 'card' | 'advances' | 'reimbursements' | 'repayments' | 'recurring' | 'reports' | 'analytics'

export async function fetchExpenseFragment(tab: Tab, id?: string, params?: Record<string, string>): Promise<string> {
  const query = new URLSearchParams({ action: tab, ajax: '1', ...(id ? { id } : {}), ...params })
  const res = await fetch(`/expense/api/expense_content.php?${query}`, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  const body = await res.text()
  if (looksLikeLegacyLoginPageText(body)) throw new Error(NOT_SIGNED_IN_MESSAGE)
  let json: { success?: boolean; message?: string; html?: string }
  try {
    json = JSON.parse(body)
  } catch {
    throw new Error('The expense page did not answer as expected.')
  }
  if (!json.success) throw new Error(json.message || 'The expense page could not be loaded.')
  return json.html ?? ''
}

// The keys start with 'expenses' so every expense mutation's invalidateQueries(['expenses']) refreshes them.
export function useExpenseDashboard() {
  return useQuery({
    queryKey: ['expenses', 'page', 'overview'],
    queryFn: async (): Promise<ExpenseDashboard> => parseExpenseDashboard(await fetchExpenseFragment('overview')),
  })
}

export function useExpenseApprovals() {
  return useQuery({
    queryKey: ['expenses', 'page', 'approvals'],
    queryFn: async (): Promise<ApprovalRow[]> => parseApprovals(await fetchExpenseFragment('approvals')),
  })
}

export function useExpensePayments() {
  return useQuery({
    queryKey: ['expenses', 'page', 'payments'],
    queryFn: async (): Promise<{ rows: PaymentRow[]; note: string }> => parsePayments(await fetchExpenseFragment('payments')),
  })
}

// The New Expense page's own dropdown options (users, approvers, VAT rates, projects, vendors, products).
export function useExpenseCreateForm() {
  return useQuery({
    queryKey: ['expenses', 'form', 'create'],
    queryFn: async (): Promise<ExpenseCreateForm> => parseExpenseCreateForm(await fetchExpenseFragment('create')),
    staleTime: 1000 * 60 * 5,
  })
}
