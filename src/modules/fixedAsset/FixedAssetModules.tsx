import { HandCoins, BriefcaseBusiness, Tags, FolderTree, Users, ShieldCheck } from 'lucide-react'
import { FixedAssetLegacyListPage, AssetTransactionReportPage } from '../../features/fixedAsset/components/FixedAssetLegacyListPage'

export const AssetsDetailsModule = () => <FixedAssetLegacyListPage path="/asset/list.php" title="Asset Area" icon={BriefcaseBusiness} newLabel="New asset" />
export const AssetsTypesModule = () => <FixedAssetLegacyListPage path="/asset/type.php" title="Assets Types" icon={Tags} newLabel="New Asset Type" />
export const AssetCategoryModule = () => <FixedAssetLegacyListPage path="/asset/listcategory.php" title="Assets Category" icon={FolderTree} newLabel="New Asset Category" />
export const AssetGroupModule = () => <FixedAssetLegacyListPage path="/custom/crm/assetgroup.php" title="Asset Group" icon={Users} newLabel="Create Group" />
export const InsuranceCompanyModule = () => (
  <FixedAssetLegacyListPage path="/custom/crm/assetinccompany.php" title="Insurance Company" icon={ShieldCheck} newLabel="Create Company" showCount />
)
export const AssetTransactionReportModule = () => <AssetTransactionReportPage icon={HandCoins} />
