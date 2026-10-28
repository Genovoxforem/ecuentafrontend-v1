import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { ROUTES } from '../../routes'
import { RouteBoundary } from '../RouteBoundary'

const OrderCreateFromCustomerModule = lazy(() => import('../../modules/salesOrders/OrderCreateFromCustomerModule').then((m) => ({ default: m.OrderCreateFromCustomerModule })))
const OrdersListModule = lazy(() => import('../../modules/salesOrders/OrdersListModule').then((m) => ({ default: m.OrdersListModule })))
const OrderCreateModule = lazy(() => import('../../modules/salesOrders/OrderCreateModule').then((m) => ({ default: m.OrderCreateModule })))
const OrderStatisticsModule = lazy(() => import('../../modules/salesOrders/OrderStatisticsModule').then((m) => ({ default: m.OrderStatisticsModule })))
const OrderDetailModule = lazy(() => import('../../modules/salesOrders/OrderDetailModule').then((m) => ({ default: m.OrderDetailModule })))
const OrderCreateContractModule = lazy(() => import('../../modules/salesOrders/OrderCreateContractModule').then((m) => ({ default: m.OrderCreateContractModule })))
const OrderCreateInvoiceModule = lazy(() => import('../../modules/salesOrders/OrderCreateInvoiceModule').then((m) => ({ default: m.OrderCreateInvoiceModule })))

// Routes of the salesOrders area, rendered inside the app layout (see src/App.tsx).
export function salesOrdersRoutes() {
  return (
    <>
      <Route
        path={ROUTES.customerOrderCreate}
        element={
          <RouteBoundary>
            <OrderCreateFromCustomerModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.orderList}
        element={
          <RouteBoundary>
            <OrdersListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.orderCreate}
        element={
          <RouteBoundary>
            <OrderCreateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.orderStats}
        element={
          <RouteBoundary>
            <OrderStatisticsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.orderDetail}
        element={
          <RouteBoundary>
            <OrderDetailModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.orderCreateContract}
        element={
          <RouteBoundary>
            <OrderCreateContractModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.orderCreateInvoice}
        element={
          <RouteBoundary>
            <OrderCreateInvoiceModule />
          </RouteBoundary>
        }
      />
    </>
  )
}
