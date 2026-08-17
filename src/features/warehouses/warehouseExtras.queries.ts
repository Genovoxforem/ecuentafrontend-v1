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

// Racks/Shelves/Assign-Products — the real underlying tables (llx_rack,
// llx_shelves, llx_shelvesdet) exist and have real rows on the live DB, but
// the "Racks" Dolibarr module itself isn't activated server-side
// (MAIN_MODULE_RACKS is missing from llx_const — confirmed via direct DB
// query), so custom/racks/*.php always renders its content gated off, even
// for a logged-in session. Scraping it client-side would just scrape that
// same empty gate. Same local-only, session-scoped convention as
// Warehouses/Inventories/Landed Costs above until that module is turned on
// server-side (a backend change, out of this app's scope).

export interface RackRecord {
  ref: string
  name: string
  shortName: string
  warehouseRef: string
  status: 'Active' | 'Inactive'
}
const RACKS_KEY = ['local', 'racks'] as const

export function useRacks() {
  const [racks] = useLocalCollection<RackRecord[]>(RACKS_KEY, [])
  return racks
}

export interface NewRackInput {
  name: string
  shortName: string
  warehouseRef: string
  status: 'Active' | 'Inactive'
}

export function useCreateRack() {
  const [, update] = useLocalCollection<RackRecord[]>(RACKS_KEY, [])
  return (input: NewRackInput) => {
    const record: RackRecord = { ref: nextLocalRef('RACK'), ...input }
    update((cur) => [record, ...cur])
    return record
  }
}

export interface ShelfRecord {
  ref: string
  rackRef: string
  capacity: number
}
const SHELVES_KEY = ['local', 'shelves'] as const

export function useShelves() {
  const [shelves] = useLocalCollection<ShelfRecord[]>(SHELVES_KEY, [])
  return shelves
}

export interface NewShelfInput {
  rackRef: string
  capacity: number
}

export function useCreateShelf() {
  const [, update] = useLocalCollection<ShelfRecord[]>(SHELVES_KEY, [])
  return (input: NewShelfInput) => {
    const record: ShelfRecord = { ref: nextLocalRef('SHF'), ...input }
    update((cur) => [record, ...cur])
    return record
  }
}

export interface RackAssignmentRecord {
  ref: string
  rackRef: string
  shelfRef: string
  productRef: string
  productLabel: string
  lotSerial: string
  qty: number
}
const RACK_ASSIGNMENTS_KEY = ['local', 'rackAssignments'] as const

export function useRackAssignments() {
  const [assignments] = useLocalCollection<RackAssignmentRecord[]>(RACK_ASSIGNMENTS_KEY, [])
  return assignments
}

export interface NewRackAssignmentInput {
  rackRef: string
  shelfRef: string
  productRef: string
  productLabel: string
  lotSerial: string
  qty: number
}

export function useCreateRackAssignment() {
  const [, update] = useLocalCollection<RackAssignmentRecord[]>(RACK_ASSIGNMENTS_KEY, [])
  return (input: NewRackAssignmentInput) => {
    const record: RackAssignmentRecord = { ref: nextLocalRef('ASG'), ...input }
    update((cur) => [record, ...cur])
    return record
  }
}

export { todayIso }
