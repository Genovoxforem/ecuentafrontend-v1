import { ShipmentSearchPage } from '../../features/warehouses/components/ShipmentSearchPage'
import { ShipmentStatusList } from '../../features/warehouses/components/ShipmentStatusList'
import { StatisticsShipmentPage } from '../../features/warehouses/components/StatisticsShipmentPage'
import { PackingListPage } from '../../features/warehouses/components/PackingListPage'

export function ShipmentSearchModule() {
  return <ShipmentSearchPage />
}
export function ShipmentDraftModule() {
  return <ShipmentStatusList title="Draft Shipments" statusFilter={0} />
}
export function ShipmentValidatedModule() {
  return <ShipmentStatusList title="Validated Shipments" statusFilter={1} />
}
export function ShipmentProcessedModule() {
  return <ShipmentStatusList title="Processed Shipments" statusFilter={2} />
}
export function StatisticsShipmentModule() {
  return <StatisticsShipmentPage />
}
export function PackingListModule() {
  return <PackingListPage />
}
