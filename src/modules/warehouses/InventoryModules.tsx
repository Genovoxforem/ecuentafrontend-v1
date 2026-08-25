import { InventoryCreateForm } from '../../features/warehouses/components/InventoryCreateForm'
import { InventoryListPage } from '../../features/warehouses/components/InventoryListPage'
import { InventoryDetail } from '../../features/warehouses/components/InventoryDetail'

export function InventoryCreateModule() {
  return <InventoryCreateForm />
}
export function InventoryListModule() {
  return <InventoryListPage />
}
export function InventoryDetailModule() {
  return <InventoryDetail />
}
