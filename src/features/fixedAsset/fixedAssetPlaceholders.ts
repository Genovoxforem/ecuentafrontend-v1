import type { ComponentType } from 'react'
import { Tags, FolderTree, Users, ShieldCheck, FileBarChart } from 'lucide-react'
import { ROUTES } from '../../routes'

// The real llx_menu submenu tree for Fixed Asset is confirmed missing from
// the database entirely (only the single top-level icon row exists,
// mainmenu='asset' -> asset/list.php). These 5 items come from the real
// "Asset Area" dashboard (asset/index.php)'s own hardcoded tile links,
// confirmed by reading that file directly. Each backing page was checked
// for a real JSON list API and none was found — only mutation-only or
// single-row-fetch ajax siblings (asset_group_ajax.php,
// assetinccompany_ajax.php), several with raw string-concatenated SQL and
// zero permission checks — flagged, not fixed (frontend-only scope).
export interface FixedAssetPlaceholder {
  path: string
  icon: ComponentType<{ size?: number; className?: string }>
  title: string
  description: string
}

export const FIXED_ASSET_PLACEHOLDERS: FixedAssetPlaceholder[] = [
  { path: ROUTES.fixedAssetTypes, icon: Tags, title: 'Assets Types', description: 'Real page: asset/type.php — classic form-POST, no JSON API.' },
  { path: ROUTES.fixedAssetCategory, icon: FolderTree, title: 'Asset Category', description: 'Real page: asset/listcategory.php — classic form-POST, no JSON API.' },
  {
    path: ROUTES.fixedAssetGroup,
    icon: Users,
    title: 'Asset Group',
    description: 'Real page: custom/crm/assetgroup.php — its ajax sibling only handles create/edit/delete, no list action; unescaped SQL in every action.',
  },
  {
    path: ROUTES.fixedAssetInsuranceCompany,
    icon: ShieldCheck,
    title: 'Insurance Company',
    description: 'Real page: custom/crm/assetinccompany.php — its ajax sibling only handles create/edit/delete, no list action; unescaped SQL in every action.',
  },
  {
    path: ROUTES.fixedAssetTransactionReport,
    icon: FileBarChart,
    title: 'List Of Asset Transaction Report',
    description: 'Real page: asset/asset_report.php — classic server-rendered report, no JSON API.',
  },
]
