import { LayoutGrid } from 'lucide-react'
import { ROUTES } from '../../routes'
import type { NavSection } from '../navTypes'

export const nav: NavSection = {
  key: 'home',
  label: 'Home',
  icon: LayoutGrid,
  items: [
    { label: 'Main Dashboard', path: ROUTES.home },
    { label: 'ZRA Dashboard', path: ROUTES.zra },
    { label: 'Sales Dashboard', path: ROUTES.salesDashboard },
    { label: 'Purchases Dashboard', path: ROUTES.purchasesDashboard },
    { label: 'Warehouse Dashboard', path: ROUTES.warehouseDashboard },
    { label: 'Payroll Dashboard', path: ROUTES.payrollDashboard },
    { label: 'Ledger Dashboard', path: ROUTES.ledgerDashboard },
    { label: 'Kitchen Dashboard', path: ROUTES.kitchenDashboard },
    { label: 'Hotel Dashboard', path: ROUTES.bookingDashboard },
    { label: 'Users Dashboard', path: ROUTES.usersDashboard },
  ],
}
