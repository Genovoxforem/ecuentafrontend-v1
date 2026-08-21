import { ShoppingCart } from 'lucide-react'
import { ROUTES } from '../../routes'
import type { NavSection } from '../navTypes'

// Mirrors the real app's "Sales" left menu (llx_menu, mainmenu=accountsreceivable)
// exactly, including item order. "Jobcard" is omitted — it's explicitly
// disabled (enabled=0) in the source database, so it never shows there either.
//
// IMPORTANT: the sidebar the user actually sees is built by
// shared/nav/buildNavSections.ts from the LIVE GET /api/menu/ response, not
// from this file directly — these `label` strings are only used as a
// lookup key (buildNavSections normalizes + matches them against the real
// backend menu's own titre text) to attach a `path` to the right real node.
// The text rendered in the sidebar always comes from the backend, never
// from here. Get a label here even slightly wrong (missing a parenthetical,
// wrong plural, extra/missing word) and the lookup silently misses — the
// item still shows up with the backend's real label, just with no path,
// rendering it disabled even though the page behind it works fine. Always
// copy labels verbatim from a live `GET /api/menu/` dump, not by guessing.
export const nav: NavSection = {
  key: 'sales',
  label: 'Sales',
  icon: ShoppingCart,
  items: [
    {
      label: 'Customers',
      items: [
        { label: 'Create Customers', path: ROUTES.customersCreate },
        { label: 'List Of Customers', path: ROUTES.customerList },
        { label: 'List Of Prospects', path: ROUTES.prospectList },
        { label: 'New Prospects', path: ROUTES.prospectsCreate },
        { label: 'Customer Group', path: ROUTES.customerGroupList },
      ],
    },
    {
      label: 'Sales Orders',
      items: [
        { label: 'New Order', path: ROUTES.orderCreate },
        { label: 'List', path: ROUTES.orderList },
        { label: 'Statistics', path: ROUTES.orderStats },
      ],
    },
    {
      label: 'Contracts',
      items: [
        { label: 'New Contract', path: ROUTES.contractCreate },
        { label: 'Contract List', path: ROUTES.contractList },
        { label: 'Services Details', path: ROUTES.contractServices },
        { label: 'Contract Report', path: ROUTES.contractReport },
      ],
    },
    {
      label: 'Quotations',
      items: [
        { label: 'Create Quotations', path: ROUTES.quotationCreate },
        { label: 'Quotations List', path: ROUTES.quotationList },
        { label: 'Statistics', path: ROUTES.quotationStats },
      ],
    },
    {
      label: 'Customer Contact',
      items: [{ label: 'Create contact (Customers only)', path: ROUTES.contactCreate }, { label: 'List of contacts (Customers only)', path: ROUTES.contactList }],
    },
    {
      label: 'Invoices',
      items: [
        { label: 'Create Quick Invoice', path: ROUTES.invoiceCreateQuick },
        { label: 'Create Detailed Invoice', path: ROUTES.invoiceCreate },
        { label: 'List (Customers invoices)', path: ROUTES.invoiceList },
        { label: 'Abandoned (Customers only)', path: ROUTES.invoiceAbandoned },
        { label: 'Template invoices', path: ROUTES.invoiceTemplates },
        { label: 'Payment (Payments received from customers)', path: ROUTES.paymentsList },
        { label: 'Due payments' },
        { label: 'Reporting', path: ROUTES.paymentsReport },
        { label: 'Statistics (Customers invoices statistics)', path: ROUTES.invoiceStats },
        { label: 'Advance Payment List', path: ROUTES.invoiceAdvancePayments },
      ],
    },
    {
      label: 'Settings',
      items: [
        { label: 'Customers tags & categories', path: ROUTES.customerTags },
        { label: 'Contact tags and categories (Customers only)', path: ROUTES.contactTags },
        { label: 'Import Customers/Vendors', path: ROUTES.importCustomers },
      ],
    },
  ],
}
