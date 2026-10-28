import { Settings } from 'lucide-react'
import { ROUTES } from '../../routes'
import type { NavSection } from '../navTypes'

// Mirrors the real app's "Administrator" left menu (llx_menu, mainmenu=administartor),
// per the GET /api/menu/ tree: "Menus" and "Other Setup" are children of Setup, and
// "Reportings" (Report In/Out, Turnover Report) is not part of this menu.
// "Setup"/"Tools" group headers carry their own url in the live tree too — Setup's is
// the same page as Company/Organization (admin/company.php), so it gets that path
// directly; Tools' (core/tools.php) has no built page yet, so it stays a plain group
// header. The "Menus" llx_menu row links to admin/index.php (Dolibarr's generic Setup
// home) rather than a dedicated menu page on this install, but MenusSetup.tsx (built
// from admin/menus.php + admin/menus/index.php) is the page that matches what "Menus"
// means functionally, so it's wired there instead of duplicating the Setup landing page.
export const nav: NavSection = {
  key: 'administrator',
  label: 'Administrator',
  icon: Settings,
  items: [
    {
      label: 'Setup',
      path: ROUTES.companyOrganization,
      items: [
        { label: 'Company/Organization', path: ROUTES.companyOrganization },
        { label: 'Menus', path: ROUTES.menusSetup },
        { label: 'Display', path: ROUTES.displaySetup },
        { label: 'Translation', path: ROUTES.translationSetup },
        { label: 'Default Values/Filters/Sorting', path: ROUTES.defaultValuesSetup },
        { label: 'Widgets', path: ROUTES.widgetsSetup },
        { label: 'Alerts', path: ROUTES.alertsSetup },
        { label: 'Security', path: ROUTES.securitySetup },
        { label: 'Limits And Accuracy', path: ROUTES.limitsSetup },
        { label: 'PDF', path: ROUTES.pdfSetup },
        { label: 'Emails', path: ROUTES.emailsSetup },
        { label: 'SMS', path: ROUTES.smsSetup },
        { label: 'Dictionaries', path: ROUTES.dictionaries },
        { label: 'Other Setup', path: ROUTES.otherSetup },
      ],
    },
    {
      label: 'Tools',
      items: [
        { label: 'Email Templates', path: ROUTES.emailTemplates },
        { label: 'Whatsapp Settings', path: ROUTES.whatsappSettings },
        { label: 'Export Assistant', path: ROUTES.exportAssistant },
        { label: 'New Export', path: `${ROUTES.exportAssistant}?step=new` },
        { label: 'Import Assistant', path: ROUTES.importAssistant },
        { label: 'New Import', path: `${ROUTES.importAssistant}?step=new` },
        { label: 'Cashflow Settings', path: ROUTES.cashflowSettings },
      ],
    },
  ],
}
