import { ROUTES } from '../../routes'

// The classic top bar's gear panel (main.inc.php's #ecSettings offcanvas): 17
// groups of setup links, read off a live 172.16.5.10 page. Each entry opens the
// React page for the same screen (`to`); the ones with no React page yet have
// none and show disabled, never as a link to the backend page.
export interface SettingsLink {
  label: string
  to?: string
}

export interface SettingsGroup {
  title: string
  // The classic grid is 3 columns wide; General Ledger takes two.
  wide?: boolean
  links: SettingsLink[]
}

export const SETTINGS_GROUPS: SettingsGroup[] = [
  {
    title: 'Sales',
    links: [
      { label: 'Product Accounting', to: ROUTES.ledgerProductAccounts },
      { label: 'Vat accounts', to: ROUTES.ledgerVatAccounts },
      { label: 'Customers tags /categories', to: ROUTES.customerTags },
      { label: 'Contacts tags /categories', to: ROUTES.contactTags },
      { label: 'Generate Barcode' },
      { label: 'Setup' },
      { label: 'Currency Price Update' },
    ],
  },
  {
    title: 'Purchases',
    links: [{ label: 'Vendors tags/categories', to: ROUTES.vendorTags }, { label: 'Vendor Setup' }],
  },
  {
    title: 'Products',
    links: [
      { label: 'Classes' },
      { label: 'Import Products', to: ROUTES.productImport },
      { label: 'Product/Service-Categories', to: ROUTES.productTags },
      { label: 'Global VAT Update', to: ROUTES.productVatUpdate },
      { label: 'Product Price', to: ROUTES.productPriceList },
    ],
  },
  {
    title: 'Warehouses',
    links: [{ label: 'Shipment Setup' }, { label: 'Reception Setup' }, { label: 'Stock Setup' }, { label: 'Rack Setup' }],
  },
  {
    title: 'General Ledger',
    wide: true,
    links: [
      { label: 'Accounting journals', to: ROUTES.ledgerAccountingJournals },
      { label: 'Pcg_version', to: ROUTES.ledgerPcgVersion },
      { label: 'Expense report accounts', to: ROUTES.ledgerExpenseReportAccounts },
      { label: 'FiscalPeriod', to: ROUTES.ledgerFiscalPeriod },
      { label: 'Setup' },
      { label: 'General', to: ROUTES.ledgerGeneralSettings },
      { label: 'Default accounts', to: ROUTES.ledgerDefaultAccounts },
      { label: 'Bank accounts', to: ROUTES.bankingAccounts },
      { label: 'Vat accounts', to: ROUTES.ledgerVatAccounts },
      { label: 'Tax accounts', to: ROUTES.ledgerTaxAccounts },
      { label: 'Personalized groups', to: ROUTES.ledgerPersonalizedGroups },
      { label: 'By predefined groups', to: ROUTES.ledgerPredefinedGroups },
      { label: 'By personalized groups', to: ROUTES.ledgerPersonalizedGroupsReport },
    ],
  },
  {
    title: 'Projects',
    links: [{ label: 'New tag/ Category', to: ROUTES.projectCategoryCreate }, { label: 'Vendor Proposal Statistics', to: ROUTES.supplierProposalStats }],
  },
  { title: 'Banking', links: [{ label: 'Setup' }] },
  { title: 'Procurement', links: [{ label: 'Setup' }] },
  { title: 'Fixed Asset', links: [{ label: 'Setup' }] },
  { title: 'Members', links: [{ label: 'Setup' }] },
  { title: 'Taxes & Compliance', links: [{ label: 'Setup' }] },
  { title: 'Preferences', links: [{ label: 'Setup Modules/Applications' }] },
  { title: 'Users & Roles', links: [{ label: 'Users', to: ROUTES.usersDashboard }] },
  { title: 'Customisation', links: [{ label: 'Display Setup', to: ROUTES.displaySetup }] },
  { title: 'Online Payments', links: [] },
  { title: 'FAQ', links: [{ label: 'Faq List' }, { label: 'New Faq' }, { label: 'Faq Setup' }] },
  { title: 'POS', links: [{ label: 'Bar Restaurant' }, { label: 'Customer Display Setup' }] },
  { title: 'Developer Space', links: [] },
  { title: 'Custom Modules', links: [{ label: 'Setup Modules / Applications' }] },
]
