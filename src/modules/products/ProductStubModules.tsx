import { ProductImportPage, ProductTagsPage } from '../../features/products/components/ProductStubPages'
import { ProductBulkPricePage } from '../../features/products/components/ProductBulkToolsPages'
import { ProductPriceListPage } from '../../features/products/components/ProductPriceListPage'
import { ProductVatUpdatePage } from '../../features/products/components/ProductVatUpdatePage'
import { ProductTagDetailPage } from '../../features/products/components/ProductTagDetailPage'
import { ProductPriceUpdatePage } from '../../features/products/components/ProductPriceUpdatePage'
import { ProductStocksPage } from '../../features/products/components/ProductStocksPage'
import { ProductStocksByLotPage } from '../../features/products/components/ProductStocksByLotPage'
import { LotsSerialsPage } from '../../features/products/components/LotsSerialsPage'
import { VariantAttributesPage } from '../../features/products/components/VariantAttributesPage'

export function ProductStocksModule() {
  return <ProductStocksPage />
}
export function ProductStocksByLotModule() {
  return <ProductStocksByLotPage />
}
export function LotsSerialsModule() {
  return <LotsSerialsPage />
}
export function VariantAttributesModule() {
  return <VariantAttributesPage />
}
export function ProductPriceListModule() {
  return <ProductPriceListPage />
}
export function ProductTagsModule() {
  return <ProductTagsPage />
}
export function ProductImportModule() {
  return <ProductImportPage />
}
export function ProductTagDetailModule() {
  return <ProductTagDetailPage />
}
export function ProductBulkPriceModule() {
  return <ProductBulkPricePage />
}
export function ProductPriceUpdateModule() {
  return <ProductPriceUpdatePage />
}
export function ProductVatUpdateModule() {
  return <ProductVatUpdatePage />
}
