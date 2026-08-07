import { Utensils } from 'lucide-react'
import type { NavSection } from '../navTypes'

// Mirrors the real app's "Kitchen" left menu (llx_menu, mainmenu=Kitchen) —
// a flat list in the source, no sub-grouping. (Kitchen Dashboard lives in
// Home's dashboard hub, not here — matching the real menu's own structure.)
export const nav: NavSection = {
  key: 'kitchen',
  label: 'Kitchen',
  icon: Utensils,
  items: [{ label: 'Beverage Orders' }, { label: 'Kitchen Orders' }, { label: 'Create Orders' }],
}
