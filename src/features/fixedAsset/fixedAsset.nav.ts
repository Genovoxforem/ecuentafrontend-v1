import { BriefcaseBusiness } from 'lucide-react'
import type { NavSection } from '../navTypes'

// Mirrors the real app's "Fixed Asset" left menu (llx_menu, mainmenu=asset).
export const nav: NavSection = {
  key: 'fixed-asset',
  label: 'Fixed Asset',
  icon: BriefcaseBusiness,
  items: [
    {
      label: 'Assets',
      items: [{ label: 'Assets Details' }, { label: 'Assets Types' }, { label: 'Asset Category' }, { label: 'Asset Group' }],
    },
    { label: 'Assets Insurance', items: [{ label: 'Insurance Company' }] },
    { label: 'Assets Journal', items: [{ label: 'List Of Asset Transaction Report' }] },
  ],
}
