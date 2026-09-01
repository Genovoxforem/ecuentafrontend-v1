import { Utensils } from 'lucide-react'
import { ROUTES } from '../../routes'
import type { NavSection } from '../navTypes'

// Mirrors the real app's "Kitchen" left menu (llx_menu, mainmenu='Kitchen',
// module=takepos) — confirmed live this session via direct DB query.
// "Kitchen Orders" and "Beverage Orders" are the same real endpoint
// (kitchen/order_ajax_list.php), just filtered differently, matching the
// real menu's own two URLs. "Create Orders" has a real backing page
// (takeposnew/waiter_order.php) but is a full order-creation UI, not
// rebuilt in this pass. (Kitchen Dashboard lives in Home's dashboard hub,
// not here — matching the real menu's own structure.)
export const nav: NavSection = {
  key: 'kitchen',
  label: 'Kitchen',
  icon: Utensils,
  items: [
    { label: 'Beverage Orders', path: ROUTES.kitchenBeverageOrders },
    { label: 'Kitchen Orders', path: ROUTES.kitchenDashboard },
    { label: 'Create Orders', path: ROUTES.kitchenCreateOrder },
  ],
}
