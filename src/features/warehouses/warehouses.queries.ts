import { useQuery } from '@tanstack/react-query'
import { useLocalCollection, nextLocalRef, todayIso } from '../../shared/localCollection'
import { fetchLegacyDocument, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'
import { useProductOptions } from '../products/products.queries'
import { parseWarehouseLegacyStats, looksLikeLegacyLoginPage, type WarehouseLegacyStats } from './warehouseHtmlParser'

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
  // Undefined while the legacy scrape (see below) hasn't resolved yet, or
  // failed — the fields above already fall back to honest zeros/guesses in
  // that case, this just lets the UI show a "some stats are live" hint.
  legacyStatsError?: string
}

// Inventories/Shipments/Receptions/Reservations/real Movements-Today have no
// REST API on this app's backend (only /products/ returns a stock
// snapshot) — this scrapes the real numbers from the legacy warehouse
// stats page (product/stock/index.php) the same way generalLedger.queries.ts
// does for Ledger/Journals. See warehouseHtmlParser.ts for how the markup
// was verified. Best-effort: falls back to the honest-zero defaults below
// on any failure (including a stale/missing legacy session) rather than
// breaking the whole dashboard.
function useWarehouseLegacyStats() {
  return useQuery({
    queryKey: ['warehouses', 'legacyStats'],
    queryFn: async (): Promise<WarehouseLegacyStats> => {
      const doc = await fetchLegacyDocument('/product/stock/index.php', new URLSearchParams({ mainmenu: 'inventwarehouse' }))
      if (looksLikeLegacyLoginPage(doc)) throw new Error(NOT_SIGNED_IN_MESSAGE)
      return parseWarehouseLegacyStats(doc)
    },
    staleTime: 1000 * 30,
    retry: false,
  })
}

export interface StockMovement {
  ref: string
  productRef: string
  productLabel: string
  delta: number
  reason: string
  date: string
  // Optional — only set by warehouse-aware entry points (Stock Correction,
  // Stock Transfer, Mass Stock Transfer). Older/simpler recordings (e.g.
  // from Box Break) leave these blank rather than guessing a warehouse.
  warehouseRef?: string
  lotSerial?: string
  type?: 'Correction' | 'Transfer In' | 'Transfer Out'
}

const KEY = ['local', 'warehouseMovements'] as const
const SEED: StockMovement[] = []
const LOW_STOCK_THRESHOLD = 5

function effectiveStockFor(productRef: string, baseStock: number, movements: StockMovement[]) {
  return baseStock + movements.filter((m) => m.productRef === productRef).reduce((sum, m) => sum + m.delta, 0)
}

// No backend endpoint exists for warehouse/stock movements on this app's
// server (only /products/ returns a static stock snapshot). Movements
// recorded via the form below are held in react-query's cache only — see
// shared/localCollection.ts — and layered on top of the real product list's
// stock, so recording one feels real but never writes back to the actual
// product record.
//
// Inventories/Shipments/Receptions/Reservations/real Warehouse count/real
// Movements-Today DO have real values, just not via a REST API — see
// useWarehouseLegacyStats above, which scrapes them from the legacy page.
// While that's loading (or if it fails — no legacy session, offline, etc.)
// this falls back to the previous honest zero/best-guess defaults rather
// than blocking the rest of the dashboard on it.
export function useWarehouseSummary() {
  const { data: products } = useProductOptions()
  const [movements] = useLocalCollection(KEY, SEED)
  const { data: legacyStats, isError: legacyStatsIsError, error: legacyStatsErrorObj } = useWarehouseLegacyStats()

  // Services don't hold stock — only physical products count toward these.
  const rows = (products ?? [])
    .filter((p) => p.type === 'product')
    .map((p) => ({ ...p, effectiveStock: effectiveStockFor(p.ref, p.stock, movements) }))
  const today = todayIso()

  const summary: WarehouseSummary = {
    totalProductsInStock: rows.filter((r) => r.effectiveStock > 0).length,
    totalStockQuantity: rows.reduce((sum, r) => sum + r.effectiveStock, 0),
    totalStockValue: rows.reduce((sum, r) => sum + r.effectiveStock * r.priceExclTax, 0),
    // Falls back to a guess of the one warehouse implied by this account's
    // POS terminal config (warehouse_id: 1) until the real count above loads.
    warehousesActive: legacyStats?.warehousesActive ?? (products ? 1 : 0),
    warehousesTotal: legacyStats?.warehousesTotal ?? (products ? 1 : 0),
    productsOutOfStock: rows.filter((r) => r.effectiveStock <= 0).length,
    productsLowStock: rows.filter((r) => r.effectiveStock > 0 && r.effectiveStock < LOW_STOCK_THRESHOLD).length,
    movementsToday: legacyStats?.movementsToday ?? movements.filter((m) => m.date.slice(0, 10) === today).length,
    inventories: legacyStats?.inventories ?? 0,
    shipments: legacyStats?.shipments ?? { total: 0, validated: 0 },
    receptions: legacyStats?.receptions ?? { total: 0, validated: 0 },
    reservations: legacyStats?.reservations ?? { active: 0, totalReservedQty: 0, released: 0, consumed: 0 },
    legacyStatsError: legacyStatsIsError ? (legacyStatsErrorObj instanceof Error ? legacyStatsErrorObj.message : 'Unknown error.') : undefined,
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

type NewMovementInput = {
  productRef: string
  productLabel: string
  delta: number
  reason: string
  warehouseRef?: string
  lotSerial?: string
  type?: StockMovement['type']
}

function buildMovement(input: NewMovementInput): StockMovement {
  return {
    ref: nextLocalRef('MO'),
    productRef: input.productRef,
    productLabel: input.productLabel,
    delta: input.delta,
    reason: input.reason,
    date: new Date().toISOString(),
    warehouseRef: input.warehouseRef,
    lotSerial: input.lotSerial,
    type: input.type,
  }
}

export function useRecordStockMovement() {
  const [, update] = useLocalCollection(KEY, SEED)
  return (input: NewMovementInput) => {
    update((current) => [buildMovement(input), ...current])
  }
}

// Records several movements as one batch — used by Mass Stock Transfer,
// where each table row becomes a paired Transfer Out (source) / Transfer In
// (target) movement in the same shared local ledger the other Stock
// Movement pages read from.
export function useRecordStockMovements() {
  const [, update] = useLocalCollection(KEY, SEED)
  return (inputs: NewMovementInput[]) => {
    const batch = inputs.map(buildMovement)
    update((current) => [...batch, ...current])
  }
}
