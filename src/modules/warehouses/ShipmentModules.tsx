import { ShipmentSearchPage } from '../../features/warehouses/components/ShipmentSearchPage'
import { ShipmentStatusList } from '../../features/warehouses/components/ShipmentStatusList'
import { StatisticsShipmentPage } from '../../features/warehouses/components/StatisticsShipmentPage'
import { PackingListPage } from '../../features/warehouses/components/PackingListPage'

export function ShipmentSearchModule() {
  return <ShipmentSearchPage />
}
export function ShipmentDraftModule() {
  return <ShipmentStatusList title="List Of Shipments" />
}
export function ShipmentValidatedModule() {
  return <ShipmentStatusList title="List Of Shipments" />
}
export function ShipmentProcessedModule() {
  return <ShipmentStatusList title="List Of Shipments" />
}
export function StatisticsShipmentModule() {
  return <StatisticsShipmentPage />
}
export function PackingListModule() {
  return <PackingListPage />
}
