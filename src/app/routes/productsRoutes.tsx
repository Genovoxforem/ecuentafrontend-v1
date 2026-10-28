import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { ROUTES } from '../../routes'
import { RouteBoundary } from '../RouteBoundary'

const StockAtDateModule = lazy(() => import('../../modules/products/StockAtDateModule').then((m) => ({ default: m.StockAtDateModule })))
const LotSerialDetailModule = lazy(() => import('../../modules/products/LotSerialDetailModule').then((m) => ({ default: m.LotSerialDetailModule })))
const VariantAttributeDetailModule = lazy(() => import('../../modules/products/VariantAttributeDetailModule').then((m) => ({ default: m.VariantAttributeDetailModule })))
const ProductsListModule = lazy(() => import('../../modules/products/ProductsListModule').then((m) => ({ default: m.ProductsListModule })))
const ServicesListModule = lazy(() => import('../../modules/products/ServicesListModule').then((m) => ({ default: m.ServicesListModule })))
const ProductAreaModule = lazy(() => import('../../modules/products/ProductAreaModule').then((m) => ({ default: m.ProductAreaModule })))
const ProductCreateModule = lazy(() => import('../../modules/products/ProductCreateModule').then((m) => ({ default: m.ProductCreateModule })))
const ProductDetailModule = lazy(() => import('../../modules/products/ProductDetailModule').then((m) => ({ default: m.ProductDetailModule })))
const ProductEditModule = lazy(() => import('../../modules/products/ProductEditModule').then((m) => ({ default: m.ProductEditModule })))
const ServiceCreateModule = lazy(() => import('../../modules/products/ServiceCreateModule').then((m) => ({ default: m.ServiceCreateModule })))
const ProductStatisticsModule = lazy(() => import('../../modules/products/ProductStatisticsModule').then((m) => ({ default: m.ProductStatisticsModule })))
const ServiceStatisticsModule = lazy(() => import('../../modules/products/ServiceStatisticsModule').then((m) => ({ default: m.ServiceStatisticsModule })))
const ProductStocksModule = lazy(() => import('../../modules/products/ProductStubModules').then((m) => ({ default: m.ProductStocksModule })))
const ProductStocksByLotModule = lazy(() => import('../../modules/products/ProductStubModules').then((m) => ({ default: m.ProductStocksByLotModule })))
const LotsSerialsModule = lazy(() => import('../../modules/products/ProductStubModules').then((m) => ({ default: m.LotsSerialsModule })))
const VariantAttributesModule = lazy(() => import('../../modules/products/ProductStubModules').then((m) => ({ default: m.VariantAttributesModule })))
const ProductPriceListModule = lazy(() => import('../../modules/products/ProductStubModules').then((m) => ({ default: m.ProductPriceListModule })))
const ProductTagsModule = lazy(() => import('../../modules/products/ProductStubModules').then((m) => ({ default: m.ProductTagsModule })))
const ProductTagDetailModule = lazy(() => import('../../modules/products/ProductStubModules').then((m) => ({ default: m.ProductTagDetailModule })))
const ProductPriceUpdateModule = lazy(() => import('../../modules/products/ProductStubModules').then((m) => ({ default: m.ProductPriceUpdateModule })))
const ProductBulkPriceModule = lazy(() => import('../../modules/products/ProductStubModules').then((m) => ({ default: m.ProductBulkPriceModule })))
const ProductImportModule = lazy(() => import('../../modules/products/ProductStubModules').then((m) => ({ default: m.ProductImportModule })))
const ProductVatUpdateModule = lazy(() => import('../../modules/products/ProductStubModules').then((m) => ({ default: m.ProductVatUpdateModule })))

// Routes of the products area, rendered inside the app layout (see src/App.tsx).
export function productsRoutes() {
  return (
    <>
      <Route
        path={ROUTES.productStockAtDate}
        element={
          <RouteBoundary>
            <StockAtDateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.productLotSerialDetail}
        element={
          <RouteBoundary>
            <LotSerialDetailModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.productVariantAttributeDetail}
        element={
          <RouteBoundary>
            <VariantAttributeDetailModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.productList}
        element={
          <RouteBoundary>
            <ProductsListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.serviceList}
        element={
          <RouteBoundary>
            <ServicesListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.productArea}
        element={
          <RouteBoundary>
            <ProductAreaModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.productCreate}
        element={
          <RouteBoundary>
            <ProductCreateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.productDetail}
        element={
          <RouteBoundary>
            <ProductDetailModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.productEdit}
        element={
          <RouteBoundary>
            <ProductEditModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.serviceCreate}
        element={
          <RouteBoundary>
            <ServiceCreateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.productStats}
        element={
          <RouteBoundary>
            <ProductStatisticsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.serviceStats}
        element={
          <RouteBoundary>
            <ServiceStatisticsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.productStocks}
        element={
          <RouteBoundary>
            <ProductStocksModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.productStocksByLot}
        element={
          <RouteBoundary>
            <ProductStocksByLotModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.lotsSerials}
        element={
          <RouteBoundary>
            <LotsSerialsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.variantAttributes}
        element={
          <RouteBoundary>
            <VariantAttributesModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.productPriceList}
        element={
          <RouteBoundary>
            <ProductPriceListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.productTags}
        element={
          <RouteBoundary>
            <ProductTagsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.productTagDetail}
        element={
          <RouteBoundary>
            <ProductTagDetailModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.productPriceUpdate}
        element={
          <RouteBoundary>
            <ProductPriceUpdateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.productBulkPrice}
        element={
          <RouteBoundary>
            <ProductBulkPriceModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.productImport}
        element={
          <RouteBoundary>
            <ProductImportModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.productVatUpdate}
        element={
          <RouteBoundary>
            <ProductVatUpdateModule />
          </RouteBoundary>
        }
      />
    </>
  )
}
