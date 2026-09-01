import { Users } from 'lucide-react'
import { ROUTES } from '../../routes'
import type { NavSection } from '../navTypes'

// The real "Members" sidebar icon (llx_menu, mainmenu='members') has its
// entire submenu tree missing from the database — confirmed this session
// (only the single top-level icon row exists; the stock ~20-item tree was
// never inserted for this instance). "List" is genuinely real
// (adherents/ajax/ajax_adherents_list.php); the rest are the
// highest-value subset of the stock tree with confirmed real backing
// pages but no JSON API.
export const nav: NavSection = {
  key: 'members',
  label: 'Members',
  icon: Users,
  items: [
    { label: 'Members Area', path: ROUTES.memberDashboard },
    { label: 'List', path: ROUTES.memberList },
    { label: 'New Member', path: ROUTES.memberNew },
    { label: 'Member Types', path: ROUTES.memberTypes },
    { label: 'Subscriptions', path: ROUTES.memberSubscriptions },
    { label: 'Statistics', path: ROUTES.memberStatistics },
  ],
}
