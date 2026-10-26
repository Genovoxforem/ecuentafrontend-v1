import {
  DirectDebitAreaPage,
  DirectDebitNewPage,
  DirectDebitOrdersPage,
  DirectDebitRejectsPage,
  DirectDebitRequestsPage,
  DirectDebitStatsPage,
} from '../../features/banking/components/DirectDebitPages'
import { StripePayoutsPage, StripeTransactionsPage } from '../../features/banking/components/StripePages'

export const DirectDebitAreaModule = () => <DirectDebitAreaPage />
export const DirectDebitNewModule = () => <DirectDebitNewPage />
export const DirectDebitOrdersModule = () => <DirectDebitOrdersPage />
export const DirectDebitRequestsModule = () => <DirectDebitRequestsPage />
export const DirectDebitRejectsModule = () => <DirectDebitRejectsPage />
export const DirectDebitStatsModule = () => <DirectDebitStatsPage />
export const StripeTransactionsModule = () => <StripeTransactionsPage />
export const StripePayoutsModule = () => <StripePayoutsPage />
