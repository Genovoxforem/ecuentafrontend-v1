import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { ROUTES } from '../../routes'
import { RouteBoundary } from '../RouteBoundary'

const ExpenseReportsListModule = lazy(() => import('../../modules/expenses/ExpenseReportsListModule').then((m) => ({ default: m.ExpenseReportsListModule })))
const SpecialExpensesModule = lazy(() => import('../../modules/expenses/SpecialExpensesModule').then((m) => ({ default: m.SpecialExpensesModule })))
const ExpenseDashboardModule = lazy(() => import('../../modules/expenses/ExpenseDashboardModule').then((m) => ({ default: m.ExpenseDashboardModule })))
const ExpenseCreateModule = lazy(() => import('../../modules/expenses/ExpenseCreateModule').then((m) => ({ default: m.ExpenseCreateModule })))
const ExpenseApprovalsModule = lazy(() => import('../../modules/expenses/ExpenseApprovalsModule').then((m) => ({ default: m.ExpenseApprovalsModule })))
const ExpensePaymentsModule = lazy(() => import('../../modules/expenses/ExpensePaymentsModule').then((m) => ({ default: m.ExpensePaymentsModule })))
const ExpenseAdvancesModule = lazy(() => import('../../modules/expenses/ExpenseAdvancesModule').then((m) => ({ default: m.ExpenseAdvancesModule })))
const ExpenseReimbursementsModule = lazy(() => import('../../modules/expenses/ExpenseReimbursementsModule').then((m) => ({ default: m.ExpenseReimbursementsModule })))
const ExpenseRepaymentsModule = lazy(() => import('../../modules/expenses/ExpenseRepaymentsModule').then((m) => ({ default: m.ExpenseRepaymentsModule })))
const ExpenseRecurringModule = lazy(() => import('../../modules/expenses/ExpenseRecurringModule').then((m) => ({ default: m.ExpenseRecurringModule })))
const ExpenseReportsModule = lazy(() => import('../../modules/expenses/ExpenseReportsModule').then((m) => ({ default: m.ExpenseReportsModule })))
const ExpenseAnalyticsModule = lazy(() => import('../../modules/expenses/ExpenseAnalyticsModule').then((m) => ({ default: m.ExpenseAnalyticsModule })))
const ExpenseBudgetsModule = lazy(() => import('../../modules/expenses/ExpenseBudgetsModule').then((m) => ({ default: m.ExpenseBudgetsModule })))
const ExpenseCardModule = lazy(() => import('../../modules/expenses/ExpenseCardModule').then((m) => ({ default: m.ExpenseCardModule })))
const ExpenseReportDetailModule = lazy(() => import('../../modules/expenses/ExpenseReportDetailModule').then((m) => ({ default: m.ExpenseReportDetailModule })))

// Routes of the expenses area, rendered inside the app layout (see src/App.tsx).
export function expensesRoutes() {
  return (
    <>
      <Route
        path={ROUTES.expensesList}
        element={
          <RouteBoundary>
            <ExpenseReportsListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.specialExpenses}
        element={
          <RouteBoundary>
            <SpecialExpensesModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.expensesOverview}
        element={
          <RouteBoundary>
            <ExpenseDashboardModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.expensesCreate}
        element={
          <RouteBoundary>
            <ExpenseCreateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.expensesApprovals}
        element={
          <RouteBoundary>
            <ExpenseApprovalsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.expensesPayments}
        element={
          <RouteBoundary>
            <ExpensePaymentsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.expensesAdvances}
        element={
          <RouteBoundary>
            <ExpenseAdvancesModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.expensesReimbursements}
        element={
          <RouteBoundary>
            <ExpenseReimbursementsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.expensesRepayments}
        element={
          <RouteBoundary>
            <ExpenseRepaymentsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.expensesRecurring}
        element={
          <RouteBoundary>
            <ExpenseRecurringModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.expensesReports}
        element={
          <RouteBoundary>
            <ExpenseReportsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.expensesAnalytics}
        element={
          <RouteBoundary>
            <ExpenseAnalyticsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.expensesBudgets}
        element={
          <RouteBoundary>
            <ExpenseBudgetsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.expenseCard}
        element={
          <RouteBoundary>
            <ExpenseCardModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.expenseReportDetail}
        element={
          <RouteBoundary>
            <ExpenseReportDetailModule />
          </RouteBoundary>
        }
      />
    </>
  )
}
