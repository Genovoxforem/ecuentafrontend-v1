import { BriefcaseBusiness } from 'lucide-react'
import { ROUTES } from '../../routes'
import type { NavSection } from '../navTypes'

// Mirrors the real app's "Fixed Asset" left menu (llx_menu, mainmenu=asset)
// — the real menu tree itself is just 1 row (Fixed Asset -> asset/list.php);
// this grouping and item order instead comes from asset/index.php's own
// "Asset Area" dashboard tile links, confirmed by reading that file
// directly. "Assets Details" is genuinely real (asset/assets-sidebar-list-ajax.php,
// see fixedAssets.queries.ts); the rest are real backing pages with no JSON API.
export const nav: NavSection = {
  key: 'fixed-asset',
  label: 'Fixed Asset',
  icon: BriefcaseBusiness,
  items: [
    {
      label: 'Assets',
      items: [
        { label: 'Assets Details', path: ROUTES.fixedAssetList },
        { label: 'Assets Types', path: ROUTES.fixedAssetTypes },
        { label: 'Asset Category', path: ROUTES.fixedAssetCategory },
        { label: 'Asset Group', path: ROUTES.fixedAssetGroup },
      ],
    },
    { label: 'Assets Insurance', items: [{ label: 'Insurance Company', path: ROUTES.fixedAssetInsuranceCompany }] },
    { label: 'Assets Journal', items: [{ label: 'List Of Asset Transaction Report', path: ROUTES.fixedAssetTransactionReport }] },
  ],
}
