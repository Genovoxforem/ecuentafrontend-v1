import { useQuery } from '@tanstack/react-query'
import { NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'

// product/stock/stock_movement_report_ajax.php — a real, complete stock-card
// report (opening balance, per-movement in/out, running closing balance,
// with customer/vendor "particulars" and invoice/order refs) — found by
// grepping product/stock/ for json_encode. Confirmed live: returns a clean
// {success, data, totals} envelope even for a product with zero movements
// (a single OPENING row at the requested opening balance).

export interface StockMovementReportRow {
  date: string
  particulars: string
  invoiceNo: string
  initialStock: number | ''
  stockIn: number | ''
  stockOut: number | ''
  defects: number | ''
  closingStock: number
}
export interface StockMovementReportTotals {
  initialStock: number
  totalIn: number
  totalOut: number
  totalDefects: number
  closingStock: number
}
export interface StockMovementReport {
  rows: StockMovementReportRow[]
  totals: StockMovementReportTotals
}

export interface StockMovementReportFilters {
  productId: number | undefined
  warehouseId?: number
  dateStart: string
  dateEnd: string
}

interface RawRow {
  date: string
  particulars: string
  invoice_no: string
  initial_stock: number | ''
  stock_in: number | ''
  stock_out: number | ''
  defects: number | ''
  closing_stock: number
}
interface RawTotals {
  initial_stock: number
  total_in: number
  total_out: number
  total_defects: number
  closing_stock: number
}

export function useStockMovementReport(filters: StockMovementReportFilters) {
  return useQuery({
    queryKey: ['stockMovementReport', filters],
    queryFn: async (): Promise<StockMovementReport> => {
      const params = new URLSearchParams({
        product_id: String(filters.productId),
        date_start: filters.dateStart,
        date_end: filters.dateEnd,
      })
      if (filters.warehouseId) params.set('warehouse_id', String(filters.warehouseId))
      const res = await fetch(`/product/stock/stock_movement_report_ajax.php?${params.toString()}`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      let json: { success: boolean; message?: string; data?: RawRow[]; totals?: RawTotals }
      try {
        json = await res.json()
      } catch {
        throw new Error(NOT_SIGNED_IN_MESSAGE)
      }
      if (!json.success) throw new Error(json.message || 'Failed to load the stock movement report.')
      return {
        rows: (json.data ?? []).map((r) => ({
          date: r.date,
          particulars: r.particulars,
          invoiceNo: r.invoice_no,
          initialStock: r.initial_stock,
          stockIn: r.stock_in,
          stockOut: r.stock_out,
          defects: r.defects,
          closingStock: r.closing_stock,
        })),
        totals: {
          initialStock: json.totals?.initial_stock ?? 0,
          totalIn: json.totals?.total_in ?? 0,
          totalOut: json.totals?.total_out ?? 0,
          totalDefects: json.totals?.total_defects ?? 0,
          closingStock: json.totals?.closing_stock ?? 0,
        },
      }
    },
    enabled: !!filters.productId,
  })
}
