import { BriefcaseBusiness, CalendarClock, ChartColumn, CirclePlus, FolderTree, HandCoins, ShieldCheck, Tags, Users } from 'lucide-react'
import { AssetTransactionReportPage } from '../../features/fixedAsset/components/AssetTransactionReportPage'
import { AssetListPage } from '../../features/fixedAsset/components/AssetListPage'
import { AssetNewPage } from '../../features/fixedAsset/components/AssetNewPage'
import { AssetCardPage } from '../../features/fixedAsset/components/AssetCardPage'
import { DepreciationRunPage } from '../../features/fixedAsset/components/DepreciationRunPage'
import { AssetReportsPage } from '../../features/fixedAsset/components/AssetReportsPage'
import { AssetSetupPage } from '../../features/fixedAsset/components/AssetSetupPage'
import { AssetClassicViewPage } from '../../features/fixedAsset/components/AssetClassicViewPage'

export const AssetsDetailsModule = () => <AssetListPage icon={BriefcaseBusiness} />
export const AssetNewModule = () => <AssetNewPage icon={CirclePlus} />
export const AssetCardModule = () => <AssetCardPage />
export const AssetDepreciationModule = () => <DepreciationRunPage icon={CalendarClock} />
export const AssetReportsModule = () => <AssetReportsPage icon={ChartColumn} />
export const AssetsTypesModule = () => <AssetSetupPage entity="types" icon={Tags} />
export const AssetCategoryModule = () => <AssetSetupPage entity="categories" icon={FolderTree} />
export const AssetGroupModule = () => <AssetSetupPage entity="groups" icon={Users} />
export const InsuranceCompanyModule = () => <AssetSetupPage entity="insurers" icon={ShieldCheck} />
export const AssetTransactionReportModule = () => <AssetTransactionReportPage icon={HandCoins} />

// The "Classic view" copies of the previous asset module's pages.
export const AssetClassicListModule = () => <AssetClassicViewPage view="list" icon={BriefcaseBusiness} />
export const AssetClassicTypesModule = () => <AssetClassicViewPage view="types" icon={Tags} />
export const AssetClassicCategoryModule = () => <AssetClassicViewPage view="categories" icon={FolderTree} />
export const AssetClassicGroupModule = () => <AssetClassicViewPage view="groups" icon={Users} />
export const AssetClassicInsuranceModule = () => <AssetClassicViewPage view="insurers" icon={ShieldCheck} />
