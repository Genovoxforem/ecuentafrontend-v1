import { Landmark } from 'lucide-react'
import type { NavSection } from '../navTypes'

// Mirrors the real app's "Banking" left menu (llx_menu, mainmenu=cashmanagement).
export const nav: NavSection = {
  key: 'banking',
  label: 'Banking',
  icon: Landmark,
  items: [
    {
      label: 'Banks-Cash',
      items: [
        { label: 'Bank Accounts' },
        { label: 'New Financial Account' },
        { label: 'Bank List' },
        { label: 'List Entries' },
        { label: 'List Entries/Category' },
        { label: 'Internal Transfer' },
        { label: 'Categories' },
        { label: 'Tags/Categories Of Transactions' },
      ],
    },
    { label: 'Stripe', items: [{ label: 'List Of Stripe Transaction' }, { label: 'List Of Stripe PayOut' }] },
    {
      label: 'Direct Debit Orders',
      items: [
        { label: 'Direct Debit Payment Orders Area' },
        { label: 'New Direct Debit Order' },
        { label: 'Direct Debit Orders' },
        { label: 'Direct Debit Order Lines' },
        { label: 'Account Rejects' },
        { label: 'Statistics' },
      ],
    },
    {
      label: 'Check Deposits',
      items: [{ label: 'Check Deposits Area' }, { label: 'New Deposit' }, { label: 'Deposit List' }],
    },
    { label: 'Employee Loans', items: [{ label: 'New Loans' }, { label: 'Loan List' }] },
    { label: 'Revolut' },
  ],
}
