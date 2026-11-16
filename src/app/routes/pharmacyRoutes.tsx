import { lazy, Suspense } from 'react'
import { Route } from 'react-router-dom'
import { ROUTES } from '../../routes'
import { RouteBoundary } from '../RouteBoundary'
import { RouteFallback } from '../../shared/components/RouteFallback'

const PharmacyLayout = lazy(() => import('../../shared/components/layout/PharmacyLayout').then((m) => ({ default: m.PharmacyLayout })))
const PharmacyDashboard = lazy(() => import('../../features/pharmacy/components/PharmacyDashboard').then((m) => ({ default: m.PharmacyDashboard })))
const PharmacyDispense = lazy(() => import('../../features/pharmacy/components/PharmacyDispense').then((m) => ({ default: m.PharmacyDispense })))
const pages = () => import('../../features/pharmacy/components/PharmacyPages')
const PharmacyPrescriptions = lazy(() => pages().then((m) => ({ default: m.PharmacyPrescriptions })))
const PharmacyPatients = lazy(() => pages().then((m) => ({ default: m.PharmacyPatients })))
const PharmacyMedicines = lazy(() => pages().then((m) => ({ default: m.PharmacyMedicines })))
const PharmacyBatches = lazy(() => pages().then((m) => ({ default: m.PharmacyBatches })))
const PharmacyPurchases = lazy(() => pages().then((m) => ({ default: m.PharmacyPurchases })))
const PharmacyStock = lazy(() => pages().then((m) => ({ default: m.PharmacyStock })))
const PharmacyLocations = lazy(() => pages().then((m) => ({ default: m.PharmacyLocations })))
const PharmacyReturns = lazy(() => pages().then((m) => ({ default: m.PharmacyReturns })))
const PharmacyRegister = lazy(() => pages().then((m) => ({ default: m.PharmacyRegister })))
const PharmacyDur = lazy(() => pages().then((m) => ({ default: m.PharmacyDur })))
const PharmacyReports = lazy(() => import('../../features/pharmacy/components/PharmacyReports').then((m) => ({ default: m.PharmacyReports })))
const PharmacySettings = lazy(() => pages().then((m) => ({ default: m.PharmacySettings })))

const rel = (path: string) => path.slice('/pharmacy/'.length)
const el = (node: React.ReactNode) => <RouteBoundary>{node}</RouteBoundary>

// The Pharmacy suite (custom/pharmacy/app.php) is its own full-screen app, mounted outside AppLayout like the Hotel
// Suite (see App.tsx): own sidebar, header and rights check (PharmacyLayout).
export function pharmacyRoutes() {
  return (
    <Route
      path="/pharmacy"
      element={
        <Suspense fallback={<RouteFallback />}>
          <PharmacyLayout />
        </Suspense>
      }
    >
      <Route path={rel(ROUTES.pharmacyDashboard)} element={el(<PharmacyDashboard />)} />
      <Route path={rel(ROUTES.pharmacyDispense)} element={el(<PharmacyDispense />)} />
      <Route path={rel(ROUTES.pharmacyPrescriptions)} element={el(<PharmacyPrescriptions />)} />
      <Route path={rel(ROUTES.pharmacyPatients)} element={el(<PharmacyPatients />)} />
      <Route path={rel(ROUTES.pharmacyMedicines)} element={el(<PharmacyMedicines />)} />
      <Route path={rel(ROUTES.pharmacyBatches)} element={el(<PharmacyBatches />)} />
      <Route path={rel(ROUTES.pharmacyPurchases)} element={el(<PharmacyPurchases />)} />
      <Route path={rel(ROUTES.pharmacyStock)} element={el(<PharmacyStock />)} />
      <Route path={rel(ROUTES.pharmacyLocations)} element={el(<PharmacyLocations />)} />
      <Route path={rel(ROUTES.pharmacyReturns)} element={el(<PharmacyReturns />)} />
      <Route path={rel(ROUTES.pharmacyRegister)} element={el(<PharmacyRegister />)} />
      <Route path={rel(ROUTES.pharmacyDur)} element={el(<PharmacyDur />)} />
      <Route path={rel(ROUTES.pharmacyReports)} element={el(<PharmacyReports />)} />
      <Route path={rel(ROUTES.pharmacySettings)} element={el(<PharmacySettings />)} />
    </Route>
  )
}
