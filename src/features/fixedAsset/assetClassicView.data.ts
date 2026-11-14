import { useQuery } from '@tanstack/react-query'
import { fetchLegacyText, legacyMissingContentError } from '../../shared/legacyHtmlFetch'
import { parseReportTable, type ReportTable } from '../../shared/legacyReportTableParser'
import { ROUTES } from '../../routes'
import { ASSET_KEY } from './assetList.data'

// The "Classic view" button of the new asset pages opens the previous asset module's own pages (read on newecuenta, 12 Nov 2026). Each prints
// every row into one <table id="example"> (a DataTable), so the table is read from the page itself: its asset_old/fapi twins answer empty
// lists for types, groups, companies and assets while these pages show them, and the page is what the user compares against.
//   asset_old/list.php          Ref. | Label | Asset type | Asset category | Status | Environment | Purchase Value | Sales Value
//   asset_old/type.php          Ref. | Label | Accounting code (asset) | (depreciation asset account) | (depreciation expense account) | edit
//   asset_old/listcategory.php  Ref. | Label | Depreciation percentage | type | Modify
//   custom/crm/assetgroup.php   Group Name | Group Code | Action
//   custom/crm/assetinccompany.php  Company Name | Address | Contact No | Accounting Code | Action
export type ClassicAssetView = 'list' | 'types' | 'categories' | 'groups' | 'insurers'

export const CLASSIC_VIEWS: Record<ClassicAssetView, { path: string; route: string; title: string; newPage: string }> = {
  list: { path: '/asset_old/list.php', route: ROUTES.fixedAssetClassicList, title: 'Asset Area', newPage: ROUTES.fixedAssetList },
  types: { path: '/asset_old/type.php', route: ROUTES.fixedAssetClassicTypes, title: 'Assets Types', newPage: ROUTES.fixedAssetTypes },
  categories: { path: '/asset_old/listcategory.php', route: ROUTES.fixedAssetClassicCategory, title: 'Assets Category', newPage: ROUTES.fixedAssetCategory },
  groups: { path: '/custom/crm/assetgroup.php', route: ROUTES.fixedAssetClassicGroup, title: 'Asset Group', newPage: ROUTES.fixedAssetGroup },
  insurers: { path: '/custom/crm/assetinccompany.php', route: ROUTES.fixedAssetClassicInsurance, title: 'Insurance Company', newPage: ROUTES.fixedAssetInsuranceCompany },
}

// The edit pencil / action column of those tables is a link to a classic form, so it is left out (the new pages edit these records).
export const CLASSIC_HIDDEN_COLUMNS = ['', 'Action', 'Modify']

export function readClassicTable(html: string): ReportTable {
  const table = parseReportTable(html, 'table#example')
  if (table.headers.length === 0) throw legacyMissingContentError(html, 'The classic asset page did not show its table.')
  return table
}

export function useClassicAssetView(view: ClassicAssetView) {
  return useQuery({
    queryKey: [...ASSET_KEY, 'classic', view],
    queryFn: async (): Promise<ReportTable> => readClassicTable(await fetchLegacyText(CLASSIC_VIEWS[view].path)),
    staleTime: 1000 * 30,
    retry: false,
  })
}
