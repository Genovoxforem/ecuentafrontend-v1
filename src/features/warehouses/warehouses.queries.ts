import { useQuery } from '@tanstack/react-query'
import { fetchLegacyDocument, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'
import { useProductOptions } from '../products/products.queries'
import { useStockMovementsList } from './stockMovementsList.queries'
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

const LOW_STOCK_THRESHOLD = 5

// Stock figures are the real product list's own stock — corrections and
// transfers are real backend writes (see StockCorrectionPage /
// StockTransferPage), so there is nothing to layer on top of it.
//
// Inventories/Shipments/Receptions/Reservations/real Warehouse count/real
// Movements-Today have real values too, just not via a REST API — see
// useWarehouseLegacyStats above, which scrapes them from the legacy page.
// While that's loading (or if it fails — no legacy session, offline, etc.)
// this falls back to honest zero/best-guess defaults rather than blocking the
// rest of the dashboard on it.
export function useWarehouseSummary() {
  const { data: products } = useProductOptions()
  const { data: legacyStats, isError: legacyStatsIsError, error: legacyStatsErrorObj } = useWarehouseLegacyStats()

  // Services don't hold stock — only physical products count toward these.
  const rows = (products ?? []).filter((p) => p.type === 'product')

  const summary: WarehouseSummary = {
    totalProductsInStock: rows.filter((r) => r.stock > 0).length,
    totalStockQuantity: rows.reduce((sum, r) => sum + r.stock, 0),
    totalStockValue: rows.reduce((sum, r) => sum + r.stock * r.priceExclTax, 0),
    // Falls back to a guess of the one warehouse implied by this account's
    // POS terminal config (warehouse_id: 1) until the real count above loads.
    warehousesActive: legacyStats?.warehousesActive ?? (products ? 1 : 0),
    warehousesTotal: legacyStats?.warehousesTotal ?? (products ? 1 : 0),
    productsOutOfStock: rows.filter((r) => r.stock <= 0).length,
    productsLowStock: rows.filter((r) => r.stock > 0 && r.stock < LOW_STOCK_THRESHOLD).length,
    movementsToday: legacyStats?.movementsToday ?? 0,
    inventories: legacyStats?.inventories ?? 0,
    shipments: legacyStats?.shipments ?? { total: 0, validated: 0 },
    receptions: legacyStats?.receptions ?? { total: 0, validated: 0 },
    reservations: legacyStats?.reservations ?? { active: 0, totalReservedQty: 0, released: 0, consumed: 0 },
    legacyStatsError: legacyStatsIsError ? (legacyStatsErrorObj instanceof Error ? legacyStatsErrorObj.message : 'Unknown error.') : undefined,
  }
  return { data: summary, isError: false, isLoading: false }
}

// The latest real stock movements (product/stock/ajax/movement_list_api.php,
// newest first), for the Warehouse dashboard.
export function useRecentMovements(limit = 10) {
  const { data, isLoading, isError, error, refetch } = useStockMovementsList({ limit })
  return { movements: data?.movements.slice(0, limit) ?? [], isLoading, isError, error, refetch }
}
