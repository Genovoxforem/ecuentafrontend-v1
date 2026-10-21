// Shapes the warehouse screens render (warehouse and inventory lists and cards, the movement log, the events tab).
// They are filled from product/stock/fapi in warehouseExtras.queries.ts; nothing here parses HTML any more.

export interface WarehouseListRow {
  id: number
  ref: string
  shortName: string
  environment: string
  inputStockValue: number
  valueForSell: number
  statusLabel: string
}

export interface InventoryListRow {
  id: number
  ref: string
  label: string
  warehouseId: number | null
  warehouseLabel: string
  productLabel: string
  valueDate: string
  statusLabel: string
}

export interface WarehouseProductRow {
  id: number
  ref: string
  label: string
  units: number
  weightedAvgPrice: number
  inputStockValue: number
  sellingUnitPrice: number
  valueForSell: number
  transferUrl: string
  correctionUrl: string
}

export interface WarehouseCard {
  id: number
  ref: string
  statusLabel: string
  locationSummary: string
  environment: string
  parentWarehouseName: string
  parentWarehouseId: number | null
  description: string
  differentProductsCount: number
  totalProductsCount: number
  inputStockValue: number
  latestMovement: string
  tags: string[]
  editUrl: string
  deleteUrl: string
  deleteRefusedTitle: string
  products: WarehouseProductRow[]
}

export interface WarehouseSelectOption {
  value: string
  label: string
}

export interface WarehouseEditFormData {
  token: string
  ref: string
  shortNameLocation: string
  parentWarehouseId: string
  parentWarehouseOptions: WarehouseSelectOption[]
  description: string
  address: string
  zipCode: string
  city: string
  countryId: string
  countryOptions: WarehouseSelectOption[]
  phone: string
  fax: string
  status: string
}

export interface RelatedObjectRow {
  type: string
  ref: string
  date: string
  amount: string
  statusLabel: string
}

export interface LinkedEventRow {
  ref: string
  date: string
  by: string
  type: string
  title: string
}

export interface InventoryCard {
  id: number
  label: string
  warehouseId: number | null
  warehouseLabel: string
  productId: number | null
  productLabel: string
  valueDate: string
  statusLabel: string
  emailUrl: string
  modifyUrl: string
  validateUrl: string
  backToDraftUrl: string
  deleteUrl: string
  relatedObjects: RelatedObjectRow[]
  linkedEvents: LinkedEventRow[]
  addEventUrl: string
}

export interface WarehouseMovementStats {
  saleUseQty: string
  saleUseToday: string
  soldQty: string
  soldToday: string
  purchaseQty: string
  purchaseToday: string
  lotUsedCount: string
  lotUsedToday: string
  correctionCount: string
  correctionToday: string
}

export interface WarehouseMovementRow {
  id: number
  dateFormatted: string
  productRef: string
  productLabel: string
  batch: string
  inventoryCode: string
  label: string
  typeLabel: string
  originText: string
  originUrl: string
  costPrice: string
  qtyDisplay: string
  zraStatusLabel: string
}

export interface WarehouseMovementsData {
  stats: WarehouseMovementStats
  movements: WarehouseMovementRow[]
  totalRecords: number
  page: number
  limit: number
  products: { id: number; ref: string; label: string }[]
  batches: string[]
  inventoryCodes: string[]
  dateRange: string
  zraEnabled: boolean
  batchTrackingEnabled: boolean
}

export interface WarehouseLinkedFile {
  name: string
  url: string
}

export interface WarehouseDocGenOptions {
  token: string
  modelOptions: WarehouseSelectOption[]
  langOptions: WarehouseSelectOption[]
  defaultLang: string
}

export interface WarehouseEventsData {
  linkedFiles: WarehouseLinkedFile[]
  docGen: WarehouseDocGenOptions
  events: LinkedEventRow[]
  addEventUrl: string
  createdByName: string
  createdByUrl: string
  createdById: number | null
  creationDate: string
  lastModificationDate: string
}
