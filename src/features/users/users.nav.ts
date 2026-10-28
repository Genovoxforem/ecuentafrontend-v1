import { Users } from 'lucide-react'
import { ROUTES } from '../../routes'
import type { NavSection } from '../navTypes'

// Mirrors the real app's "Users" left menu (llx_menu, mainmenu=employee).
// This file is only a label->path lookup for buildNavSections (see there) —
// the tree shape comes live from GET /api/menu/, keyed purely by leaf
// label (flattened, parent-agnostic — see flattenPaths in
// buildNavSections.ts) regardless of how deep this file nests things.
//
// "Events" in the menu is New Event, then a List group and a Calendar group
// each containing the SAME 4 pre-filtered views (My Incomplete Events / My
// Terminated Events / All Incomplete Events / All Terminated Events), plus
// Reporting and Tags/Categories. All 4 filter combos route to the same
// Agenda page (AgendaOverview.tsx), which reads status/scope/view query
// params on load to seed its filters — see calendarApi.queries.ts's
// useCalendarEvents (status: todo/done maps straight to percent-based
// status; scope: all sends the filtert=-1 "no owner restriction" value,
// mine defaults to the current user, matching the backend's own default).
//
// Reporting (comm/action/rapport/index.php) and Tags/Categories
// (categories/index.php?type=actioncomm) both have backends but no JSON
// API — server-rendered HTML + server-generated PDF for the former,
// classic form-POST CRUD for the latter. Each has its own React page
// (ReportingPage / EventCategoriesPage) that says so and links out to the
// legacy page — Tags/Categories also shows the category list itself, since
// that part is available via getFilters.
export const nav: NavSection = {
  key: 'users',
  label: 'Users',
  icon: Users,
  items: [
    {
      label: 'Users',
      path: ROUTES.usersDashboard,
      items: [{ label: 'List User', path: ROUTES.usersDashboard }, { label: 'List Users', path: ROUTES.usersDashboard }, { label: 'Create User', path: ROUTES.userCreate }, { label: 'Users tags/categories', path: ROUTES.userTags }],
    },
    {
      label: 'User Groups',
      path: ROUTES.userGroupList,
      items: [{ label: 'Add User Group', path: ROUTES.userGroupCreate }, { label: 'User Groups List', path: ROUTES.userGroupList }],
    },
    {
      label: 'Leave Management',
      items: [
        { label: 'HRM Area', path: ROUTES.hrmArea },
        { label: 'List Leave', path: ROUTES.leaveList },
        { label: 'Leave', path: ROUTES.leaveRequest },
        { label: 'Leave request', path: ROUTES.leaveRequest },
        { label: 'Time Spent', path: ROUTES.timeSpent },
        { label: 'Activitieslist', path: ROUTES.activitiesDetail },
      ],
    },
    {
      label: 'Events',
      items: [
        { label: 'Events', path: ROUTES.agenda },
        { label: 'New Event', path: `${ROUTES.agenda}?new=1` },
        {
          label: 'List',
          path: `${ROUTES.agenda}?view=list`,
          items: [
            { label: 'My Incomplete Events', path: `${ROUTES.agenda}?status=todo&scope=mine&view=list` },
            { label: 'My Terminated Events', path: `${ROUTES.agenda}?status=done&scope=mine&view=list` },
            { label: 'All Incomplete Events', path: `${ROUTES.agenda}?status=todo&scope=all&view=list` },
            { label: 'All Terminated Events', path: `${ROUTES.agenda}?status=done&scope=all&view=list` },
          ],
        },
        {
          label: 'Calendar',
          path: `${ROUTES.agenda}?view=calendar`,
          items: [
            { label: 'My Incomplete Events', path: `${ROUTES.agenda}?status=todo&scope=mine&view=calendar` },
            { label: 'My Terminated Events', path: `${ROUTES.agenda}?status=done&scope=mine&view=calendar` },
            { label: 'All Incomplete Events', path: `${ROUTES.agenda}?status=todo&scope=all&view=calendar` },
            { label: 'All Terminated Events', path: `${ROUTES.agenda}?status=done&scope=all&view=calendar` },
          ],
        },
        { label: 'Reporting', path: ROUTES.agendaReporting },
        { label: 'Tags/Categories', path: ROUTES.agendaCategories },
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
