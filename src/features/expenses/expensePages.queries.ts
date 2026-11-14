import { useQuery } from '@tanstack/react-query'
import type { ApprovalRow, ExpenseCreateForm, ExpenseDashboard, PaymentRow } from './expensePagesParser'
import { readApprovals, readCreateForm, readOverview, readPayments } from './expenseJsonSource'

// The dashboard, approvals and payments are built from the module's JSON (expenseJsonSource.ts): the summary and the report list.
// The keys start with 'expenses' so every expense mutation's invalidateQueries(['expenses']) refreshes them.
export function useExpenseDashboard() {
  return useQuery({ queryKey: ['expenses', 'page', 'overview'], queryFn: (): Promise<ExpenseDashboard> => readOverview() })
}

export function useExpenseApprovals() {
  return useQuery({ queryKey: ['expenses', 'page', 'approvals'], queryFn: (): Promise<ApprovalRow[]> => readApprovals() })
}

export function useExpensePayments() {
  return useQuery({ queryKey: ['expenses', 'page', 'payments'], queryFn: (): Promise<{ rows: PaymentRow[]; note: string }> => readPayments() })
}

// The New Expense page's own dropdown options (users, approvers, VAT rates, projects, vendors, products).
export function useExpenseCreateForm() {
  return useQuery({
    queryKey: ['expenses', 'form', 'create'],
    queryFn: (): Promise<ExpenseCreateForm> => readCreateForm(),
    staleTime: 1000 * 60 * 5,
  })
}
