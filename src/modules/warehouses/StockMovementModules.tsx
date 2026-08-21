import { StockMovementsListPage } from '../../features/warehouses/components/StockMovementsListPage'
import { BoxBreakPage } from '../../features/warehouses/components/BoxBreakPage'
import { FefoExpiryDashboardPage } from '../../features/warehouses/components/FefoExpiryDashboardPage'
import { StockCorrectionPage } from '../../features/warehouses/components/StockCorrectionPage'
import { StockTransferPage } from '../../features/warehouses/components/StockTransferPage'
import { MassStockTransferPage } from '../../features/warehouses/components/MassStockTransferPage'
import { ReplenishmentPage } from '../../features/warehouses/components/ReplenishmentPage'

export function StockMovementsListModule() {
  return <StockMovementsListPage />
}
export function BoxBreakModule() {
  return <BoxBreakPage />
}
export function FefoDashboardModule() {
  return <FefoExpiryDashboardPage />
}
export function StockCorrectionModule() {
  return <StockCorrectionPage />
}
export function StockTransferModule() {
  return <StockTransferPage />
}
export function MassStockTransferModule() {
  return <MassStockTransferPage />
}
export function ReplenishmentModule() {
  return <ReplenishmentPage />
}
