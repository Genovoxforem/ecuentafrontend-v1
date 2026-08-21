import { Briefcase } from 'lucide-react'
import { ROUTES } from '../../routes'
import type { NavSection } from '../navTypes'

// Mirrors the real app's "Projects" left menu (llx_menu, mainmenu=projectmanagement).
export const nav: NavSection = {
  key: 'projects',
  label: 'Projects',
  icon: Briefcase,
  items: [
    {
      label: 'Leads/Projects',
      items: [
        { label: 'New', path: ROUTES.projectCreate },
        { label: 'List', path: ROUTES.projectList },
        { label: 'Open Leads List', path: ROUTES.projectOpenLeadsList },
        { label: 'Open Projects List', path: ROUTES.projectOpenProjectsList },
        { label: 'Statistics', path: ROUTES.projectStats },
      ],
    },
    {
      label: 'Activities',
      items: [
        { label: 'New Task', path: ROUTES.projectTaskCreate },
        { label: 'List', path: ROUTES.projectTaskList },
      ],
    },
    { label: 'New Time Spent', path: ROUTES.projectTimeSpent },
    { label: 'Categories', items: [{ label: 'New Category', path: ROUTES.projectCategoryCreate }] },
    { label: 'Vendor Proposal Statistics', path: ROUTES.supplierProposalStats },
  ],
}
