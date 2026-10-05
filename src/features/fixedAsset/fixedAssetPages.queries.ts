import { useQuery } from '@tanstack/react-query'
import { fetchLegacyText } from '../../shared/legacyHtmlFetch'
import { parseReportTable, type ReportTable } from '../../shared/legacyReportTableParser'

// Real via the Fixed Asset module's server-rendered list pages — none has a
// JSON API (asset/list.php, type.php, listcategory.php, custom/crm/
// assetgroup.php, assetinccompany.php, asset_report.php), each prints every
// row into one <table id="example"> that this scrapes. Edit/Delete (and the
// per-row ref links) point at legacy PHP pages, so those are not carried over.
export type FixedAssetListPath =
  | '/asset/list.php'
  | '/asset/type.php'
  | '/asset/listcategory.php'
  | '/custom/crm/assetgroup.php'
  | '/custom/crm/assetinccompany.php'

export function useFixedAssetTable(path: FixedAssetListPath) {
  return useQuery({
    queryKey: ['fixedAssets', 'table', path],
    queryFn: async (): Promise<ReportTable> => parseReportTable(await fetchLegacyText(path), 'table#example'),
  })
}

// asset/asset_report.php reads $_REQUEST['yearPic'] + `submitt`; its own POST
// form is CSRF-blocked in the browser, so it is sent as a GET (same approach
// as the Payroll report pages).
export function useAssetTransactionReport(year: string | null) {
  return useQuery({
    queryKey: ['fixedAssets', 'transaction-report', year],
    queryFn: async (): Promise<ReportTable> => {
      const params = new URLSearchParams({ yearPic: year!, submitt: '1' })
      return parseReportTable(await fetchLegacyText(`/asset/asset_report.php?${params.toString()}`), 'table#example')
    },
    enabled: !!year,
  })
}
