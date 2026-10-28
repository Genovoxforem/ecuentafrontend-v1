import { useQuery } from '@tanstack/react-query'
import { fapiGet } from '../../api/fapiEnvelope'

// product/stock/fapi/movement_report.php — the stock card of one product: opening balance, each movement in or out, the running closing
// balance, with the customer or vendor as "particulars" and the document ref. The period defaults to the current month when no date is sent.
// Captured from newecuenta on 23 Oct 2026 (tests/fixtures/stock-movement-report.json).

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

export interface FapiMovementReport {
  rows: Array<{ date: string; particulars: string | null; invoice_no: string | null; initial_stock: number | null; stock_in: number | null; stock_out: number | null; defects: number | null; closing_stock: number }>
  totals: { initial_stock: number; total_in: number; total_out: number; total_defects: number; closing_stock: number }
}

// The old report left a column blank (an empty string) where there was no figure.
const blank = (v: number | null): number | '' => (v === null ? '' : v)

export function mapMovementReport(d: FapiMovementReport): StockMovementReport {
  return {
    rows: d.rows.map((r) => ({
      date: r.date,
      particulars: r.particulars ?? '',
      invoiceNo: r.invoice_no ?? '',
      initialStock: blank(r.initial_stock),
      stockIn: blank(r.stock_in),
      stockOut: blank(r.stock_out),
      defects: blank(r.defects),
      closingStock: r.closing_stock,
    })),
    totals: { initialStock: d.totals.initial_stock, totalIn: d.totals.total_in, totalOut: d.totals.total_out, totalDefects: d.totals.total_defects, closingStock: d.totals.closing_stock },
  }
}

export function useStockMovementReport(filters: StockMovementReportFilters) {
  return useQuery({
    queryKey: ['stockMovementReport', 'fapi', filters],
    queryFn: async (): Promise<StockMovementReport> =>
      mapMovementReport(await fapiGet<FapiMovementReport>('/product/stock/fapi/movement_report.php', { product: filters.productId, warehouse_id: filters.warehouseId, date_start: filters.dateStart, date_end: filters.dateEnd })),
    enabled: !!filters.productId,
  })
}
