import { ShipmentSearchPage } from '../../features/warehouses/components/ShipmentSearchPage'
import { ShipmentStatusList } from '../../features/warehouses/components/ShipmentStatusList'
import { StatisticsShipmentPage } from '../../features/warehouses/components/StatisticsShipmentPage'
import { PackingListPage } from '../../features/warehouses/components/PackingListPage'

export function ShipmentSearchModule() {
  return <ShipmentSearchPage />
}
// viewStatut 0/1/2 — Draft/Validated/Processed, matching the same status
// dropdown expedition/list.php itself offers (see expeditionHtmlParser.ts).
export function ShipmentDraftModule() {
  return <ShipmentStatusList title="List Of Shipments" viewStatut={0} />
}
export function ShipmentValidatedModule() {
  return <ShipmentStatusList title="List Of Shipments" viewStatut={1} />
}
export function ShipmentProcessedModule() {
  return <ShipmentStatusList title="List Of Shipments" viewStatut={2} />
}
export function StatisticsShipmentModule() {
  return <StatisticsShipmentPage />
}
export function PackingListModule() {
  return <PackingListPage />
}
