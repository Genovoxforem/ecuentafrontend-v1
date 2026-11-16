import type { ComponentType } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { LegacyReportTable } from '../../../shared/components/table/LegacyReportTable'
import { LegacyErrorCard, LegacyLoadingCard } from '../../products/components/LegacyReportStates'
import { CLASSIC_HIDDEN_COLUMNS, CLASSIC_VIEWS, useClassicAssetView, type ClassicAssetView } from '../assetClassicView.data'
import { GHOST_BTN } from '../assetUiHelpers'
import { PageHeading } from './AssetUi'

// The "Classic view" of the asset pages: the previous asset module's page (asset_old/...), shown here with its own columns and rows. It is a
// read view; adding and editing happen on the new pages, which work on the same records.
export function AssetClassicViewPage({ view, icon }: { view: ClassicAssetView; icon: ComponentType<{ size?: number; className?: string }> }) {
  const { title, newPage } = CLASSIC_VIEWS[view]
  const { data, isLoading, isError, error, refetch } = useClassicAssetView(view)

  return (
    <div className="space-y-4">
      <PageHeading
        icon={icon}
        title={title}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {/* the previous module's Asset Area page is where its yearly depreciation report lived (asset/fapi/asset_report.php) */}
            {view === 'list' && (
              <Link to={ROUTES.fixedAssetTransactionReport} className={GHOST_BTN}>
                Asset transaction report
              </Link>
            )}
            <Link to={newPage} className={GHOST_BTN}>
              <ArrowLeft size={14} /> New view
            </Link>
          </div>
        }
      >
        The previous version of this page. Adding and editing are on the new page.
      </PageHeading>

      {isLoading && <LegacyLoadingCard label={`Loading ${title.toLowerCase()}…`} />}
      {isError && <LegacyErrorCard title={`Couldn't load ${title.toLowerCase()}`} message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}
      {/* the classic theme capitalises the words of every table cell (not the page's own text, such as the "Showing x to y" line) */}
      {data && (
        <div className="[&_td]:capitalize">
          <LegacyReportTable title={title} table={data} hiddenColumns={CLASSIC_HIDDEN_COLUMNS} />
        </div>
      )}
    </div>
  )
}
