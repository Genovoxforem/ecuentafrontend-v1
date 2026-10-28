import { Utensils } from 'lucide-react'
import { ROUTES } from '../../routes'
import type { NavSection } from '../navTypes'

// Mirrors the real app's "Kitchen" left menu (llx_menu, mainmenu='Kitchen',
// module=takepos). "Kitchen Orders" and "Beverage Orders" are the same
// endpoint (kitchen/order_ajax_list.php), just filtered differently,
// matching the menu's own two URLs — see KitchenOrdersList.tsx (routed at
// kitchenOrderManagement, matching the kitchen/ordermanagement.php page
// it's built from; kitchenDashboard is a different page,
// kitchen/dashboard.php, and must not alias this one). "Create Orders"
// opens the POS waiter screen (pos2/WaiterOrderV2) through a redirect.
// Kitchen Dashboard is the first item of the Kitchen menu, so it must be
// listed here too: the sidebar resolves each menu label to a React path
// through this file's items (see buildNavSections), and a label with no
// entry under 'kitchen' is drawn disabled.
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
