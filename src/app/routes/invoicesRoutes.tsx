import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { ROUTES } from '../../routes'
import { RouteBoundary } from '../RouteBoundary'

const InvoiceCreateFromCustomerModule = lazy(() => import('../../modules/invoices/InvoiceCreateFromCustomerModule').then((m) => ({ default: m.InvoiceCreateFromCustomerModule })))
const InvoicesListModule = lazy(() => import('../../modules/invoices/InvoicesListModule').then((m) => ({ default: m.InvoicesListModule })))
const AbandonedInvoicesModule = lazy(() => import('../../modules/invoices/AbandonedInvoicesModule').then((m) => ({ default: m.AbandonedInvoicesModule })))
const InvoiceCreateModule = lazy(() => import('../../modules/invoices/InvoiceCreateModule').then((m) => ({ default: m.InvoiceCreateModule })))
const QuickInvoiceCreateModule = lazy(() => import('../../modules/invoices/QuickInvoiceCreateModule').then((m) => ({ default: m.QuickInvoiceCreateModule })))
const TemplateInvoicesModule = lazy(() => import('../../modules/invoices/TemplateInvoicesModule').then((m) => ({ default: m.TemplateInvoicesModule })))
const PaymentCardModule = lazy(() => import('../../modules/invoices/PaymentCardModule').then((m) => ({ default: m.PaymentCardModule })))
const PaymentsListModule = lazy(() => import('../../modules/invoices/PaymentsListModule').then((m) => ({ default: m.PaymentsListModule })))
const PaymentsReportModule = lazy(() => import('../../modules/invoices/PaymentsReportModule').then((m) => ({ default: m.PaymentsReportModule })))
const DuePaymentsModule = lazy(() => import('../../modules/invoices/DuePaymentsModule').then((m) => ({ default: m.DuePaymentsModule })))
const InvoiceStatisticsModule = lazy(() => import('../../modules/invoices/InvoiceStatisticsModule').then((m) => ({ default: m.InvoiceStatisticsModule })))
const AdvancePaymentListModule = lazy(() => import('../../modules/invoices/AdvancePaymentListModule').then((m) => ({ default: m.AdvancePaymentListModule })))
const InvoiceDetailModule = lazy(() => import('../../modules/invoices/InvoiceDetailModule').then((m) => ({ default: m.InvoiceDetailModule })))

// Routes of the invoices area, rendered inside the app layout (see src/App.tsx).
export function invoicesRoutes() {
  return (
    <>
      <Route
        path={ROUTES.customerInvoiceCreate}
        element={
          <RouteBoundary>
            <InvoiceCreateFromCustomerModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.invoiceList}
        element={
          <RouteBoundary>
            <InvoicesListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.invoiceAbandoned}
        element={
          <RouteBoundary>
            <AbandonedInvoicesModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.invoiceCreate}
        element={
          <RouteBoundary>
            <InvoiceCreateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.invoiceCreateQuick}
        element={
          <RouteBoundary>
            <QuickInvoiceCreateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.invoiceTemplates}
        element={
          <RouteBoundary>
            <TemplateInvoicesModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.paymentsList}
        element={
          <RouteBoundary>
            <PaymentsListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.paymentCard}
        element={
          <RouteBoundary>
            <PaymentCardModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.paymentsReport}
        element={
          <RouteBoundary>
            <PaymentsReportModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.paymentsDue}
        element={
          <RouteBoundary>
            <DuePaymentsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.invoiceStats}
        element={
          <RouteBoundary>
            <InvoiceStatisticsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.invoiceAdvancePayments}
        element={
          <RouteBoundary>
            <AdvancePaymentListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.invoiceDetail}
        element={
          <RouteBoundary>
            <InvoiceDetailModule />
          </RouteBoundary>
        }
      />
    </>
  )
}
