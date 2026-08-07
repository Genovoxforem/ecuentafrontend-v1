import { BookText } from 'lucide-react'
import type { NavSection } from '../navTypes'

// Mirrors the real app's "General Ledger" left menu (llx_menu, mainmenu=generalledger).
// The source goes 3-4 levels deep in a few spots (Default Accounting > Setup > ...,
// Reportings > ..., Binding > CustomersVentilation > ToDispatch/Dispatched) —
// deeper than this sidebar's group/leaf structure supports, so those are
// flattened to a single leaf label rather than fully expanded.
export const nav: NavSection = {
  key: 'general-ledger',
  label: 'General Ledger',
  icon: BookText,
  items: [
    {
      label: 'Default Accounting',
      items: [
        { label: 'Setup' },
        { label: 'Account Balance' },
        { label: 'Bookkeeping' },
        { label: 'Create Financial Closure' },
        { label: 'Financial Closure List' },
        { label: 'Journals' },
        { label: 'Accountant Files' },
        { label: 'Reportings' },
      ],
    },
    {
      label: 'Accounting',
      items: [
        { label: 'Accounting Area' },
        { label: 'Ledger' },
        { label: 'Account Balance' },
        { label: 'Closure' },
        { label: 'Validate Movements' },
        { label: 'Export Accounting Documents' },
        { label: 'Opening Balance' },
        { label: 'Foreign Currency Revaluation' },
      ],
    },
    { label: 'Groups', items: [{ label: 'By Predefined Groups' }, { label: 'By Personalized Groups' }] },
    { label: 'Donations', items: [{ label: 'Donations Area' }, { label: 'New Donation' }, { label: 'List' }] },
    {
      label: 'Special Expenses',
      items: [
        { label: 'Area For All Special Payments' },
        { label: 'Social/Fiscal Taxes' },
        { label: 'New Social/Fiscal Tax' },
        { label: 'List - Social/Fiscal Taxes' },
        { label: 'Payments - Social/Fiscal Taxes' },
        { label: 'Sales Tax' },
        { label: 'New Sales Tax' },
        { label: 'Report By Month - Sales Tax' },
        { label: 'Report By Customer - Sales Tax' },
        { label: 'Report By Rate - Sales Tax' },
        { label: 'Salary List' },
        { label: 'New Payment - Salaries' },
        { label: 'Payments - Salaries' },
        { label: 'Statistics - Salaries' },
        { label: 'Employee Loans' },
        { label: 'New Loans' },
        { label: 'Miscellaneous Payments' },
        { label: 'New Miscellaneous Payments' },
        { label: 'List Miscellaneous Payments' },
      ],
    },
    {
      label: 'Binding',
      items: [{ label: 'Customer Invoices Binding' }, { label: 'Supplier Invoices Binding' }, { label: 'Expense Reports Binding' }],
    },
    {
      label: 'Journal',
      items: [{ label: 'Finance Journal' }, { label: 'Expense Journal' }, { label: 'Sell Journal' }, { label: 'Purchase Journal' }],
    },
  ],
}
