import { Receipt } from 'lucide-react'
import { ROUTES } from '../../routes'
import type { NavSection } from '../navTypes'

// Mirrors the real app's "Expenses" top-level sidebar icon (llx_menu,
// mainmenu='expences' → /expense/list.php). That page has zero child rows
// in llx_menu — the real 11-tab structure lives only in the SPA's own
// (currently unrendered) core/menus/ecumenu/expences-link.php array, read
// directly this session since there's no live page to observe it on.
// "List" is genuinely real and wired (expense/ajax/expense_list.php); every
// other item is a real backing page/API not yet rebuilt — see
// expensesPlaceholders.ts for why (in short: the legacy page's own tab
// navigation was never actually shown to a user either).
export const nav: NavSection = {
  key: 'expenses',
  label: 'Expenses',
  icon: Receipt,
  items: [
    { label: 'Overview', path: ROUTES.expensesOverview },
    { label: 'List', path: ROUTES.expensesList },
    { label: 'Create', path: ROUTES.expensesCreate },
    { label: 'Approvals', path: ROUTES.expensesApprovals },
    { label: 'Payments', path: ROUTES.expensesPayments },
    { label: 'Advances', path: ROUTES.expensesAdvances },
    { label: 'Reimbursements', path: ROUTES.expensesReimbursements },
    { label: 'Repayments', path: ROUTES.expensesRepayments },
    { label: 'Recurring', path: ROUTES.expensesRecurring },
    { label: 'Reports', path: ROUTES.expensesReports },
    { label: 'Analytics', path: ROUTES.expensesAnalytics },
    { label: 'Budgets', path: ROUTES.expensesBudgets },
  ],
}
