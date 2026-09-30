import { Coffee } from 'lucide-react'
import { ROUTES } from '../../routes'
import type { NavSection } from '../navTypes'

// This instance's real menu has a separate "Supplement Orders" top-level entry
// (llx_menu, mainmenu='Supplement') whose only page is
// kitchen/ordermanagement.php?type=supplement — the same page, with the same
// btype=supplement filter, that Kitchen > Beverage Orders shows. It is its own
// nav section (not part of 'kitchen') so the sidebar can resolve that label to
// the React page instead of drawing it disabled.
export const nav: NavSection = {
  key: 'supplement',
  label: 'Supplement Orders',
  icon: Coffee,
  items: [{ label: 'Supplement Orders', path: ROUTES.kitchenBeverageOrders }],
}
