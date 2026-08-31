import { Landmark } from 'lucide-react'
import { ROUTES } from '../../routes'
import type { NavSection } from '../navTypes'

// A fully separate top-level sidebar icon in the real app
// (llx_menu, mainmenu='specialexpence' → compta/charges/index.php),
// distinct from "Expenses" (mainmenu='expences'). Single page, no submenu.
export const nav: NavSection = {
  key: 'specialExpenses',
  label: 'Special Expenses',
  icon: Landmark,
  items: [{ label: 'Special Expenses', path: ROUTES.specialExpenses }],
}
