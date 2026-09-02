import { Users } from 'lucide-react'
import { ROUTES } from '../../routes'
import type { NavSection } from '../navTypes'

// Mirrors the real app's "Users" left menu (llx_menu, mainmenu=employee).
// This file is only a label->path lookup for buildNavSections (see there) —
// the real tree shape comes live from GET /api/menu/, keyed purely by leaf
// label (flattened, parent-agnostic — see flattenPaths in
// buildNavSections.ts) regardless of how deep this file nests things.
//
// "Events" was previously assumed to be a single leaf also titled "Events"
// — confirmed wrong live: the real menu actually has New Event, then a
// List group and a Calendar group each containing the SAME 4 real
// pre-filtered views (My Incomplete Events / My Terminated Events / All
// Incomplete Events / All Terminated Events), plus Reporting and
// Tags/Categories. None of those real labels matched anything in this
// file, so every one of those real sidebar links resolved to no path at
// all — the reported "not routed" bug. All 4 filter combos route to the
// same real Agenda page (AgendaOverview.tsx), which now reads
// status/scope/view query params on load to seed its real filters —
// see calendarApi.queries.ts's useCalendarEvents (status: todo/done maps
// straight to real percent-based status; scope: all sends the real
// filtert=-1 "no owner restriction" value, mine defaults to the current
// user, matching the backend's own default). Reporting and Tags/Categories
// have no React page built yet, so they're intentionally left unmapped
// (renders disabled) rather than guessed at.
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
      items: [
        { label: 'Events', path: ROUTES.agenda },
        { label: 'New Event', path: `${ROUTES.agenda}?new=1` },
        { label: 'My Incomplete Events', path: `${ROUTES.agenda}?status=todo&scope=mine&view=list` },
        { label: 'My Terminated Events', path: `${ROUTES.agenda}?status=done&scope=mine&view=list` },
        { label: 'All Incomplete Events', path: `${ROUTES.agenda}?status=todo&scope=all&view=list` },
        { label: 'All Terminated Events', path: `${ROUTES.agenda}?status=done&scope=all&view=list` },
      ],
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
