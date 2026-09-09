import { Briefcase } from 'lucide-react'
import { ROUTES } from '../../routes'
import type { NavSection } from '../navTypes'

// Mirrors the real app's "Projects" left menu (llx_menu, mainmenu=projectmanagement).
// Group and leaf labels below are copied verbatim from the real GET
// /api/menu/ response (confirmed live) — buildNavSections.ts resolves each
// real backend menu node's path by normalized-label lookup against these
// exact strings, so a label that merely LOOKS equivalent (different word
// order, e.g. "Open Leads List" vs the real "List open leads") silently
// leaves that node unlinked/greyed-out in the sidebar despite its route
// existing and working — confirmed live via the real /api/menu/ payload:
// "Leads | Projects" (not "Leads/Projects") and "Tasks/activities" (not
// "Activities") as the two group titles, each containing their own real
// "List" child — matching group labels matters here specifically because a
// mismatched ancestor breaks the composite ancestor-chain key
// buildNavSections uses to tell those two same-named "List" leaves apart,
// falling back to whichever flat "list" key was registered last.
export const nav: NavSection = {
  key: 'projects',
  label: 'Projects',
  icon: Briefcase,
  items: [
    {
      label: 'Leads | Projects',
      items: [
        { label: 'New', path: ROUTES.projectCreate },
        { label: 'List', path: ROUTES.projectList },
        { label: 'List open leads', path: ROUTES.projectOpenLeadsList },
        { label: 'List open projects', path: ROUTES.projectOpenProjectsList },
        { label: 'Statistics', path: ROUTES.projectStats },
      ],
    },
    {
      label: 'Activities',
      items: [
        { label: 'New task', path: ROUTES.projectTaskCreate },
        { label: 'List', path: ROUTES.projectTaskList },
      ],
    },
    { label: 'Time spent', path: ROUTES.projectTimeSpent },
    { label: 'Tags/categories', items: [{ label: 'List', path: ROUTES.projectCategoryList }, { label: 'New tag/category', path: ROUTES.projectCategoryCreate }] },
    { label: 'Vendor Proposal Statistics', path: ROUTES.supplierProposalStats },
  ],
}
