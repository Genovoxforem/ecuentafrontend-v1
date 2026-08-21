import { Users } from 'lucide-react'
import { ROUTES } from '../../routes'
import type { NavSection } from '../navTypes'

// Mirrors the real app's "Users" left menu (llx_menu, mainmenu=employee).
// This file is only a label->path lookup for buildNavSections (see there) —
// the real tree shape comes live from GET /api/menu/. Confirmed against the
// actual rendered menu: "Events" is a group with a single leaf also titled
// "Events" (not a New Action/List/Calendar/Reportings/Categories breakdown,
// which was an unverified guess before) — wired to the real Agenda/calendar
// page, the closest real page for it.
export const nav: NavSection = {
  key: 'users',
  label: 'Users',
  icon: Users,
  items: [
    {
      label: 'Users',
      items: [{ label: 'List User', path: ROUTES.usersDashboard }, { label: 'Create User', path: ROUTES.userCreate }, { label: 'Users tags/categories', path: ROUTES.userTags }],
    },
    { label: 'User Groups', items: [{ label: 'Add User Group', path: ROUTES.userGroupCreate }, { label: 'User Groups List', path: ROUTES.userGroupList }] },
    {
      label: 'Leave Management',
      items: [
        { label: 'HRM Area', path: ROUTES.hrmArea },
        { label: 'List Leave', path: ROUTES.leaveList },
        { label: 'Leave', path: ROUTES.leaveRequest },
        { label: 'Time Spent', path: ROUTES.timeSpent },
        { label: 'Activitieslist', path: ROUTES.activitiesDetail },
      ],
    },
    {
      label: 'Events',
      items: [{ label: 'Events', path: ROUTES.agenda }],
    },
    {
      label: 'Linked Files',
      items: [
        { label: 'DMS/ECM Area', path: ROUTES.userDocuments },
        { label: 'Manual Tree', path: ROUTES.userDocumentsManual },
        { label: 'Automatic Tree', path: ROUTES.userDocumentsAutomatic },
      ],
    },
  ],
}
