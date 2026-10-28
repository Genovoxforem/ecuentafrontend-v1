import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { ROUTES } from '../../routes'
import { RouteBoundary } from '../RouteBoundary'

const AssetsDetailsModule = lazy(() => import('../../modules/fixedAsset/FixedAssetModules').then((m) => ({ default: m.AssetsDetailsModule })))
const AssetsTypesModule = lazy(() => import('../../modules/fixedAsset/FixedAssetModules').then((m) => ({ default: m.AssetsTypesModule })))
const AssetCategoryModule = lazy(() => import('../../modules/fixedAsset/FixedAssetModules').then((m) => ({ default: m.AssetCategoryModule })))
const AssetGroupModule = lazy(() => import('../../modules/fixedAsset/FixedAssetModules').then((m) => ({ default: m.AssetGroupModule })))
const InsuranceCompanyModule = lazy(() => import('../../modules/fixedAsset/FixedAssetModules').then((m) => ({ default: m.InsuranceCompanyModule })))
const AssetTransactionReportModule = lazy(() => import('../../modules/fixedAsset/FixedAssetModules').then((m) => ({ default: m.AssetTransactionReportModule })))

// Routes of the fixedAsset area, rendered inside the app layout (see src/App.tsx).
export function fixedAssetRoutes() {
  return (
    <>
      <Route
        path={ROUTES.fixedAssetList}
        element={
          <RouteBoundary>
            <AssetsDetailsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.fixedAssetTypes}
        element={
          <RouteBoundary>
            <AssetsTypesModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.fixedAssetCategory}
        element={
          <RouteBoundary>
            <AssetCategoryModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.fixedAssetGroup}
        element={
          <RouteBoundary>
            <AssetGroupModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.fixedAssetInsuranceCompany}
        element={
          <RouteBoundary>
            <InsuranceCompanyModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.fixedAssetTransactionReport}
        element={
          <RouteBoundary>
            <AssetTransactionReportModule />
          </RouteBoundary>
        }
      />
    </>
  )
}
