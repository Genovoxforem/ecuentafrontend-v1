import { useLocalCollection, nextLocalRef, todayIso } from '../../shared/localCollection'
import { useProductOptions } from '../products/products.queries'

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
}

export interface StockMovement {
  ref: string
  productRef: string
  productLabel: string
  delta: number
  reason: string
  date: string
}

const KEY = ['local', 'warehouseMovements'] as const
const SEED: StockMovement[] = []
const LOW_STOCK_THRESHOLD = 5

function effectiveStockFor(productRef: string, baseStock: number, movements: StockMovement[]) {
  return baseStock + movements.filter((m) => m.productRef === productRef).reduce((sum, m) => sum + m.delta, 0)
}

// No backend endpoint exists for warehouse/stock movements on this app's
// server (only /products/ returns a static stock snapshot). Movements are
// held in react-query's cache only — see shared/localCollection.ts — and
// layered on top of the real product list's stock, so recording one feels
// real but never writes back to the actual product record. Shipments,
// receptions, reservations, and inventories have no equivalent local
// concept to simulate honestly (they'd need real sales/purchase order line
// items this app doesn't have), so those stay zero rather than invented.
export function useWarehouseSummary() {
  const { data: products } = useProductOptions()
  const [movements] = useLocalCollection(KEY, SEED)

  // Services don't hold stock — only physical products count toward these.
  const rows = (products ?? [])
    .filter((p) => p.type === 'product')
    .map((p) => ({ ...p, effectiveStock: effectiveStockFor(p.ref, p.stock, movements) }))
  const today = todayIso()

  const summary: WarehouseSummary = {
    totalProductsInStock: rows.filter((r) => r.effectiveStock > 0).length,
    totalStockQuantity: rows.reduce((sum, r) => sum + r.effectiveStock, 0),
    totalStockValue: rows.reduce((sum, r) => sum + r.effectiveStock * r.priceExclTax, 0),
    // Reflects the one warehouse implied by this account's POS terminal
    // config (warehouse_id: 1) — there's no multi-warehouse data to break
    // this down further.
    warehousesActive: products ? 1 : 0,
    warehousesTotal: products ? 1 : 0,
    productsOutOfStock: rows.filter((r) => r.effectiveStock <= 0).length,
    productsLowStock: rows.filter((r) => r.effectiveStock > 0 && r.effectiveStock < LOW_STOCK_THRESHOLD).length,
    movementsToday: movements.filter((m) => m.date.slice(0, 10) === today).length,
    inventories: 0,
    shipments: { total: 0, validated: 0 },
    receptions: { total: 0, validated: 0 },
    reservations: { active: 0, totalReservedQty: 0, released: 0, consumed: 0 },
  }
  return { data: summary, isError: false, isLoading: false }
}

export interface StockRow {
  ref: string
  label: string
  baseStock: number
  effectiveStock: number
}

export function useStockRows(): StockRow[] {
  const { data: products } = useProductOptions()
  const [movements] = useLocalCollection(KEY, SEED)
  return (products ?? [])
    .filter((p) => p.type === 'product')
    .map((p) => ({
    ref: p.ref,
    label: p.label,
    baseStock: p.stock,
    effectiveStock: effectiveStockFor(p.ref, p.stock, movements),
  }))
}

export function useRecentMovements(limit = 10): StockMovement[] {
  const [movements] = useLocalCollection(KEY, SEED)
  return movements.slice(0, limit)
}

export function useRecordStockMovement() {
  const [, update] = useLocalCollection(KEY, SEED)
  return (input: { productRef: string; productLabel: string; delta: number; reason: string }) => {
    const movement: StockMovement = {
      ref: nextLocalRef('MO'),
      productRef: input.productRef,
      productLabel: input.productLabel,
      delta: input.delta,
      reason: input.reason,
      date: new Date().toISOString(),
    }
    update((current) => [movement, ...current])
  }
}
