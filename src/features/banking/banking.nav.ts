import { Landmark } from 'lucide-react'
import { ROUTES } from '../../routes'
import type { NavSection } from '../navTypes'

// Mirrors the real app's "Banking" left menu (llx_menu, mainmenu=cashmanagement).
// Every item now has a real path — confirmed this session (full module
// audit): Bank Accounts/Bank List, List Entries, Categories, and Loan List
// are genuinely real JSON APIs; every other item is a real legacy page with
// no JSON API, rendered as an honest NotBuiltPage placeholder.
export const nav: NavSection = {
  key: 'banking',
  label: 'Banking',
  icon: Landmark,
  items: [
    {
      label: 'Banks-Cash',
      items: [
        { label: 'Bank Accounts', path: ROUTES.bankingAccounts },
        { label: 'New Financial Account', path: ROUTES.bankingNewAccount },
        { label: 'Bank List', path: ROUTES.bankingList },
        { label: 'List Entries', path: ROUTES.bankingEntries },
        { label: 'List Entries/Category', path: ROUTES.bankingEntriesByCategory },
        { label: 'Internal Transfer', path: ROUTES.bankingInternalTransfer },
        { label: 'Categories', path: ROUTES.bankingCategories },
        { label: 'Tags/Categories Of Transactions', path: ROUTES.bankingTransactionTags },
      ],
    },
    {
      label: 'Stripe',
      items: [
        { label: 'List Of Stripe Transaction', path: ROUTES.bankingStripeTransactions },
        { label: 'List Of Stripe PayOut', path: ROUTES.bankingStripePayouts },
      ],
    },
    {
      label: 'Direct Debit Orders',
      items: [
        { label: 'Direct Debit Payment Orders Area', path: ROUTES.bankingDirectDebitArea },
        { label: 'New Direct Debit Order', path: ROUTES.bankingNewDirectDebit },
        { label: 'Direct Debit Orders', path: ROUTES.bankingDirectDebitOrders },
        { label: 'Direct Debit Order Lines', path: ROUTES.bankingDirectDebitLines },
        { label: 'Account Rejects', path: ROUTES.bankingAccountRejects },
        { label: 'Statistics', path: ROUTES.bankingDirectDebitStats },
      ],
    },
    {
      label: 'Check Deposits',
      items: [
        { label: 'Check Deposits Area', path: ROUTES.bankingCheckDepositsArea },
        { label: 'New Deposit', path: ROUTES.bankingNewDeposit },
        { label: 'Deposit List', path: ROUTES.bankingDepositList },
      ],
    },
    {
      label: 'Employee Loans',
      items: [
        { label: 'New Loans', path: ROUTES.bankingNewLoan },
        { label: 'Loan List', path: ROUTES.bankingLoanList },
      ],
    },
    { label: 'Revolut', path: ROUTES.bankingRevolut },
  ],
}
