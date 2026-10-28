import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { ROUTES } from '../../routes'
import { RouteBoundary } from '../RouteBoundary'

const ContractCreateFromCustomerModule = lazy(() => import('../../modules/contracts/ContractCreateFromCustomerModule').then((m) => ({ default: m.ContractCreateFromCustomerModule })))
const ContractsListModule = lazy(() => import('../../modules/contracts/ContractsListModule').then((m) => ({ default: m.ContractsListModule })))
const ContractCreateModule = lazy(() => import('../../modules/contracts/ContractCreateModule').then((m) => ({ default: m.ContractCreateModule })))
const ServicesDetailsModule = lazy(() => import('../../modules/contracts/ServicesDetailsModule').then((m) => ({ default: m.ServicesDetailsModule })))
const ContractReportModule = lazy(() => import('../../modules/contracts/ContractReportModule').then((m) => ({ default: m.ContractReportModule })))
const ContractDetailModule = lazy(() => import('../../modules/contracts/ContractDetailModule').then((m) => ({ default: m.ContractDetailModule })))

// Routes of the contracts area, rendered inside the app layout (see src/App.tsx).
export function contractsRoutes() {
  return (
    <>
      <Route
        path={ROUTES.customerContractCreate}
        element={
          <RouteBoundary>
            <ContractCreateFromCustomerModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.contractList}
        element={
          <RouteBoundary>
            <ContractsListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.contractCreate}
        element={
          <RouteBoundary>
            <ContractCreateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.contractServices}
        element={
          <RouteBoundary>
            <ServicesDetailsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.contractReport}
        element={
          <RouteBoundary>
            <ContractReportModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.contractDetail}
        element={
          <RouteBoundary>
            <ContractDetailModule />
          </RouteBoundary>
        }
      />
    </>
  )
}
