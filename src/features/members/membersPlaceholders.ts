import type { ComponentType } from 'react'
import { UserPlus, Tags, CreditCard, BarChart3 } from 'lucide-react'
import { ROUTES } from '../../routes'

// The real llx_menu submenu tree for Members is confirmed missing from the
// database entirely (only the single top-level icon row exists) — the
// stock ~20-item tree lives only in core/menus/init_menu_auguria.sql,
// never inserted for this instance. These 4 items are the highest-value
// subset of that stock tree whose backing PHP files were confirmed to
// still exist on disk.
export interface MemberPlaceholder {
  path: string
  icon: ComponentType<{ size?: number; className?: string }>
  title: string
  description: string
}

export const MEMBER_PLACEHOLDERS: MemberPlaceholder[] = [
  { path: ROUTES.memberNew, icon: UserPlus, title: 'New Member', description: 'Real page: adherents/card.php?action=create — classic form-POST, no JSON API.' },
  { path: ROUTES.memberTypes, icon: Tags, title: 'Member Types', description: 'Real page: adherents/type.php — classic form-POST, no JSON API. 0 types exist on this instance today.' },
  { path: ROUTES.memberSubscriptions, icon: CreditCard, title: 'Subscriptions', description: 'Real page: adherents/subscription.php — classic form-POST, no JSON API.' },
  { path: ROUTES.memberStatistics, icon: BarChart3, title: 'Statistics', description: 'Real page: adherents/stats/index.php — inline PHP, no JSON API confirmed.' },
]
