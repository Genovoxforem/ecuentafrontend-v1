import type { ComponentType } from 'react'
import { CreditCard, FileSignature, ClipboardList, Layers, XCircle, BarChart } from 'lucide-react'
import { ROUTES } from '../../routes'

// These pages have legacy HTML endpoints rather than dedicated JSON APIs.
// LegacyBankingPage renders their tables and forms as native React UI.
export interface BankingPlaceholder {
  path: string
  legacyPath: string
  icon: ComponentType<{ size?: number; className?: string }>
  title: string
  description: string
}

export const BANKING_PLACEHOLDERS: BankingPlaceholder[] = [
  { path: ROUTES.bankingStripeTransactions, legacyPath: '/stripe/transaction.php', icon: CreditCard, title: 'List Of Stripe Transaction', description: 'Stripe transactions' },
  { path: ROUTES.bankingStripePayouts, legacyPath: '/stripe/payout.php', icon: CreditCard, title: 'List Of Stripe PayOut', description: 'Stripe payouts' },
  { path: ROUTES.bankingDirectDebitArea, legacyPath: '/compta/prelevement/index.php', icon: FileSignature, title: 'Direct Debit Payment Orders Area', description: 'Direct debit payment orders' },
  { path: ROUTES.bankingNewDirectDebit, legacyPath: '/compta/prelevement/create.php', icon: FileSignature, title: 'New Direct Debit Order', description: 'Create a direct debit order' },
  { path: ROUTES.bankingDirectDebitOrders, legacyPath: '/compta/prelevement/list.php', icon: ClipboardList, title: 'Direct Debit Orders', description: 'Direct debit orders list' },
  { path: ROUTES.bankingDirectDebitLines, legacyPath: '/compta/prelevement/demandes.php', icon: Layers, title: 'Direct Debit Order Lines', description: 'Direct debit order lines' },
  { path: ROUTES.bankingAccountRejects, legacyPath: '/compta/prelevement/rejets.php', icon: XCircle, title: 'Account Rejects', description: 'Rejected direct debit orders' },
  { path: ROUTES.bankingDirectDebitStats, legacyPath: '/compta/prelevement/stats.php', icon: BarChart, title: 'Statistics', description: 'Direct debit statistics' },
]
