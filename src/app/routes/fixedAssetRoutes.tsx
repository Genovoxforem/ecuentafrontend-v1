import { lazy, type ComponentType } from 'react'
import { Route } from 'react-router-dom'
import { ROUTES } from '../../routes'
import { RouteBoundary } from '../RouteBoundary'

const AssetsDetailsModule = lazy(() => import('../../modules/fixedAsset/FixedAssetModules').then((m) => ({ default: m.AssetsDetailsModule })))
const AssetNewModule = lazy(() => import('../../modules/fixedAsset/FixedAssetModules').then((m) => ({ default: m.AssetNewModule })))
const AssetCardModule = lazy(() => import('../../modules/fixedAsset/FixedAssetModules').then((m) => ({ default: m.AssetCardModule })))
const AssetDepreciationModule = lazy(() => import('../../modules/fixedAsset/FixedAssetModules').then((m) => ({ default: m.AssetDepreciationModule })))
const AssetReportsModule = lazy(() => import('../../modules/fixedAsset/FixedAssetModules').then((m) => ({ default: m.AssetReportsModule })))
const AssetsTypesModule = lazy(() => import('../../modules/fixedAsset/FixedAssetModules').then((m) => ({ default: m.AssetsTypesModule })))
const AssetCategoryModule = lazy(() => import('../../modules/fixedAsset/FixedAssetModules').then((m) => ({ default: m.AssetCategoryModule })))
const AssetGroupModule = lazy(() => import('../../modules/fixedAsset/FixedAssetModules').then((m) => ({ default: m.AssetGroupModule })))
const InsuranceCompanyModule = lazy(() => import('../../modules/fixedAsset/FixedAssetModules').then((m) => ({ default: m.InsuranceCompanyModule })))
const AssetClassicListModule = lazy(() => import('../../modules/fixedAsset/FixedAssetModules').then((m) => ({ default: m.AssetClassicListModule })))
const AssetClassicTypesModule = lazy(() => import('../../modules/fixedAsset/FixedAssetModules').then((m) => ({ default: m.AssetClassicTypesModule })))
const AssetClassicCategoryModule = lazy(() => import('../../modules/fixedAsset/FixedAssetModules').then((m) => ({ default: m.AssetClassicCategoryModule })))
const AssetClassicGroupModule = lazy(() => import('../../modules/fixedAsset/FixedAssetModules').then((m) => ({ default: m.AssetClassicGroupModule })))
const AssetClassicInsuranceModule = lazy(() => import('../../modules/fixedAsset/FixedAssetModules').then((m) => ({ default: m.AssetClassicInsuranceModule })))
const AssetTransactionReportModule = lazy(() => import('../../modules/fixedAsset/FixedAssetModules').then((m) => ({ default: m.AssetTransactionReportModule })))

// Routes of the fixedAsset area, rendered inside the app layout (see src/App.tsx).
const PAGES: Array<[string, ComponentType]> = [
  [ROUTES.fixedAssetList, AssetsDetailsModule],
  [ROUTES.fixedAssetNew, AssetNewModule],
  [ROUTES.fixedAssetDetail, AssetCardModule],
  [ROUTES.fixedAssetDepreciation, AssetDepreciationModule],
  [ROUTES.fixedAssetReports, AssetReportsModule],
  [ROUTES.fixedAssetTypes, AssetsTypesModule],
  [ROUTES.fixedAssetCategory, AssetCategoryModule],
  [ROUTES.fixedAssetGroup, AssetGroupModule],
  [ROUTES.fixedAssetInsuranceCompany, InsuranceCompanyModule],
  [ROUTES.fixedAssetTransactionReport, AssetTransactionReportModule],
  [ROUTES.fixedAssetClassicList, AssetClassicListModule],
  [ROUTES.fixedAssetClassicTypes, AssetClassicTypesModule],
  [ROUTES.fixedAssetClassicCategory, AssetClassicCategoryModule],
  [ROUTES.fixedAssetClassicGroup, AssetClassicGroupModule],
  [ROUTES.fixedAssetClassicInsurance, AssetClassicInsuranceModule],
]

export function fixedAssetRoutes() {
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
