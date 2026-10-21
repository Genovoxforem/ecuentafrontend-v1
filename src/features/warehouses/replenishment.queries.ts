/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fapiGet, fapiPost } from '../../api/fapiEnvelope'

// product/stock/fapi/replenish.php (16 Oct 2026): the shortage list (a row appears when the desired stock or the alert
// level is above the available stock, measured against virtual stock when the instance uses it) with each row's vendor
// price options, the orders the feature raised (?action=orders) and the order creation (?action=create_orders: one
// purchase order per vendor, appended to that vendor's open replenishment draft, all in one transaction). It replaces
// the replenish.php / replenishorders.php scrapes and the legacy form post, which put a line on the wrong vendor's
// order after a reused draft.

export interface ReplenishmentVendorOption {
  value: number // product_fournisseur_price.id — 0 means "no vendor selected / not available"
  label: string
  selected: boolean
}

export interface MissingStockRow {
  productId: number
  ref: string
  label: string
  desiredStock: number
  limitForAlert: number
  stock: number
  belowAlert: boolean
  ordered: number
  toOrderDefault: number
  vendorOptions: ReplenishmentVendorOption[]
  hasVendorPrice: boolean
}

export interface MissingStocksFilters {
  mode: 'virtual' | 'physical'
  fkSupplier?: number
}


const FAPI = '/product/stock/fapi/replenish.php'

// One vendor price of a row: the id the order is created from (get_buyprice() reads price, discount and VAT from it).
function vendorOptionFromFapi(o: any): ReplenishmentVendorOption {
  const label = [o.supplier_name ?? o.supplier?.name ?? o.label, o.ref_supplier ? `Ref ${o.ref_supplier}` : '', o.unit_price != null || o.price != null ? `${o.unit_price ?? o.price}` : '', o.qty_min != null ? `min ${o.qty_min}` : '']
    .filter(Boolean)
    .join(' - ')
  return { value: Number(o.supplier_price_id ?? o.id) || 0, label: label || `Price #${o.supplier_price_id ?? o.id}`, selected: Boolean(o.selected ?? o.is_best) }
}

async function fetchMissingFromFapi(filters: MissingStocksFilters): Promise<{ rows: MissingStockRow[]; token: string }> {
  const items: any[] = []
  let pages = 1
  for (let page = 1; page <= pages && page <= 20; page += 1) {
    const d = await fapiGet<any>(FAPI, { page, limit: 100, fk_supplier: filters.fkSupplier || undefined })
    pages = d.pagination?.pages ?? 1
    items.push(...(d.items ?? []))
  }
  const rows = items.map((r): MissingStockRow => {
    const stock = Number(filters.mode === 'physical' ? r.stock_physique : r.stock_used_for_shortage ?? r.stock_virtual ?? r.stock_physique) || 0
    const vendorOptions = ((r.suppliers ?? []) as any[]).map(vendorOptionFromFapi)
    const limit = Number(r.alert_stock) || 0
    return {
      productId: Number(r.id),
      ref: r.ref ?? '',
      label: r.label ?? '',
      desiredStock: Number(r.desired_stock) || 0,
      limitForAlert: limit,
      stock,
      belowAlert: Boolean(r.below_alert),
      ordered: Number(r.qty_ordered ?? r.ordered ?? 0) || 0,
      toOrderDefault: Number(r.to_order) || 0,
      vendorOptions,
      hasVendorPrice: Boolean(r.has_supplier_price) || vendorOptions.some((o) => o.value > 0),
    }
  })
  return { rows, token: '' }
}

export function useMissingStocks(filters: MissingStocksFilters) {
  return useQuery({
    queryKey: ['warehouses', 'missingStocks', filters],
    queryFn: (): Promise<{ rows: MissingStockRow[]; token: string }> => fetchMissingFromFapi(filters),
    staleTime: 1000 * 30,
  })
}

export interface ReplenishmentOrderRow {
  id: number
  ref: string
  socid: number | null
  company: string
  author: string
  amountIncTax: number
  orderCreation: string
  statusLabel: string
  statusCode: number | null
}

async function fetchOrdersFromFapi(searchProduct?: number): Promise<ReplenishmentOrderRow[]> {
  const d = await fapiGet<any>(FAPI, { action: 'orders', limit: 100, product: searchProduct || undefined })
  return ((d.items ?? []) as any[]).map(
    (o): ReplenishmentOrderRow => ({
      id: Number(o.id),
      ref: o.ref ?? '',
      socid: o.supplier?.id != null ? Number(o.supplier.id) : null,
      company: o.supplier?.name ?? '',
      author: o.author?.name ?? o.author?.login ?? '',
      amountIncTax: Number(o.total_ttc) || 0,
      orderCreation: o.date_creation ?? o.date_order ?? '',
      statusLabel: o.status_label ?? '',
      statusCode: o.status == null ? null : Number(o.status),
    }),
  )
}

export function useReplenishmentOrders(searchProduct?: number) {
  return useQuery({
    queryKey: ['warehouses', 'replenishmentOrders', searchProduct],
    queryFn: (): Promise<ReplenishmentOrderRow[]> => fetchOrdersFromFapi(searchProduct),
    staleTime: 1000 * 30,
  })
}

export interface CreateReplenishmentOrderLine {
  productId: number
  vendorPriceId: number
  qty: number
}

export function useCreateReplenishmentOrders() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ lines }: { token: string; lines: CreateReplenishmentOrderLine[] }) => {
      await fapiPost(FAPI, { lines: lines.map((l) => ({ supplier_price_id: l.vendorPriceId, qty: l.qty })), reuse_draft: true }, { action: 'create_orders' })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses', 'missingStocks'] })
      queryClient.invalidateQueries({ queryKey: ['warehouses', 'replenishmentOrders'] })
    },
  })
}
