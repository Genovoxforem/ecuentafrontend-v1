import { BriefcaseBusiness } from 'lucide-react'
import { ROUTES } from '../../routes'
import type { NavSection } from '../navTypes'

// Mirrors the Fixed Asset left menu of the new asset pages on newecuenta (mainmenu=asset, asset/assets.php and its siblings): Assets
// (Asset List, New Asset), Depreciation Run, Reports, and Setup (Asset Types, Asset Categories, Asset Groups, Insurance Companies).
export const nav: NavSection = {
  key: 'fixed-asset',
  label: 'Fixed Asset',
  icon: BriefcaseBusiness,
  items: [
    {
      label: 'Assets',
      items: [
        { label: 'Asset List', path: ROUTES.fixedAssetList },
        { label: 'New Asset', path: ROUTES.fixedAssetNew },
      ],
    },
    { label: 'Depreciation Run', path: ROUTES.fixedAssetDepreciation },
    { label: 'Reports', path: ROUTES.fixedAssetReports },
    {
      label: 'Setup',
      items: [
        { label: 'Asset Types', path: ROUTES.fixedAssetTypes },
        { label: 'Asset Categories', path: ROUTES.fixedAssetCategory },
        { label: 'Asset Groups', path: ROUTES.fixedAssetGroup },
        { label: 'Insurance Companies', path: ROUTES.fixedAssetInsuranceCompany },
      ],
    },
  ],
}
