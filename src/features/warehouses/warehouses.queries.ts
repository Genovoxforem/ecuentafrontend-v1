/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { fapiGet } from '../../api/fapiEnvelope'
import { useStockMovementsList } from './stockMovementsList.queries'

// product/stock/fapi/dashboard.php feeds both the summary tiles and the values column of the warehouse list. With
// staleTime 0 fetchQuery never answers from the cache: callers that ask while a request is in flight share it, and any
// later call fetches again.
export function fetchWarehouseDashboard(queryClient: QueryClient) {
  return queryClient.fetchQuery({ queryKey: ['warehouses', 'dashboardRaw'], queryFn: () => fapiGet<any>('/product/stock/fapi/dashboard.php'), staleTime: 0 })
}

export interface WarehouseSummary {
  totalProductsInStock: number
  totalStockQuantity: number
  totalStockValue: number
  warehousesActive: number
  warehousesTotal: number
  productsOutOfStock: number
  productsLowStock: number
  movementsToday: number
  inventories: number
  shipments: { total: number; validated: number }
  receptions: { total: number; validated: number }
  reservations: { active: number; totalReservedQty: number; released: number; consumed: number }
  // Per-warehouse stock value at cost, from the same dashboard call (the "Stock Value by Warehouse" chart).
  byWarehouse: Array<{ id: number; ref: string; shortName: string; inputStockValue: number }>
  // Set when the dashboard call failed, so the tiles show zeros with the reason.
  loadError?: string
}

const EMPTY: WarehouseSummary = {
  totalProductsInStock: 0,
  totalStockQuantity: 0,
  totalStockValue: 0,
  warehousesActive: 0,
  warehousesTotal: 0,
  productsOutOfStock: 0,
  productsLowStock: 0,
  movementsToday: 0,
  inventories: 0,
  shipments: { total: 0, validated: 0 },
  receptions: { total: 0, validated: 0 },
  reservations: { active: 0, totalReservedQty: 0, released: 0, consumed: 0 },
  byWarehouse: [],
}

// product/stock/fapi/dashboard.php: every tile of the warehouse home in one call (stock counts and values,
// warehouses, today's movements, inventories, shipments, receptions). `value_at_sale` is what the classic page calls
// "stock value" (quantity x selling price); the cost-based figure is value_at_cost. Stock reservations are not a table
// on this backend, so they stay at zero.
export function useWarehouseSummary() {
  const queryClient = useQueryClient()
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['warehouses', 'dashboardFapi'],
    queryFn: async (): Promise<WarehouseSummary> => {
      const d = await fetchWarehouseDashboard(queryClient)
      return {
        totalProductsInStock: Number(d.stock?.products_with_stock) || 0,
        totalStockQuantity: Number(d.stock?.total_qty) || 0,
        totalStockValue: Number(d.stock?.value_at_sale) || 0,
        warehousesActive: Number(d.warehouses?.open) || 0,
        warehousesTotal: Number(d.warehouses?.total) || 0,
        productsOutOfStock: Number(d.stock?.out_of_stock) || 0,
        productsLowStock: Number(d.stock?.low_stock) || 0,
        movementsToday: Number(d.movements?.today) || 0,
        inventories: Number(d.inventories?.total) || 0,
        shipments: { total: Number(d.shipments?.total) || 0, validated: Number(d.shipments?.validated) || 0 },
        receptions: { total: Number(d.receptions?.total) || 0, validated: Number(d.receptions?.validated) || 0 },
        reservations: { active: 0, totalReservedQty: 0, released: 0, consumed: 0 },
        byWarehouse: ((d.by_warehouse ?? []) as Array<Record<string, unknown>>).map((w) => ({
          id: Number(w.id),
          ref: String(w.ref ?? ''),
          shortName: String(w.location ?? ''),
          inputStockValue: Number(w.value_at_cost) || 0,
        })),
      }
    },
    staleTime: 1000 * 30,
    retry: false,
  })
  return { data: data ?? (isError ? { ...EMPTY, loadError: error instanceof Error ? error.message : 'Unknown error.' } : EMPTY), isError: false, isLoading }
}

// The latest real stock movements (newest first), for the Warehouse dashboard.
export function useRecentMovements(limit = 10) {
  const { data, isLoading, isError, error, refetch } = useStockMovementsList({ limit })
  return { movements: data?.movements.slice(0, limit) ?? [], isLoading, isError, error, refetch }
}
