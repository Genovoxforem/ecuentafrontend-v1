import { lazy, type ComponentType } from 'react'
import { Route } from 'react-router-dom'
import { ROUTES } from '../../routes'
import { RouteBoundary } from '../RouteBoundary'

const InstallmentDashboardModule = lazy(() => import('../../modules/installments/InstallmentModules').then((m) => ({ default: m.InstallmentDashboardModule })))
const InstallmentListModule = lazy(() => import('../../modules/installments/InstallmentModules').then((m) => ({ default: m.InstallmentListModule })))
const InstallmentNewModule = lazy(() => import('../../modules/installments/InstallmentModules').then((m) => ({ default: m.InstallmentNewModule })))
const InstallmentDetailModule = lazy(() => import('../../modules/installments/InstallmentModules').then((m) => ({ default: m.InstallmentDetailModule })))
const InstallmentPayModule = lazy(() => import('../../modules/installments/InstallmentModules').then((m) => ({ default: m.InstallmentPayModule })))
const InstallmentPaymentsModule = lazy(() => import('../../modules/installments/InstallmentModules').then((m) => ({ default: m.InstallmentPaymentsModule })))
const InstallmentReceiptsModule = lazy(() => import('../../modules/installments/InstallmentModules').then((m) => ({ default: m.InstallmentReceiptsModule })))
const InstallmentReceiptDetailModule = lazy(() => import('../../modules/installments/InstallmentModules').then((m) => ({ default: m.InstallmentReceiptDetailModule })))
const InstallmentReportsModule = lazy(() => import('../../modules/installments/InstallmentModules').then((m) => ({ default: m.InstallmentReportsModule })))
const InstallmentSettingsModule = lazy(() => import('../../modules/installments/InstallmentModules').then((m) => ({ default: m.InstallmentSettingsModule })))

// Routes of the Installment Sales area, rendered inside the app layout (see src/App.tsx).
const PAGES: Array<[string, ComponentType]> = [
  [ROUTES.installmentDashboard, InstallmentDashboardModule],
  [ROUTES.installmentList, InstallmentListModule],
  [ROUTES.installmentNew, InstallmentNewModule],
  [ROUTES.installmentDetail, InstallmentDetailModule],
  [ROUTES.installmentPay, InstallmentPayModule],
  [ROUTES.installmentPayments, InstallmentPaymentsModule],
  [ROUTES.installmentReceipts, InstallmentReceiptsModule],
  [ROUTES.installmentReceiptDetail, InstallmentReceiptDetailModule],
  [ROUTES.installmentReports, InstallmentReportsModule],
  [ROUTES.installmentSettings, InstallmentSettingsModule],
]

export function installmentRoutes() {
  return (
    <>
      {PAGES.map(([path, Page]) => (
        <Route
          key={path}
          path={path}
          element={
            <RouteBoundary>
              <Page />
            </RouteBoundary>
          }
        />
      ))}
    </>
  )
}
