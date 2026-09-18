import type { ComponentType } from 'react'
import { CreditCard, FileSignature, ClipboardList, Layers, XCircle, BarChart } from 'lucide-react'
import { ROUTES } from '../../routes'

// Every one of these pages was confirmed this session (full Banking module
// audit) to have a real, live legacy PHP page — just no JSON API, only
// classic form-POST/HTML. The real JSON APIs found in the module (Bank
// Accounts, Bank List, List Entries, Categories, Loan List) got their own
// real components instead of this placeholder; New Financial Account, New
// Deposit, Deposit List, and New Loan got their own field-matched inert
// pages too (see banking.nav.ts's neighbors) rather than this generic one.
// List Entries/Category, Internal Transfer, and Tags/Categories Of
// Transactions moved out of this list once scraping (not just real JSON
// APIs) became an acceptable source — see BankEntriesByCategory.tsx,
// InternalTransferForm.tsx, BankTransactionTagsList.tsx. Check Deposits Area
// and Revolut moved out too, once their own real (if data-less/broken)
// layouts got built — see CheckDepositsAreaView.tsx, RevolutTransactionsView.tsx.
export interface BankingPlaceholder {
  path: string
  icon: ComponentType<{ size?: number; className?: string }>
  title: string
  description: string
}

export const BANKING_PLACEHOLDERS: BankingPlaceholder[] = [
  { path: ROUTES.bankingStripeTransactions, icon: CreditCard, title: 'List Of Stripe Transaction', description: 'Real page: stripe/transaction.php — renders live Stripe SDK data server-side as HTML, no JSON API of its own.' },
  { path: ROUTES.bankingStripePayouts, icon: CreditCard, title: 'List Of Stripe PayOut', description: 'Real page: stripe/payout.php — same live-Stripe-rendered-as-HTML pattern.' },
  { path: ROUTES.bankingDirectDebitArea, icon: FileSignature, title: 'Direct Debit Payment Orders Area', description: 'Real page: compta/prelevement/index.php — classic page, no JSON API.' },
  { path: ROUTES.bankingNewDirectDebit, icon: FileSignature, title: 'New Direct Debit Order', description: 'Real page: compta/prelevement/create.php — classic form-POST, no JSON API.' },
  { path: ROUTES.bankingDirectDebitOrders, icon: ClipboardList, title: 'Direct Debit Orders', description: 'Real page: compta/prelevement/list.php — classic list page, no JSON API.' },
  { path: ROUTES.bankingDirectDebitLines, icon: Layers, title: 'Direct Debit Order Lines', description: 'Real page: compta/prelevement/demandes.php — classic list page, no JSON API.' },
  { path: ROUTES.bankingAccountRejects, icon: XCircle, title: 'Account Rejects', description: 'Real page: compta/prelevement/rejets.php — classic list page, no JSON API.' },
  { path: ROUTES.bankingDirectDebitStats, icon: BarChart, title: 'Statistics', description: 'Real page: compta/prelevement/stats.php — classic report page, no JSON API.' },
]
