import { Briefcase } from 'lucide-react'
import type { NavSection } from '../navTypes'

// Mirrors the real app's "Projects" left menu (llx_menu, mainmenu=projectmanagement).
export const nav: NavSection = {
  key: 'projects',
  label: 'Projects',
  icon: Briefcase,
  items: [
    {
      label: 'Leads/Projects',
      items: [{ label: 'New' }, { label: 'List' }, { label: 'Open Leads List' }, { label: 'Open Projects List' }, { label: 'Statistics' }],
    },
    {
      label: 'Activities',
      items: [{ label: 'New Task' }, { label: 'List' }, { label: 'Statistics' }],
    },
    { label: 'New Time Spent' },
    { label: 'Categories', items: [{ label: 'New Category' }] },
    { label: 'Vendor Proposal Statistics' },
  ],
}
