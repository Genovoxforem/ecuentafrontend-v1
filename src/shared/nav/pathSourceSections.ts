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
import { nav as kitchenNav } from '../../features/kitchen/kitchen.nav'
import { nav as fixedAssetNav } from '../../features/fixedAsset/fixedAsset.nav'
import { nav as generalLedgerNav } from '../../features/generalLedger/generalLedger.nav'
import { nav as ticketNav } from '../../features/ticket/ticket.nav'
import { nav as settingsNav } from '../../features/settings/settings.nav'
import { nav as reportsNav } from '../../features/reports/reports.nav'
import type { NavSection } from '../../features/navTypes'

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
  kitchenNav,
  fixedAssetNav,
  generalLedgerNav,
  ticketNav,
  settingsNav,
  reportsNav,
]
