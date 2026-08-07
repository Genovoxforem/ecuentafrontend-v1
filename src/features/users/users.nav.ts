import { Users } from 'lucide-react'
import { ROUTES } from '../../routes'
import type { NavSection } from '../navTypes'

// Mirrors the real app's "Users" left menu (llx_menu, mainmenu=employee).
// "Events > Actions" goes one level deeper in the source than this sidebar's
// group/leaf structure supports, so its New Action/List/Calendar/Reportings/
// Categories items are flattened directly under "Events" here.
export const nav: NavSection = {
  key: 'users',
  label: 'Users',
  icon: Users,
  items: [
    {
      label: 'Users',
      items: [{ label: 'List User', path: ROUTES.usersDashboard }, { label: 'Create User', path: ROUTES.userCreate }, { label: 'User Tags/Categories' }],
    },
    { label: 'User Groups', items: [{ label: 'Add User Group' }, { label: 'User Groups List' }] },
    {
      label: 'Leave Management',
      items: [{ label: 'HRM Area' }, { label: 'List Leave' }, { label: 'Leave' }, { label: 'Time Spent' }],
    },
    { label: 'Activities List' },
    {
      label: 'Events',
      items: [{ label: 'New Action' }, { label: 'List' }, { label: 'Calendar' }, { label: 'Reportings' }, { label: 'Categories' }],
    },
    { label: 'Documents', items: [{ label: 'DMS/ECM Area' }, { label: 'Manual Tree' }, { label: 'Automatic Tree' }] },
  ],
}
