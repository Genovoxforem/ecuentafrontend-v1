import { WarehouseCreateForm } from '../../features/warehouses/components/WarehouseCreateForm'
import { WarehouseListPage } from '../../features/warehouses/components/WarehouseListPage'
import { WarehouseDetail } from '../../features/warehouses/components/WarehouseDetail'

export function WarehouseCreateModule() {
  return <WarehouseCreateForm />
}
export function WarehouseListModule() {
  return <WarehouseListPage />
}
export function WarehouseDetailModule() {
  return <WarehouseDetail />
}
