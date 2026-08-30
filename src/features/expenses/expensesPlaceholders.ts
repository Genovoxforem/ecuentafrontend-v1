import type { ComponentType } from 'react'
import { LayoutDashboard, FilePlus, CheckSquare, CreditCard, Wallet, HandCoins, Undo2, Repeat, BarChart3, LineChart, PiggyBank } from 'lucide-react'
import { ROUTES } from '../../routes'

// Full module audit this session: the "Expenses" sidebar icon
// (mainmenu='expences' in llx_menu) links to a modern custom-built SPA at
// expense/ — NOT the older Dolibarr-stock expensereport/ module (that one
// is real and live too, but reachable under the separate "HRM" icon, out
// of scope here). expense/ has real, working JSON APIs for most of its 11
// tabs (expense/api/expense.php's action router, expense/api/lines.php),
// but every single one of its 12 pages has its own internal tab-bar
// include commented out in the live PHP — meaning a real user has never
// actually seen this navigation rendered, only List (rebuilt for real in
// ExpenseReportsList.tsx) is reachable in practice today. So unlike
// Payroll/Banking's placeholders (real page, NO api), most of these say
// "real API confirmed" — the gap here is UI, not backend: there's no
// reference screenshot to redesign against because the legacy page itself
// was never shown to a user this way either.
export interface ExpensePlaceholder {
  path: string
  icon: ComponentType<{ size?: number; className?: string }>
  title: string
  description: string
}

export const EXPENSE_PLACEHOLDERS: ExpensePlaceholder[] = [
  { path: ROUTES.expensesOverview, icon: LayoutDashboard, title: 'Overview', description: 'Real page: expense/dashboard.php — inline KPI/summary queries, no JSON API confirmed.' },
  {
    path: ROUTES.expensesCreate,
    icon: FilePlus,
    title: 'Create',
    description: 'Real page: expense/create.php, backed by real JSON actions in expense/api/lines.php (createDraft, addLine, saveCachedLines, submitForValidation) — not wired in this pass; the live page\'s own tab navigation is disabled, so no reference UI exists to redesign against.',
  },
  {
    path: ROUTES.expensesApprovals,
    icon: CheckSquare,
    title: 'Approvals',
    description: 'Real page: expense/approvals.php, backed by a real JSON action (expense/api/expense.php?action=changeStatus) — not wired in this pass.',
  },
  {
    path: ROUTES.expensesPayments,
    icon: CreditCard,
    title: 'Payments',
    description: 'Real page: expense/payments.php, backed by real JSON actions (create_payment, set_paid in expense/api/expense.php) — not wired in this pass.',
  },
  {
    path: ROUTES.expensesAdvances,
    icon: Wallet,
    title: 'Advances',
    description: 'Real page: expense/advances.php, backed by real JSON actions (create_advance, reconcile_advance, writing to a real llx_expense_advance table) — not wired in this pass.',
  },
  {
    path: ROUTES.expensesReimbursements,
    icon: HandCoins,
    title: 'Reimbursements',
    description: 'Real page: expense/reimbursements.php, backed by real JSON actions (create_reimburse, pay_reimburse) — not wired in this pass.',
  },
  {
    path: ROUTES.expensesRepayments,
    icon: Undo2,
    title: 'Repayments',
    description:
      'Real page: expense/repayments.php, backed by real JSON actions (create_repayment, approve_repayment). Note: these write to llx_expensereport columns directly — the separate llx_expense_repayment table (12 rows) is dead data the installer no longer populates.',
  },
  {
    path: ROUTES.expensesRecurring,
    icon: Repeat,
    title: 'Recurring',
    description: 'Real page: expense/recurring.php, backed by a real JSON action (create_recurring) — not wired in this pass.',
  },
  { path: ROUTES.expensesReports, icon: BarChart3, title: 'Reports', description: 'Real page: expense/reports.php — inline PHP, no JSON API confirmed.' },
  { path: ROUTES.expensesAnalytics, icon: LineChart, title: 'Analytics', description: 'Real page: expense/analytics.php — inline PHP, no JSON API confirmed.' },
  { path: ROUTES.expensesBudgets, icon: PiggyBank, title: 'Budgets', description: 'Real page: expense/budgets.php, reads/writes a real llx_expense_budget table — not in the SPA\'s own nav array, no confirmed JSON action for it specifically.' },
]
