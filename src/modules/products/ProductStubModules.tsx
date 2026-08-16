import { ProductImportPage, ProductPriceListPage, ProductTagsPage, ProductVatUpdatePage } from '../../features/products/components/ProductStubPages'
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
export function ProductVatUpdateModule() {
  return <ProductVatUpdatePage />
}
