import { Landmark } from 'lucide-react'
import { DisabledFormPage } from '../../../../shared/components/forms/DisabledFormPage'

// accountancy/admin/defaultaccounts.php — a single settings form mapping
// default GL accounts to business functions (reads/writes Dolibarr
// constants directly, no list query, no JSON). Grouped sections below match
// the real page's own conditional layout.
export function DefaultAccountsPage() {
  return (
    <DisabledFormPage
      icon={Landmark}
      title="Default Accounts"
      sourcePath="accountancy/admin/defaultaccounts.php"
      sections={[
        {
          heading: 'Third Parties | Users',
          fields: [{ label: 'Customer Account' }, { label: 'Supplier Account' }, { label: 'Salaries Payment Account' }],
        },
        {
          heading: 'Product',
          fields: [
            { label: 'Product Sold Account' },
            { label: 'Product Bought Account' },
            { label: 'VAT Sold Account' },
            { label: 'VAT Bought Account' },
          ],
        },
        { heading: 'Service', fields: [{ label: 'Service Sold Account' }, { label: 'Service Bought Account' }] },
        {
          heading: 'Others',
          fields: [
            { label: 'Suspense Account' },
            { label: 'Transfer Cash Account' },
            { label: 'Donation Account' },
            { label: 'Subscription Account' },
            { label: 'Customer Deposit Account' },
            { label: 'Customer Opening Account' },
            { label: 'Customer Advance Account' },
            { label: 'Supplier Advance Account' },
            { label: 'Ledger Opening Account' },
            { label: 'Ledger Shipping Account' },
            { label: 'Customer Loan Account' },
            { label: 'Customer Interest Account' },
          ],
        },
        {
          heading: 'Loan Management',
          fields: [
            { label: 'Loan Capital Account' },
            { label: 'Loan Interest Account' },
            { label: 'Loan Insurance Account' },
            { label: 'Loan Penalty Account' },
          ],
        },
      ]}
    />
  )
}
