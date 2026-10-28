import { Receipt } from 'lucide-react'
import { ROUTES } from '../../routes'
import type { NavSection } from '../navTypes'

// Mirrors the real app's "Expenses" top-level sidebar icon (llx_menu,
// mainmenu='expences' → /expense/list.php). That page has no child rows in
// llx_menu — its 11-tab structure lives only in the SPA's own
// core/menus/ecumenu/expences-link.php array. Because the live tree is
// empty, buildNavSections.ts falls back to this file's own items for the
// 'expenses' key (see FALLBACK_TO_LOCAL_NAV_KEYS there) rather than
// rendering an empty section (see expenses.queries.ts's header comment;
// only Budgets is design-only, no JSON API on this backend).
export const nav: NavSection = {
  key: 'expenses',
  label: 'Expenses',
  icon: Receipt,
  items: [
    { label: 'Dashboard', path: ROUTES.expensesOverview },
    { label: 'New Expense', path: ROUTES.expensesCreate },
    { label: 'List', path: ROUTES.expensesList },
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
