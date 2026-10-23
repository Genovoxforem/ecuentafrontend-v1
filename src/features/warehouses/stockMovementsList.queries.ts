import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { loadStockMovements, sendMovementsToZra } from './stockMovementsFapi'

// Stock movements list (product/stock/movement_list.php) on product/stock/fapi/movements.php: rows, per-item Today / Total figures and the filter
// lists. The bulk "Update to ZRA" posts the selected ids to zra_stock_update.php. See stockMovementsFapi.ts.

export interface StockMovementRow {
  id: number
  productId: number
  productRef: string
  productLabel: string
  batch: string | null
  dateFormatted: string
  warehouseId: number
  warehouseRef: string
  author: string
  inventoryCode: string | null
  label: string
  typeMouvement: string
  typeLabel: string
  originRef: string
  originUrl: string
  costPrice: string
  qty: string
  zraStatusDisplay: string
  zraStatusClass: string
}

export interface StockMovementFilterOption {
  id: string
  ref: string
  label: string
}

export interface StockMovementsStats {
  saleUseQty: number
  saleUseToday: number
  soldQty: number
  soldToday: number
  purchaseQty: number
  purchaseToday: number
  lotUsedCount: number
  lotUsedToday: number
  correctionCount: number
  correctionToday: number
}

export interface StockMovementsPageData {
  stats: StockMovementsStats
  products: StockMovementFilterOption[]
  batches: string[]
  inventoryCodes: string[]
  movements: StockMovementRow[]
  totalRecords: number
}

export interface StockMovementFilters {
  warehouseId?: string
  dateRange?: string // "MM/DD/YYYY-MM/DD/YYYY", matches the real newdatepicker format
  productId?: string
  batch?: string
  inventoryCode?: string
  search?: string
  // Rows to fetch; the full list page takes the API's page of 250.
  limit?: number
}

export function useStockMovementsList(filters: StockMovementFilters, enabled = true) {
  return useQuery({
    queryKey: ['warehouses', 'stockMovementsList', filters],
    queryFn: (): Promise<StockMovementsPageData> => loadStockMovements(filters),
    staleTime: 1000 * 30,
    enabled,
  })
}

// Bulk "Update to ZRA": zra_stock_update.php with the selected movement ids, 25 per call.
export function useBulkUpdateZraStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (rows: { rowid: number; inventoryCode: string | null }[]) => sendMovementsToZra(rows.map((r) => r.rowid)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['warehouses', 'stockMovementsList'] }),
  })
}
