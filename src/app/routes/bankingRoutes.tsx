import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { ROUTES } from '../../routes'
import { RouteBoundary } from '../RouteBoundary'

const BankAccountsListModule = lazy(() => import('../../modules/banking/BankAccountsListModule').then((m) => ({ default: m.BankAccountsListModule })))
const BankAccountDetailModule = lazy(() => import('../../modules/banking/BankAccountDetailModule').then((m) => ({ default: m.BankAccountDetailModule })))
const BankEntriesListModule = lazy(() => import('../../modules/banking/BankEntriesListModule').then((m) => ({ default: m.BankEntriesListModule })))
const BankEntryDetailModule = lazy(() => import('../../modules/banking/BankEntryDetailModule').then((m) => ({ default: m.BankEntryDetailModule })))
const BankEntriesByCategoryModule = lazy(() => import('../../modules/banking/BankEntriesByCategoryModule').then((m) => ({ default: m.BankEntriesByCategoryModule })))
const InternalTransferModule = lazy(() => import('../../modules/banking/InternalTransferModule').then((m) => ({ default: m.InternalTransferModule })))
const BankTransactionTagsListModule = lazy(() => import('../../modules/banking/BankTransactionTagsListModule').then((m) => ({ default: m.BankTransactionTagsListModule })))
const BankAccountCategoriesListModule = lazy(() => import('../../modules/banking/BankAccountCategoriesListModule').then((m) => ({ default: m.BankAccountCategoriesListModule })))
const LoanListModule = lazy(() => import('../../modules/banking/LoanListModule').then((m) => ({ default: m.LoanListModule })))
const BankAccountCreateModule = lazy(() => import('../../modules/banking/BankAccountCreateModule').then((m) => ({ default: m.BankAccountCreateModule })))
const LoanCreateModule = lazy(() => import('../../modules/banking/LoanCreateModule').then((m) => ({ default: m.LoanCreateModule })))
const CheckDepositCreateModule = lazy(() => import('../../modules/banking/CheckDepositCreateModule').then((m) => ({ default: m.CheckDepositCreateModule })))
const CheckDepositListModule = lazy(() => import('../../modules/banking/CheckDepositListModule').then((m) => ({ default: m.CheckDepositListModule })))
const CheckDepositsAreaModule = lazy(() => import('../../modules/banking/CheckDepositsAreaModule').then((m) => ({ default: m.CheckDepositsAreaModule })))
const RevolutModule = lazy(() => import('../../modules/banking/RevolutModule').then((m) => ({ default: m.RevolutModule })))
const StripeTransactionsModule = lazy(() => import('../../modules/banking/BankingDirectDebitModules').then((m) => ({ default: m.StripeTransactionsModule })))
const StripePayoutsModule = lazy(() => import('../../modules/banking/BankingDirectDebitModules').then((m) => ({ default: m.StripePayoutsModule })))
const DirectDebitAreaModule = lazy(() => import('../../modules/banking/BankingDirectDebitModules').then((m) => ({ default: m.DirectDebitAreaModule })))
const DirectDebitNewModule = lazy(() => import('../../modules/banking/BankingDirectDebitModules').then((m) => ({ default: m.DirectDebitNewModule })))
const DirectDebitOrdersModule = lazy(() => import('../../modules/banking/BankingDirectDebitModules').then((m) => ({ default: m.DirectDebitOrdersModule })))
const DirectDebitRequestsModule = lazy(() => import('../../modules/banking/BankingDirectDebitModules').then((m) => ({ default: m.DirectDebitRequestsModule })))
const DirectDebitRejectsModule = lazy(() => import('../../modules/banking/BankingDirectDebitModules').then((m) => ({ default: m.DirectDebitRejectsModule })))
const DirectDebitStatsModule = lazy(() => import('../../modules/banking/BankingDirectDebitModules').then((m) => ({ default: m.DirectDebitStatsModule })))

// Routes of the banking area, rendered inside the app layout (see src/App.tsx).
export function bankingRoutes() {
  return (
    <>
      <Route
        path={ROUTES.bankingAccounts}
        element={
          <RouteBoundary>
            <BankAccountsListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.bankingAccountDetail}
        element={
          <RouteBoundary>
            <BankAccountDetailModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.bankingList}
        element={
          <RouteBoundary>
            <BankAccountsListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.bankingEntries}
        element={
          <RouteBoundary>
            <BankEntriesListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.bankingEntryDetail}
        element={
          <RouteBoundary>
            <BankEntryDetailModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.bankingEntriesByCategory}
        element={
          <RouteBoundary>
            <BankEntriesByCategoryModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.bankingInternalTransfer}
        element={
          <RouteBoundary>
            <InternalTransferModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.bankingTransactionTags}
        element={
          <RouteBoundary>
            <BankTransactionTagsListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.bankingCategories}
        element={
          <RouteBoundary>
            <BankAccountCategoriesListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.bankingLoanList}
        element={
          <RouteBoundary>
            <LoanListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.bankingNewAccount}
        element={
          <RouteBoundary>
            <BankAccountCreateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.bankingNewLoan}
        element={
          <RouteBoundary>
            <LoanCreateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.bankingNewDeposit}
        element={
          <RouteBoundary>
            <CheckDepositCreateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.bankingDepositList}
        element={
          <RouteBoundary>
            <CheckDepositListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.bankingCheckDepositsArea}
        element={
          <RouteBoundary>
            <CheckDepositsAreaModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.bankingRevolut}
        element={
          <RouteBoundary>
            <RevolutModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.bankingStripeTransactions}
        element={
          <RouteBoundary>
            <StripeTransactionsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.bankingStripePayouts}
        element={
          <RouteBoundary>
            <StripePayoutsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.bankingDirectDebitArea}
        element={
          <RouteBoundary>
            <DirectDebitAreaModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.bankingNewDirectDebit}
        element={
          <RouteBoundary>
            <DirectDebitNewModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.bankingDirectDebitOrders}
        element={
          <RouteBoundary>
            <DirectDebitOrdersModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.bankingDirectDebitLines}
        element={
          <RouteBoundary>
            <DirectDebitRequestsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.bankingAccountRejects}
        element={
          <RouteBoundary>
            <DirectDebitRejectsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.bankingDirectDebitStats}
        element={
          <RouteBoundary>
            <DirectDebitStatsModule />
          </RouteBoundary>
        }
      />
    </>
  )
}
