// Client-side filter predicates for the All Products list — port of legacy
// product/allproducts.php's "Filter" modal. Everything here filters data
// already fetched on the page (see productAjax.ts's comment on why: the
// AJAX source already fetches all rows unfiltered in one call), matching
// this codebase's established fetch-once/filter-client-side convention
// (OrdersList.tsx and every other list page do the same).
//
// Two fields are honestly inert on this install, not bugs:
//  - tosell: '0' ("Not for sale") always matches zero rows, because
//    /api/products/'s own SQL hardcodes `WHERE ... AND p.tosell = 1` —
//    every row this page ever sees is already for-sale.
//  - Entities: this install only has one Dolibarr entity (confirmed via
//    `SELECT * FROM llx_entity`), so ProductFilterModal's Entities field
//    is a single always-true option, not a real predicate here at all.
import type { ProductRow } from './products.queries'
import type { RichProductRow } from './productAjax'

export interface ProductFilters {
  // Selected category IDs from useProductFormOptions().categories; '-2' is
  // the synthetic "Not categorized" option, matching legacy's own.
  categories: string[]
  // Product-type = RRP (legacy's search_type=5, `p.rrp > 0`). This page
  // only ever shows products (not services — those live on /services/list),
  // so the blank/Product/Service options collapse to just this one toggle.
  isRrp: boolean
  finished: '-1' | '1' | '2' | '3'
  tobatch: '-1' | '0' | '1' | '2'
  tosell: '-1' | '0' | '1'
  tobuy: '-1' | '0' | '1'
  stockFilter: '-1' | '1' | '2' | '3'
  // 'YYYY-MM-DD' or '' — from native <input type="date">.
  dateStart: string
  dateEnd: string
}

export const DEFAULT_PRODUCT_FILTERS: ProductFilters = {
  categories: [],
  isRrp: false,
  finished: '-1',
  tobatch: '-1',
  tosell: '-1',
  tobuy: '-1',
  stockFilter: '-1',
  dateStart: '',
  dateEnd: '',
}

export function hasActiveFilters(f: ProductFilters): boolean {
  return (
    f.categories.length > 0 ||
    f.isRrp ||
    f.finished !== '-1' ||
    f.tobatch !== '-1' ||
    f.tosell !== '-1' ||
    f.tobuy !== '-1' ||
    f.stockFilter !== '-1' ||
    f.dateStart !== '' ||
    f.dateEnd !== ''
  )
}

export function activeFilterCount(f: ProductFilters): number {
  let n = 0
  if (f.categories.length > 0) n++
  if (f.isRrp) n++
  if (f.finished !== '-1') n++
  if (f.tobatch !== '-1') n++
  if (f.tosell !== '-1') n++
  if (f.tobuy !== '-1') n++
  if (f.stockFilter !== '-1') n++
  if (f.dateStart !== '' || f.dateEnd !== '') n++
  return n
}

// Legacy's tobatch->badge-text mapping (allproducts_ajax.php's rowData
// 'lotstatus'), reused here so the filter matches the same text
// productAjax.ts already parsed off the real badge.
const LOT_STATUS_BY_VALUE: Record<string, string> = { '0': 'Disabled', '1': 'Lot', '2': 'Serial' }

export function matchesProductFilters(
  row: ProductRow,
  rich: RichProductRow | undefined,
  filters: ProductFilters,
  categoryLabelById: Map<string, string>,
): boolean {
  if (filters.categories.length > 0) {
    const rowCategory = rich?.category ?? ''
    const matchesAny = filters.categories.some((catId) => {
      if (catId === '-2') return !rowCategory
      const label = categoryLabelById.get(catId)
      return !!label && rowCategory === label
    })
    if (!matchesAny) return false
  }

  if (filters.isRrp && !(row.rrp > 0)) return false

  if (filters.finished !== '-1' && String(row.finished) !== filters.finished) return false

  if (filters.tobatch !== '-1' && (rich?.lotStatus ?? '') !== LOT_STATUS_BY_VALUE[filters.tobatch]) return false

  if (filters.tosell !== '-1') {
    const wantsForSale = filters.tosell === '1'
    if (row.forSale !== wantsForSale) return false
  }

  if (filters.tobuy !== '-1') {
    const wantsForPurchase = filters.tobuy === '1'
    if (row.forPurchase !== wantsForPurchase) return false
  }

  // Prefer the rich (AJAX-computed, real per-warehouse) stock figure over
  // row.stock (the REST endpoint's raw llx_product.stock column) — the two
  // can drift apart when that cached column goes stale with no backing
  // llx_product_stock rows (confirmed live: two real products showing
  // stock=-52/-9 in the cache with zero actual warehouse stock rows behind
  // them, vs a correct computed 0). Matches the Stock column's own
  // rich-first display so the filter never disagrees with what's shown.
  const effectiveStock = rich ? rich.stockPhysical : row.stock
  if (filters.stockFilter === '1' && !(effectiveStock < 0)) return false
  if (filters.stockFilter === '2' && effectiveStock !== 0) return false
  if (filters.stockFilter === '3' && !(effectiveStock > 0)) return false

  if (filters.dateStart || filters.dateEnd) {
    const createdAt = rich?.createdAt ?? 0
    if (!createdAt) return false
    if (filters.dateStart && createdAt < new Date(filters.dateStart).getTime()) return false
    if (filters.dateEnd && createdAt > new Date(filters.dateEnd).getTime() + 24 * 60 * 60 * 1000 - 1) return false
  }

  return true
}
