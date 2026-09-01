import { nav as homeNav } from '../../features/home/home.nav'
import { nav as zraNav } from '../../features/zra/zra.nav'
import { nav as billingNav } from '../../features/billing/billing.nav'
import { nav as purchasesNav } from '../../features/purchases/purchases.nav'
import { nav as productsNav } from '../../features/products/products.nav'
import { nav as warehousesNav } from '../../features/warehouses/warehouses.nav'
import { nav as projectsNav } from '../../features/projects/projects.nav'
import { nav as bankingNav } from '../../features/banking/banking.nav'
import { nav as loansNav } from '../../features/loans/loans.nav'
import { nav as usersNav } from '../../features/users/users.nav'
import { nav as payrollNav } from '../../features/payroll/payroll.nav'
import { nav as expensesNav } from '../../features/expenses/expenses.nav'
import { nav as specialExpensesNav } from '../../features/expenses/specialExpenses.nav'
import { nav as budgetNav } from '../../features/budget/budget.nav'
import { nav as kitchenNav } from '../../features/kitchen/kitchen.nav'
import { nav as fixedAssetNav } from '../../features/fixedAsset/fixedAsset.nav'
import { nav as generalLedgerNav } from '../../features/generalLedger/generalLedger.nav'
import { nav as ticketNav } from '../../features/ticket/ticket.nav'
import { nav as membersNav } from '../../features/members/members.nav'
import { nav as settingsNav } from '../../features/settings/settings.nav'
import { nav as reportsNav } from '../../features/reports/reports.nav'
import { ROUTES } from '../../routes'
import type { NavSection } from '../../features/navTypes'

// Sections whose real backend menu tree is genuinely empty (confirmed via
// llx_menu directly, not just a module with no pages built yet) still have
// one real landing page each (Members Area, the Reports Center hub) — this
// lets clicking the rail icon go straight there instead of just opening an
// empty "Nothing here yet." panel.
export const EMPTY_SECTION_HOME_PATH: Record<string, string> = {
  members: ROUTES.memberDashboard,
  reports: ROUTES.reports,
}

// Used only as a label->path lookup by buildNavSections (see that file) —
// the actual section list, order, and item hierarchy come from GET
// /api/menu/ (the real backend's own llx_menu data for this user), not from
// this array. Kept as a fallback so Sidebar.tsx isn't empty for the one
// frame before that request resolves, and reused as-is by AllAppsDrawer.tsx
// (the navbar search launcher) so "what's a real page" stays defined in one
// place. Split into its own module (rather than living in Sidebar.tsx)
// because exporting a plain constant from a component file breaks React
// Fast Refresh for that file.
export const PATH_SOURCE_SECTIONS: NavSection[] = [
  homeNav,
  zraNav,
  billingNav,
  purchasesNav,
  productsNav,
  warehousesNav,
  projectsNav,
  bankingNav,
  loansNav,
  usersNav,
  payrollNav,
  expensesNav,
  specialExpensesNav,
  budgetNav,
  kitchenNav,
  fixedAssetNav,
  generalLedgerNav,
  ticketNav,
  membersNav,
  settingsNav,
  reportsNav,
]
