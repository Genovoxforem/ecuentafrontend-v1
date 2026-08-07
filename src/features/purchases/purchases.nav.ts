import { ShoppingBag } from 'lucide-react'
import { ROUTES } from '../../routes'
import type { NavSection } from '../navTypes'

export const nav: NavSection = {
  key: 'purchases',
  label: 'Purchases',
  icon: ShoppingBag,
  items: [
    {
      label: 'Vendors',
      items: [
        { label: 'New Vendor', path: ROUTES.vendorCreate },
        { label: 'List Of Vendors', path: ROUTES.vendorList },
        { label: 'Vendors Tags & Categories', path: ROUTES.vendorTags },
      ],
    },
    {
      label: 'Purchase Orders',
      items: [
        { label: 'New Order', path: ROUTES.purchaseOrderCreate },
        { label: 'List', path: ROUTES.purchaseOrderList },
        { label: 'Statistics', path: ROUTES.purchaseOrderStats },
      ],
    },
    {
      label: 'Vendor Proposals',
      items: [
        { label: 'Vendor Proposals Area' },
        { label: 'New Price Request', path: ROUTES.supplierProposalCreate },
        { label: 'Vendor Proposal List', path: ROUTES.supplierProposalList },
      ],
    },
    {
      label: 'Contacts/Addresses',
      items: [
        { label: 'New Contact (Vendor Only)', path: ROUTES.vendorContactCreate },
        { label: 'List Of Contacts (Vendor Only)', path: ROUTES.vendorContactList },
        { label: 'Contact Tags And Categories (Vendor Only)', path: ROUTES.vendorContactTags },
      ],
    },
    {
      label: 'Purchases',
      items: [
        { label: 'Create Quick Purchase', path: ROUTES.vendorInvoiceCreate },
        { label: 'Create Detailed Purchase', path: ROUTES.vendorInvoiceCreate },
        { label: 'Vendor Invoices', path: ROUTES.vendorInvoiceList },
        { label: 'Paid (Vendor Invoices)', path: ROUTES.vendorInvoicePaid },
        { label: 'Not Paid (Vendor Invoices)', path: ROUTES.vendorInvoiceUnpaid },
        { label: 'Vendor Payments', path: ROUTES.vendorPaymentsList },
        { label: 'Reporting (Payments Reports)', path: ROUTES.vendorPaymentsReport },
        { label: 'Vendors Invoices Statistics', path: ROUTES.vendorInvoiceStats },
      ],
    },
  ],
}
