import {
  DirectDebitAreaPage,
  DirectDebitNewPage,
  DirectDebitOrdersPage,
  DirectDebitRejectsPage,
  DirectDebitRequestsPage,
  DirectDebitStatsPage,
} from '../../features/banking/components/DirectDebitPages'
import { BackendUnavailableCard } from '../../shared/components/BackendUnavailable'
import { StripePayoutsPage, StripeTransactionsPage } from '../../features/banking/components/StripePages'

export const DirectDebitAreaModule = () => <DirectDebitAreaPage />
export const DirectDebitNewModule = () => <DirectDebitNewPage />
// The classic "Direct Debit orders" (prelevement/bons.php, the withdrawal receipts: Date, Amount, Status) has no JSON list: orders.php answers the order
// lines, candidates and create only. The order LINES are the classic "Direct Debit order lines" (prelevement/list.php).
export const DirectDebitReceiptsModule = () => <BackendUnavailableCard feature="Direct debit orders (withdrawal receipts)" />
export const DirectDebitOrdersModule = () => <DirectDebitOrdersPage />
export const DirectDebitRequestsModule = () => <DirectDebitRequestsPage />
export const DirectDebitRejectsModule = () => <DirectDebitRejectsPage />
export const DirectDebitStatsModule = () => <DirectDebitStatsPage />
export const StripeTransactionsModule = () => <StripeTransactionsPage />
export const StripePayoutsModule = () => <StripePayoutsPage />
