import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { ROUTES } from '../../routes'
import { RouteBoundary } from '../RouteBoundary'

const QuotationCreateInterventionModule = lazy(() => import('../../modules/quotations/QuotationCreateInterventionModule').then((m) => ({ default: m.QuotationCreateInterventionModule })))
const QuotationCreateContractModule = lazy(() => import('../../modules/quotations/QuotationCreateContractModule').then((m) => ({ default: m.QuotationCreateContractModule })))
const QuotationCreateInvoiceModule = lazy(() => import('../../modules/quotations/QuotationCreateInvoiceModule').then((m) => ({ default: m.QuotationCreateInvoiceModule })))
const ConsumptionHistoryModule = lazy(() => import('../../modules/quotations/ConsumptionHistoryModule').then((m) => ({ default: m.ConsumptionHistoryModule })))
const QuotationCreateFromCustomerModule = lazy(() => import('../../modules/quotations/QuotationCreateFromCustomerModule').then((m) => ({ default: m.QuotationCreateFromCustomerModule })))
const QuotationsListModule = lazy(() => import('../../modules/quotations/QuotationsListModule').then((m) => ({ default: m.QuotationsListModule })))
const QuotationCreateModule = lazy(() => import('../../modules/quotations/QuotationCreateModule').then((m) => ({ default: m.QuotationCreateModule })))
const QuotationDetailModule = lazy(() => import('../../modules/quotations/QuotationDetailModule').then((m) => ({ default: m.QuotationDetailModule })))
const QuotationStatisticsModule = lazy(() => import('../../modules/quotations/QuotationStatisticsModule').then((m) => ({ default: m.QuotationStatisticsModule })))

// Routes of the quotations area, rendered inside the app layout (see src/App.tsx).
export function quotationsRoutes() {
  return (
    <>
      <Route
        path={ROUTES.quotationCreateIntervention}
        element={
          <RouteBoundary>
            <QuotationCreateInterventionModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.quotationCreateContract}
        element={
          <RouteBoundary>
            <QuotationCreateContractModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.quotationCreateInvoice}
        element={
          <RouteBoundary>
            <QuotationCreateInvoiceModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.quotationConsumptionHistory}
        element={
          <RouteBoundary>
            <ConsumptionHistoryModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.customerQuotationCreate}
        element={
          <RouteBoundary>
            <QuotationCreateFromCustomerModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.quotationList}
        element={
          <RouteBoundary>
            <QuotationsListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.quotationCreate}
        element={
          <RouteBoundary>
            <QuotationCreateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.quotationDetail}
        element={
          <RouteBoundary>
            <QuotationDetailModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.quotationStats}
        element={
          <RouteBoundary>
            <QuotationStatisticsModule />
          </RouteBoundary>
        }
      />
    </>
  )
}
