import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { ROUTES } from '../../routes'
import { RouteBoundary } from '../RouteBoundary'

const ZraModule = lazy(() => import('../../modules/zra/ZraModule').then((m) => ({ default: m.ZraModule })))
const ZraImportModule = lazy(() => import('../../modules/zra/ZraImportModule').then((m) => ({ default: m.ZraImportModule })))
const ZraAutomaticPurchaseModule = lazy(() => import('../../modules/zra/ZraAutomaticPurchaseModule').then((m) => ({ default: m.ZraAutomaticPurchaseModule })))
const ZraUnuploadedCustomersModule = lazy(() => import('../../modules/zra/ZraUnuploadedCustomersModule').then((m) => ({ default: m.ZraUnuploadedCustomersModule })))
const ZraPendingSalesModule = lazy(() => import('../../modules/zra/ZraPendingSalesModule').then((m) => ({ default: m.ZraPendingSalesModule })))
const ZraPendingPurchaseModule = lazy(() => import('../../modules/zra/ZraPendingPurchaseModule').then((m) => ({ default: m.ZraPendingPurchaseModule })))
const ZraUnuploadedStockModule = lazy(() => import('../../modules/zra/ZraUnuploadedStockModule').then((m) => ({ default: m.ZraUnuploadedStockModule })))
const ZraUnuploadProductsModule = lazy(() => import('../../modules/zra/ZraUnuploadProductsModule').then((m) => ({ default: m.ZraUnuploadProductsModule })))
const ZraSalesLookupModule = lazy(() => import('../../modules/zra/ZraSalesLookupModule').then((m) => ({ default: m.ZraSalesLookupModule })))
const ZraCustomerInfoModule = lazy(() => import('../../modules/zra/ZraCustomerInfoModule').then((m) => ({ default: m.ZraCustomerInfoModule })))
const ZraItemDetailsModule = lazy(() => import('../../modules/zra/ZraItemDetailsModule').then((m) => ({ default: m.ZraItemDetailsModule })))
const ZraRrpItemListModule = lazy(() => import('../../modules/zra/ZraRrpItemListModule').then((m) => ({ default: m.ZraRrpItemListModule })))
const ZraPrincipalsModule = lazy(() => import('../../modules/zra/ZraPrincipalsModule').then((m) => ({ default: m.ZraPrincipalsModule })))
const ZraStockListModule = lazy(() => import('../../modules/zra/ZraStockListModule').then((m) => ({ default: m.ZraStockListModule })))
const AsycudaPurchaseInvoiceModule = lazy(() => import('../../modules/zra/AsycudaPurchaseInvoiceModule').then((m) => ({ default: m.AsycudaPurchaseInvoiceModule })))
const RebateInvoicesModule = lazy(() => import('../../modules/zra/ZraRebateModules').then((m) => ({ default: m.RebateInvoicesModule })))
const CreateRebateInvoiceModule = lazy(() => import('../../modules/zra/ZraRebateModules').then((m) => ({ default: m.CreateRebateInvoiceModule })))

// Routes of the zra area, rendered inside the app layout (see src/App.tsx).
export function zraRoutes() {
  return (
    <>
      <Route
        path={ROUTES.zra}
        element={
          <RouteBoundary>
            <ZraModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.zraImport}
        element={
          <RouteBoundary>
            <ZraImportModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.zraAutomaticPurchase}
        element={
          <RouteBoundary>
            <ZraAutomaticPurchaseModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.zraUnuploadedCustomers}
        element={
          <RouteBoundary>
            <ZraUnuploadedCustomersModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.zraPendingSales}
        element={
          <RouteBoundary>
            <ZraPendingSalesModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.zraPendingPurchase}
        element={
          <RouteBoundary>
            <ZraPendingPurchaseModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.zraUnuploadedStockMovements}
        element={
          <RouteBoundary>
            <ZraUnuploadedStockModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.zraUnuploadedProducts}
        element={
          <RouteBoundary>
            <ZraUnuploadProductsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.zraInvoiceDetails}
        element={
          <RouteBoundary>
            <ZraSalesLookupModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.zraCustomerInfo}
        element={
          <RouteBoundary>
            <ZraCustomerInfoModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.zraItemDetails}
        element={
          <RouteBoundary>
            <ZraItemDetailsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.zraRrpItemList}
        element={
          <RouteBoundary>
            <ZraRrpItemListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.zraPrincipals}
        element={
          <RouteBoundary>
            <ZraPrincipalsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.zraStockList}
        element={
          <RouteBoundary>
            <ZraStockListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.asycudaPurchase}
        element={
          <RouteBoundary>
            <AsycudaPurchaseInvoiceModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.rebateInvoiceList}
        element={
          <RouteBoundary>
            <RebateInvoicesModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.rebateInvoiceCreate}
        element={
          <RouteBoundary>
            <CreateRebateInvoiceModule />
          </RouteBoundary>
        }
      />
    </>
  )
}
