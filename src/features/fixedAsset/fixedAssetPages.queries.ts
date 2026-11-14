import { useQuery } from '@tanstack/react-query'
import { fapiGet } from '../../api/fapiEnvelope'
import type { ReportTable } from '../../shared/legacyReportTableParser'

// asset/fapi/asset_report.php?year=YYYY (key-authenticated JSON, backend changelog 12 Nov 2026): the yearly asset depreciation report of the
// classic asset_old/asset_report.php (same join: purchase-invoice lines + depreciation + asset category + asset). It answers the classic
// table itself, so no page is read and no HTML parsed:
//   {year, headers: [10 classic column names], rows: string[][], items: [{ref, asset_ref, name, purchased_date, expiry_date, amount,
//    depreciation_pct, book_value, location, status, status_label}], count}      status_label is Sold (the purchase line is used by a sales line) or Pending.
// It replaces asset/fapi/transactions.php (a numeric status, no location or expiry) and the classic-page fallback this file used to carry.
// Checked live on newecuenta, 12 Nov 2026 (GET): 200, the 10 headers below, 0 rows (no purchase-invoice asset lines), so the row strings are
// the documented shape, not rows seen. No year = the current year; an invalid year (abc, 1899) is answered with the current year, not an error,
// so the year the backend used comes back with the table.
export const ASSET_REPORT_COLUMNS = ['Sl.No', 'Reference', 'Name Of Assets', 'Purchased Date', 'Expiry Date', 'Assets Amount', 'Depreciation %', 'Current Book Value', 'Location', 'Status']

export interface AssetReport extends ReportTable {
  // the year the backend built the report for (can differ from the one asked for)
  year: number
}

interface FapiAssetReport {
  year?: number
  headers?: string[]
  rows?: Array<Array<string | number | null>>
}

export function useAssetTransactionReport(year: string | null) {
  return useQuery({
    queryKey: ['fixedAssets', 'transaction-report', year],
    queryFn: async (): Promise<AssetReport> => {
      const d = await fapiGet<FapiAssetReport>('/asset/fapi/asset_report.php', { year: year! })
      return {
        year: d.year ?? Number(year),
        headers: d.headers?.length ? d.headers : ASSET_REPORT_COLUMNS,
        rows: (d.rows ?? []).map((r) => r.map((c) => (c === null || c === undefined ? '' : String(c)))),
      }
    },
    enabled: !!year,
  })
}
