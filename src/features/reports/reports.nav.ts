import { FileText } from 'lucide-react'
import { ROUTES } from '../../routes'
import { REPORT_CATEGORIES, reportPath } from './reportsStructure'
import type { NavSection } from '../navTypes'

// The real "Reports" top-level icon has no menu tree of its own at all
// (confirmed via both llx_menu and the module's own PHP descriptor,
// modReports.class.php — see reportsStructure.ts's header comment). This
// mirrors the real Reports Center's own real category/report structure
// (custom/reports/reportsindex.php) as a flat, path-lookup-only list —
// won't render in the sidebar submenu (that section's real backend tree is
// empty, same limitation as Members), but keeps every real report
// reachable and correctly labeled wherever this list is consulted (e.g.
// AllAppsDrawer search).
export const nav: NavSection = {
  key: 'reports',
  label: 'Reports',
  icon: FileText,
  items: [
    { label: 'Reports Center', path: ROUTES.reports },
    ...REPORT_CATEGORIES.map((cat) => ({
      label: cat.label,
      items: cat.reports.map((r) => ({ label: r.label, path: reportPath(cat.key, r.slug) })),
    })),
  ],
}
