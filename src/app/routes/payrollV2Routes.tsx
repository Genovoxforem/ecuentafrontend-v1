import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { ROUTES } from '../../routes'
import { RouteBoundary } from '../RouteBoundary'

const PayrollEmployeesModule = lazy(() => import('../../modules/payrollV2/PayrollEmployeesModule').then((m) => ({ default: m.PayrollEmployeesModule })))
const PayrollAttendanceModule = lazy(() => import('../../modules/payrollV2/PayrollAttendanceModule').then((m) => ({ default: m.PayrollAttendanceModule })))
const PayrollLeaveModule = lazy(() => import('../../modules/payrollV2/PayrollLeaveModule').then((m) => ({ default: m.PayrollLeaveModule })))
const PayrollAdvancesModule = lazy(() => import('../../modules/payrollV2/PayrollAdvancesModule').then((m) => ({ default: m.PayrollAdvancesModule })))
const PayrollReportsModule = lazy(() => import('../../modules/payrollV2/PayrollReportsModule').then((m) => ({ default: m.PayrollReportsModule })))
const PayrollAnalyticsModule = lazy(() => import('../../modules/payrollV2/PayrollAnalyticsModule').then((m) => ({ default: m.PayrollAnalyticsModule })))
const PayRunDetailModule = lazy(() => import('../../modules/payrollV2/PayRunDetailModule').then((m) => ({ default: m.PayRunDetailModule })))
const PayRunsModule = lazy(() => import('../../modules/payrollV2/PayRunsModule').then((m) => ({ default: m.PayRunsModule })))
const PayrollSelfServiceModule = lazy(() => import('../../modules/payrollV2/PayrollSelfServiceModule').then((m) => ({ default: m.PayrollSelfServiceModule })))
const PayrollTemplatesModule = lazy(() => import('../../modules/payrollV2/PayrollTemplatesModule').then((m) => ({ default: m.PayrollTemplatesModule })))
const PayrollShiftsModule = lazy(() => import('../../modules/payrollV2/PayrollShiftsModule').then((m) => ({ default: m.PayrollShiftsModule })))
const PayrollV2SetupModule = lazy(() => import('../../modules/payrollV2/PayrollV2SetupModule').then((m) => ({ default: m.PayrollV2SetupModule })))
const PayrollSettingsModule = lazy(() => import('../../modules/payrollV2/PayrollSettingsModule').then((m) => ({ default: m.PayrollSettingsModule })))
const PayrollV2DashboardModule = lazy(() => import('../../modules/payrollV2/PayrollV2DashboardModule').then((m) => ({ default: m.PayrollV2DashboardModule })))

// Routes of the payrollV2 area, rendered inside the app layout (see src/App.tsx).
export function payrollV2Routes() {
  return (
    <>
      <Route
        path={ROUTES.payrollV2Employees}
        element={
          <RouteBoundary>
            <PayrollEmployeesModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollV2Attendance}
        element={
          <RouteBoundary>
            <PayrollAttendanceModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollV2Leave}
        element={
          <RouteBoundary>
            <PayrollLeaveModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollV2Advances}
        element={
          <RouteBoundary>
            <PayrollAdvancesModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollV2Reports}
        element={
          <RouteBoundary>
            <PayrollReportsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollV2Analytics}
        element={
          <RouteBoundary>
            <PayrollAnalyticsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollV2PayRunDetail}
        element={
          <RouteBoundary>
            <PayRunDetailModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollV2PayRuns}
        element={
          <RouteBoundary>
            <PayRunsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollV2SelfService}
        element={
          <RouteBoundary>
            <PayrollSelfServiceModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollV2Templates}
        element={
          <RouteBoundary>
            <PayrollTemplatesModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollV2Shifts}
        element={
          <RouteBoundary>
            <PayrollShiftsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollV2Setup}
        element={
          <RouteBoundary>
            <PayrollV2SetupModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollV2Settings}
        element={
          <RouteBoundary>
            <PayrollSettingsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollV2Dashboard}
        element={
          <RouteBoundary>
            <PayrollV2DashboardModule />
          </RouteBoundary>
        }
      />
    </>
  )
}
