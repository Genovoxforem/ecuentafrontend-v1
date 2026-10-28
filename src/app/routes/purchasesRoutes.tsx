import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { ROUTES } from '../../routes'
import { RouteBoundary } from '../RouteBoundary'

const PurchasesModule = lazy(() => import('../../modules/purchases/PurchasesModule').then((m) => ({ default: m.PurchasesModule })))
const VendorInvoiceCreateFromCustomerModule = lazy(() => import('../../modules/purchases/VendorInvoiceCreateFromCustomerModule').then((m) => ({ default: m.VendorInvoiceCreateFromCustomerModule })))
const VendorTagsModule = lazy(() => import('../../modules/purchases/VendorTagsModule').then((m) => ({ default: m.VendorTagsModule })))
const PurchaseOrderStatisticsModule = lazy(() => import('../../modules/purchases/PurchaseOrderStatisticsModule').then((m) => ({ default: m.PurchaseOrderStatisticsModule })))
const VendorProposalsAreaModule = lazy(() => import('../../modules/purchases/VendorProposalsAreaModule').then((m) => ({ default: m.VendorProposalsAreaModule })))
const VendorContactCreateModule = lazy(() => import('../../modules/purchases/VendorContactCreateModule').then((m) => ({ default: m.VendorContactCreateModule })))
const VendorContactListModule = lazy(() => import('../../modules/purchases/VendorContactListModule').then((m) => ({ default: m.VendorContactListModule })))
const VendorContactDetailModule = lazy(() => import('../../modules/purchases/VendorContactDetailModule').then((m) => ({ default: m.VendorContactDetailModule })))
const VendorContactTagsModule = lazy(() => import('../../modules/purchases/VendorContactTagsModule').then((m) => ({ default: m.VendorContactTagsModule })))
const QuickPurchaseCreateModule = lazy(() => import('../../modules/purchases/QuickPurchaseCreateModule').then((m) => ({ default: m.QuickPurchaseCreateModule })))
const DetailedPurchaseCreateModule = lazy(() => import('../../modules/purchases/DetailedPurchaseCreateModule').then((m) => ({ default: m.DetailedPurchaseCreateModule })))
const VendorInvoiceListModule = lazy(() => import('../../modules/purchases/VendorInvoiceListModule').then((m) => ({ default: m.VendorInvoiceListModule })))
const VendorInvoiceDetailModule = lazy(() => import('../../modules/purchases/VendorInvoiceDetailModule').then((m) => ({ default: m.VendorInvoiceDetailModule })))
const VendorInvoicePaidModule = lazy(() => import('../../modules/purchases/VendorInvoicePaidModule').then((m) => ({ default: m.VendorInvoicePaidModule })))
const VendorInvoiceUnpaidModule = lazy(() => import('../../modules/purchases/VendorInvoiceUnpaidModule').then((m) => ({ default: m.VendorInvoiceUnpaidModule })))
const VendorInvoiceManualModule = lazy(() => import('../../modules/purchases/VendorInvoiceManualModule').then((m) => ({ default: m.VendorInvoiceManualModule })))
const VendorInvoiceAutomaticModule = lazy(() => import('../../modules/purchases/VendorInvoiceAutomaticModule').then((m) => ({ default: m.VendorInvoiceAutomaticModule })))
const VendorInvoiceExpenseModule = lazy(() => import('../../modules/purchases/VendorInvoiceExpenseModule').then((m) => ({ default: m.VendorInvoiceExpenseModule })))
const VendorInvoiceImportsModule = lazy(() => import('../../modules/purchases/VendorInvoiceImportsModule').then((m) => ({ default: m.VendorInvoiceImportsModule })))
const VendorPaymentsListModule = lazy(() => import('../../modules/purchases/VendorPaymentsListModule').then((m) => ({ default: m.VendorPaymentsListModule })))
const VendorPaymentsReportModule = lazy(() => import('../../modules/purchases/VendorPaymentsReportModule').then((m) => ({ default: m.VendorPaymentsReportModule })))
const VendorInvoiceStatisticsModule = lazy(() => import('../../modules/purchases/VendorInvoiceStatisticsModule').then((m) => ({ default: m.VendorInvoiceStatisticsModule })))

// Routes of the purchases area, rendered inside the app layout (see src/App.tsx).
export function purchasesRoutes() {
  return (
    <>
      <Route
        path={ROUTES.purchasesDashboard}
        element={
          <RouteBoundary>
            <PurchasesModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.customerVendorInvoiceCreate}
        element={
          <RouteBoundary>
            <VendorInvoiceCreateFromCustomerModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.vendorTags}
        element={
          <RouteBoundary>
            <VendorTagsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.purchaseOrderStats}
        element={
          <RouteBoundary>
            <PurchaseOrderStatisticsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.supplierProposalArea}
        element={
          <RouteBoundary>
            <VendorProposalsAreaModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.vendorContactCreate}
        element={
          <RouteBoundary>
            <VendorContactCreateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.vendorContactList}
        element={
          <RouteBoundary>
            <VendorContactListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.vendorContactDetail}
        element={
          <RouteBoundary>
            <VendorContactDetailModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.vendorContactTags}
        element={
          <RouteBoundary>
            <VendorContactTagsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.vendorInvoiceCreateQuick}
        element={
          <RouteBoundary>
            <QuickPurchaseCreateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.vendorInvoiceCreate}
        element={
          <RouteBoundary>
            <DetailedPurchaseCreateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.vendorInvoiceList}
        element={
          <RouteBoundary>
            <VendorInvoiceListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.vendorInvoiceDetail}
        element={
          <RouteBoundary>
            <VendorInvoiceDetailModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.vendorInvoicePaid}
        element={
          <RouteBoundary>
            <VendorInvoicePaidModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.vendorInvoiceUnpaid}
        element={
          <RouteBoundary>
            <VendorInvoiceUnpaidModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.vendorInvoiceManual}
        element={
          <RouteBoundary>
            <VendorInvoiceManualModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.vendorInvoiceAutomatic}
        element={
          <RouteBoundary>
            <VendorInvoiceAutomaticModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.vendorInvoiceExpense}
        element={
          <RouteBoundary>
            <VendorInvoiceExpenseModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.vendorInvoiceImports}
        element={
          <RouteBoundary>
            <VendorInvoiceImportsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.vendorPaymentsList}
        element={
          <RouteBoundary>
            <VendorPaymentsListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.vendorPaymentsReport}
        element={
          <RouteBoundary>
            <VendorPaymentsReportModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.vendorInvoiceStats}
        element={
          <RouteBoundary>
            <VendorInvoiceStatisticsModule />
          </RouteBoundary>
        }
      />
    </>
  )
}
