import { Shield } from 'lucide-react'
import { ROUTES } from '../../routes'
import type { NavSection } from '../navTypes'

export const nav: NavSection = {
  key: 'zra',
  label: 'Zra',
  icon: Shield,
  items: [
    {
      label: 'ASYCUDA',
      items: [
        { label: 'Import(ASYCUDA)', path: ROUTES.zraImport },
        { label: 'Create Asycuda Invoice', path: ROUTES.asycudaPurchase },
      ],
    },
    {
      label: 'Sales',
      items: [
        { label: 'Invoice Details', path: ROUTES.zraInvoiceDetails },
        { label: 'Pending Sales Invoices', path: ROUTES.zraPendingSales },
      ],
    },
    {
      label: 'Customer',
      items: [
        { label: 'Customer Info', path: ROUTES.zraCustomerInfo },
        { label: 'Un-Uploaded Customers/Vendor', path: ROUTES.zraUnuploadedCustomers },
      ],
    },
    {
      label: 'Purchase',
      items: [
        { label: 'Automatic Purchase', path: ROUTES.zraAutomaticPurchase },
        { label: 'Pending Purchase Invoices', path: ROUTES.zraPendingPurchase },
      ],
    },
    {
      label: 'Item Info',
      items: [
        { label: 'Item Details', path: ROUTES.zraItemDetails },
        { label: 'Stock List', path: ROUTES.zraStockList },
        { label: 'Unuploaded Stock List', path: ROUTES.zraUnuploadedStockMovements },
        { label: 'RRP Item List', path: ROUTES.zraRrpItemList },
        { label: 'Un-Upload Products', path: ROUTES.zraUnuploadedProducts },
        { label: 'Principals(RVAT Agents)', path: ROUTES.zraPrincipals },
      ],
    },
  ],
}
