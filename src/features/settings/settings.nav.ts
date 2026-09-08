import { Settings } from 'lucide-react'
import { ROUTES } from '../../routes'
import type { NavSection } from '../navTypes'

// Mirrors the real app's "Administrator" left menu (llx_menu, mainmenu=administartor).
// Re-verified live against the real GET /api/menu/ tree on 172.16.5.55 (not
// just screenshots) — that confirmed "Menus" and "Other Setup" ARE real
// children of Setup after all (an earlier pass had removed them as
// unverified guesses), while "Reportings" (Report In/Out, Turnover Report)
// is NOT part of this menu anywhere and has been dropped as fabricated.
// "Setup"/"Tools" group headers carry their own real url in the live tree
// too — Setup's is the same page as Company/Organization (admin/company.php),
// so it gets that path directly; Tools' (core/tools.php) has no built page
// yet, so it stays a plain group header. "Menus" real llx_menu row happens
// to link to admin/index.php (Dolibarr's generic Setup home) rather than a
// dedicated menu page on this install, but MenusSetup.tsx (built from the
// real admin/menus.php + admin/menus/index.php) is the page that actually
// matches what "Menus" means functionally, so it's wired there instead of
// duplicating the Setup landing page.
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
