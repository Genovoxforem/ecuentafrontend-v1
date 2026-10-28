import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { ROUTES } from '../../routes'
import { RouteBoundary } from '../RouteBoundary'

const AllLoansListModule = lazy(() => import('../../modules/loans/AllLoansListModule').then((m) => ({ default: m.AllLoansListModule })))
const LoanCalculatorModule = lazy(() => import('../../modules/loans/LoanCalculatorModule').then((m) => ({ default: m.LoanCalculatorModule })))
const LoanProductsModule = lazy(() => import('../../modules/loans/LoanProductsModule').then((m) => ({ default: m.LoanProductsModule })))
const LoanRepaymentModule = lazy(() => import('../../modules/loans/LoanRepaymentModule').then((m) => ({ default: m.LoanRepaymentModule })))
const LoanTypeListModule = lazy(() => import('../../modules/loans/LoanTypeListModule').then((m) => ({ default: m.LoanTypeListModule })))
const LoanCustomerListModule = lazy(() => import('../../modules/loans/LoanCustomerListModule').then((m) => ({ default: m.LoanCustomerListModule })))
const LoanCustomerCreateModule = lazy(() => import('../../modules/loans/LoanCustomerCreateModule').then((m) => ({ default: m.LoanCustomerCreateModule })))

// Routes of the loans area, rendered inside the app layout (see src/App.tsx).
export function loansRoutes() {
  return (
    <>
      <Route
        path={ROUTES.loanManagementList}
        element={
          <RouteBoundary>
            <AllLoansListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.loanCalculator}
        element={
          <RouteBoundary>
            <LoanCalculatorModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.loanProducts}
        element={
          <RouteBoundary>
            <LoanProductsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.loanRepayment}
        element={
          <RouteBoundary>
            <LoanRepaymentModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.loanType}
        element={
          <RouteBoundary>
            <LoanTypeListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.loanCustomerList}
        element={
          <RouteBoundary>
            <LoanCustomerListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.loanCustomerCreate}
        element={
          <RouteBoundary>
            <LoanCustomerCreateModule />
          </RouteBoundary>
        }
      />
    </>
  )
}
