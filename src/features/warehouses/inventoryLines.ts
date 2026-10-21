// The count-entry tab of an inventory (product/stock/fapi/inventory.php?id=: the lines with the expected quantity at
// validation and the counted one). Types only; the classic inventory.php page is no longer parsed.
export type InventoryLineStatus = 'draft' | 'validated' | 'closed'

export interface InventoryLineRow {
  lineId: number
  warehouseId: number | null
  warehouseRef: string
  productId: number | null
  productRef: string
  productLabel: string
  expectedQty: number
  // Kept for the page's existing shape: the expected quantity the line was frozen with.
  stockQtySnapshot: string
  // '' while the line is not counted yet (a different thing from a counted zero).
  realQty: string
}

export interface SelectOption {
  value: string
  label: string
}

export interface InventoryLinesPage {
  token: string
  status: InventoryLineStatus
  canUpdateStock: boolean
  warehouseOptions: SelectOption[]
  productOptions: SelectOption[]
  lines: InventoryLineRow[]
  page: number
  hasNextPage: boolean
}

// The endpoint returns every line at once.
export const LINES_PER_PAGE = 100000
