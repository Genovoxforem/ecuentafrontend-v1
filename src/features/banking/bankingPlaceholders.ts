import type { ComponentType } from 'react'
import { ListTree, ArrowLeftRight, Tags, CreditCard, FileSignature, ClipboardList, Layers, XCircle, BarChart, Wallet2, Banknote } from 'lucide-react'
import { ROUTES } from '../../routes'

// Every one of these pages was confirmed this session (full Banking module
// audit) to have a real, live legacy PHP page — just no JSON API, only
// classic form-POST/HTML. The real JSON APIs found in the module (Bank
// Accounts, Bank List, List Entries, Categories, Loan List) got their own
// real components instead of this placeholder; New Financial Account, New
// Deposit, Deposit List, and New Loan got their own field-matched inert
// pages too (see banking.nav.ts's neighbors) rather than this generic one.
export interface BankingPlaceholder {
  path: string
  icon: ComponentType<{ size?: number; className?: string }>
  title: string
  description: string
}

export const BANKING_PLACEHOLDERS: BankingPlaceholder[] = [
  { path: ROUTES.bankingEntriesByCategory, icon: ListTree, title: 'List Entries/Category', description: 'Real page: compta/bank/budget.php — classic report page, no JSON API.' },
  { path: ROUTES.bankingInternalTransfer, icon: ArrowLeftRight, title: 'Internal Transfer', description: 'Real page: compta/bank/transfer.php — classic form-POST, no JSON API.' },
  { path: ROUTES.bankingTransactionTags, icon: Tags, title: 'Tags/Categories Of Transactions', description: 'Real page: compta/bank/categ.php (manages llx_bank_categ, a different table from the account-level Categories page) — classic form-POST, no JSON API.' },
  { path: ROUTES.bankingStripeTransactions, icon: CreditCard, title: 'List Of Stripe Transaction', description: 'Real page: stripe/transaction.php — renders live Stripe SDK data server-side as HTML, no JSON API of its own.' },
  { path: ROUTES.bankingStripePayouts, icon: CreditCard, title: 'List Of Stripe PayOut', description: 'Real page: stripe/payout.php — same live-Stripe-rendered-as-HTML pattern.' },
  { path: ROUTES.bankingDirectDebitArea, icon: FileSignature, title: 'Direct Debit Payment Orders Area', description: 'Real page: compta/prelevement/index.php — classic page, no JSON API.' },
  { path: ROUTES.bankingNewDirectDebit, icon: FileSignature, title: 'New Direct Debit Order', description: 'Real page: compta/prelevement/create.php — classic form-POST, no JSON API.' },
  { path: ROUTES.bankingDirectDebitOrders, icon: ClipboardList, title: 'Direct Debit Orders', description: 'Real page: compta/prelevement/list.php — classic list page, no JSON API.' },
  { path: ROUTES.bankingDirectDebitLines, icon: Layers, title: 'Direct Debit Order Lines', description: 'Real page: compta/prelevement/demandes.php — classic list page, no JSON API.' },
  { path: ROUTES.bankingAccountRejects, icon: XCircle, title: 'Account Rejects', description: 'Real page: compta/prelevement/rejets.php — classic list page, no JSON API.' },
  { path: ROUTES.bankingDirectDebitStats, icon: BarChart, title: 'Statistics', description: 'Real page: compta/prelevement/stats.php — classic report page, no JSON API.' },
  { path: ROUTES.bankingCheckDepositsArea, icon: Wallet2, title: 'Check Deposits Area', description: 'Real page: compta/paiement/cheque/index.php — classic page, no JSON API.' },
  {
    path: ROUTES.bankingRevolut,
    icon: Banknote,
    title: 'Revolut',
    description:
      'Real code exists (custom/revolut/bank_sync.php) — a genuine multi-bank auto-reconciliation engine (Revolut/FNB/Airtel/MTN/Stanbic/Zanaco) with real permission checks and JSON output. Not wired here: it reads/writes llx_bank_account columns (api_provider, api_enabled, etc.) that don\'t exist in any tracked SQL migration in this codebase — likely non-functional as shipped. Flagged, not fixed (frontend-only scope).',
  },
]
