import { Receipt } from 'lucide-react'
import { ROUTES } from '../../routes'
import type { NavSection } from '../navTypes'

// Mirrors the real app's "Expenses" top-level sidebar icon (llx_menu,
// mainmenu='expences' → /expense/list.php). That page has zero child rows
// in llx_menu at all — its real 11-tab structure lives only in the SPA's
// own (currently unrendered) core/menus/ecumenu/expences-link.php array,
// read directly this session since there's no live page to observe it on.
// Because the live tree is empty, buildNavSections.ts falls back to this
// file's own items directly for the 'expenses' key (see
// FALLBACK_TO_LOCAL_NAV_KEYS there) rather than rendering an empty
// section — every item below is a real, already-verified page (see
// expenses.queries.ts's header comment for the full real-vs-not
// breakdown; only Budgets is design-only, no JSON API on this backend).
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
