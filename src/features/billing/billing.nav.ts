import { ShoppingCart } from 'lucide-react'
import { ROUTES } from '../../routes'
import type { NavSection } from '../navTypes'

// Mirrors the real app's "Sales" left menu (llx_menu, mainmenu=accountsreceivable)
// exactly, including item order. "Jobcard" is omitted — it's explicitly
// disabled (enabled=0) in the source database, so it never shows there either.
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
        { label: 'Contract Report' },
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
      items: [{ label: 'Create Contact/Address', path: ROUTES.contactCreate }, { label: 'List Of Contacts', path: ROUTES.contactList }],
    },
    {
      label: 'Invoices',
      items: [
        { label: 'Create Quick Invoice', path: ROUTES.invoiceCreate },
        { label: 'Create Detailed Invoice', path: ROUTES.invoiceCreate },
        { label: 'List (Customer Invoices)', path: ROUTES.invoiceList },
        { label: 'Abandoned' },
        { label: 'Template Invoices', path: ROUTES.invoiceTemplates },
        { label: 'Payment', path: ROUTES.paymentsList },
        { label: 'Due Payments' },
        { label: 'Reporting', path: ROUTES.paymentsReport },
        { label: 'Statistics', path: ROUTES.invoiceStats },
        { label: 'Advance Payment List', path: ROUTES.invoiceAdvancePayments },
      ],
    },
    {
      label: 'Settings',
      items: [{ label: 'Customer Tags/Categories', path: ROUTES.customerTags }, { label: 'Contact Tags/Categories', path: ROUTES.contactTags }, { label: 'Import Customers/Vendors', path: ROUTES.importCustomers }],
    },
  ],
}
