import { useLocalCollection, nextLocalRef, todayIso } from '../../shared/localCollection'

// No REST endpoint exists on this backend for warehouses/locations,
// stock-taking inventories, or landed costs (confirmed — /api/warehouses/,
// /api/inventories/ etc. all 404) — same local-only, session-scoped
// convention as Leave requests / Manual Tree folders elsewhere in this app.
// Warehouses created here feed the Warehouse picker on the New Inventory
// form below, so the two pages are at least internally consistent with
// each other even though neither persists past a reload.

export interface WarehouseRecord {
  ref: string
  shortName: string
  addIn: string
  zip: string
  description: string
  address: string
  city: string
  countryLabel: string
  phone: string
  status: 'Open' | 'Closed'
}
const WAREHOUSES_KEY = ['local', 'warehouses'] as const

export function useWarehouses() {
  const [warehouses] = useLocalCollection<WarehouseRecord[]>(WAREHOUSES_KEY, [])
  return warehouses
}

export interface NewWarehouseInput {
  shortName: string
  addIn: string
  zip: string
  description: string
  address: string
  city: string
  countryLabel: string
  phone: string
  status: 'Open' | 'Closed'
}

export function useCreateWarehouse() {
  const [, update] = useLocalCollection<WarehouseRecord[]>(WAREHOUSES_KEY, [])
  return (input: NewWarehouseInput) => {
    const record: WarehouseRecord = { ref: nextLocalRef('WH'), ...input }
    update((cur) => [record, ...cur])
    return record
  }
}

export interface InventoryRecord {
  ref: string
  label: string
  warehouseRef: string
  productLabel: string
  valueDate: string
  status: 'Draft' | 'Validated'
}
const INVENTORIES_KEY = ['local', 'inventories'] as const

export function useInventories() {
  const [inventories] = useLocalCollection<InventoryRecord[]>(INVENTORIES_KEY, [])
  return inventories
}

export interface NewInventoryInput {
  label: string
  warehouseRef: string
  productLabel: string
  valueDate: string
}

export function useCreateInventory() {
  const [, update] = useLocalCollection<InventoryRecord[]>(INVENTORIES_KEY, [])
  return (input: NewInventoryInput) => {
    const record: InventoryRecord = { ref: nextLocalRef('INV'), status: 'Draft', ...input }
    update((cur) => [record, ...cur])
    return record
  }
}

export interface LandedCostRecord {
  ref: string
  startDate: string
  userName: string
  purchaseInvoice: string
  landedCostInvoice: string
  landedExpense: string
  note: string
}
const LANDED_COSTS_KEY = ['local', 'landed-costs'] as const

export function useLandedCosts() {
  const [costs] = useLocalCollection<LandedCostRecord[]>(LANDED_COSTS_KEY, [])
  return costs
}

export interface NewLandedCostInput {
  startDate: string
  userName: string
  purchaseInvoice: string
  landedCostInvoice: string
  landedExpense: string
  note: string
}

export function useCreateLandedCost() {
  const [, update] = useLocalCollection<LandedCostRecord[]>(LANDED_COSTS_KEY, [])
  return (input: NewLandedCostInput) => {
    const record: LandedCostRecord = { ref: nextLocalRef('LC'), ...input }
    update((cur) => [record, ...cur])
    return record
  }
}

export { todayIso }
