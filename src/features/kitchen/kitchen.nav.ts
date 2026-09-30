import { Utensils } from 'lucide-react'
import { ROUTES } from '../../routes'
import type { NavSection } from '../navTypes'

// Mirrors the real app's "Kitchen" left menu (llx_menu, mainmenu='Kitchen',
// module=takepos) — confirmed live this session via direct DB query.
// "Kitchen Orders" and "Beverage Orders" are the same real endpoint
// (kitchen/order_ajax_list.php), just filtered differently, matching the
// real menu's own two URLs — see KitchenOrdersList.tsx (routed at
// kitchenOrderManagement, matching the real kitchen/ordermanagement.php
// page it's built from; kitchenDashboard is a genuinely different real
// page, kitchen/dashboard.php, and must not alias this one). "Create
// Orders" covers the real core ordering flow (tables, categories, products,
// cart, place order) from takeposnew/waiter_order.php — see
// WaiterOrderPage.tsx/waiterOrder.queries.ts; payment/checkout, cash
// drawer, modifiers, barcode scanning and offline sync are separate, much
// larger subsystems left out of this pass.
// Kitchen Dashboard is the first item of this instance's real Kitchen menu
// (llx_menu, mainmenu='Kitchen'), so it must be listed here too: the sidebar
// resolves each real menu label to a React path through this file's items
// (see buildNavSections), and a label with no entry under 'kitchen' is drawn
// disabled — which is what happened to it while it only lived in home.nav.ts.
export const nav: NavSection = {
  key: 'kitchen',
  label: 'Kitchen',
  icon: Utensils,
  items: [
    { label: 'Kitchen Dashboard', path: ROUTES.kitchenDashboard },
    { label: 'Beverage Orders', path: ROUTES.kitchenBeverageOrders },
    { label: 'Kitchen Orders', path: ROUTES.kitchenOrderManagement },
    { label: 'Create Orders', path: ROUTES.kitchenCreateOrder },
  ],
}
