import { PiggyBank } from 'lucide-react'
import { ROUTES } from '../../routes'
import type { NavSection } from '../navTypes'

// Mirrors the real app's "Budget" top-level sidebar icon (llx_menu,
// mainmenu='budget'). Confirmed this session: the real menu row points to
// /budget/listbudget.php, and no `budget/` directory exists anywhere on
// this backend — not a "no JSON API" case like most other modules audited
// this session, but a genuinely dead link even in the legacy PHP itself.
// Nothing to design a UI against.
export const nav: NavSection = {
  key: 'budget',
  label: 'Budget',
  icon: PiggyBank,
  items: [{ label: 'Budget', path: ROUTES.budget }],
}
