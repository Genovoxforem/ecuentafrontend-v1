import { Settings } from 'lucide-react'
import { ROUTES } from '../../routes'
import type { NavSection } from '../navTypes'

// Mirrors the real app's "Administrator" left menu (llx_menu, mainmenu=administartor).
// "Tools > EMailings/FormatedExport/FormatedImport" each go one level deeper
// in the source than this sidebar supports, so their New Mailing/New
// Export/New Import children are dropped rather than fully expanded.
export const nav: NavSection = {
  key: 'administrator',
  label: 'Administrator',
  icon: Settings,
  items: [
    {
      label: 'Setup',
      items: [
        { label: 'Company/Organization', path: ROUTES.companyOrganization },
        { label: 'Menus', path: ROUTES.menusSetup },
        { label: 'Display', path: ROUTES.displaySetup },
        { label: 'Translation', path: ROUTES.translationSetup },
        { label: 'Default Values', path: ROUTES.defaultValuesSetup },
        { label: 'Widgets', path: ROUTES.widgetsSetup },
        { label: 'Alerts', path: ROUTES.alertsSetup },
        { label: 'Security', path: ROUTES.securitySetup },
        { label: 'Limits And Accuracy', path: ROUTES.limitsSetup },
        { label: 'PDF', path: ROUTES.pdfSetup },
        { label: 'Emails', path: ROUTES.emailsSetup },
        { label: 'SMS', path: ROUTES.smsSetup },
        { label: 'Dictionaries', path: ROUTES.dictionaries },
        { label: 'Other Setup', path: ROUTES.otherSetupConst },
      ],
    },
    { label: 'Reportings', items: [{ label: 'Report In/Out' }, { label: 'Turnover Report' }] },
    {
      label: 'Tools',
      items: [
        { label: 'Email Templates', path: ROUTES.emailTemplates },
        { label: 'Emailings' },
        { label: 'Whatsapp Settings' },
        { label: 'Export Assistant' },
        { label: 'Import Assistant' },
        { label: 'Cashflow Settings' },
      ],
    },
  ],
}
