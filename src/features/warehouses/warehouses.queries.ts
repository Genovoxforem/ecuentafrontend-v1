/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery } from '@tanstack/react-query'
import { fapiGet } from '../../api/fapiEnvelope'
import { useStockMovementsList } from './stockMovementsList.queries'

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
}

// product/stock/fapi/dashboard.php: every tile of the warehouse home in one call (stock counts and values,
// warehouses, today's movements, inventories, shipments, receptions). `value_at_sale` is what the classic page calls
// "stock value" (quantity x selling price); the cost-based figure is value_at_cost. Stock reservations are not a table
// on this backend, so they stay at zero.
export function useWarehouseSummary() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['warehouses', 'dashboardFapi'],
    queryFn: async (): Promise<WarehouseSummary> => {
      const d = await fapiGet<any>('/product/stock/fapi/dashboard.php')
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
