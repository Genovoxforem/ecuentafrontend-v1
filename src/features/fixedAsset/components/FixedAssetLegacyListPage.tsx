import { useState, type ComponentType } from 'react'
import { InBanner } from '../../../shared/components/layout/bannerSlot'
import { Plus } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'
import { LegacyReportTable } from '../../../shared/components/table/LegacyReportTable'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useAssetTransactionReport, useFixedAssetTable, type FixedAssetListPath } from '../fixedAssetPages.queries'

const HIDDEN_COLUMNS = ['', 'Action', 'Modify']

// Shared by Assets Details, Assets Types, Asset Category, Asset Group and
// Insurance Company — see fixedAssetPages.queries.ts. The "New ..." button is
// inert: creating records goes through legacy POST forms/modals with no JSON
// API, so it is shown (to match the page) but disabled.
export function FixedAssetLegacyListPage({
  path,
  title,
  newLabel,
}: {
  path: FixedAssetListPath
  title: string
  icon: ComponentType<{ size?: number; className?: string }>
  newLabel: string
  showCount?: boolean
}) {
  const { data, isLoading, isError, error, refetch } = useFixedAssetTable(path)

  return (
    <div className="space-y-4">
      <InBanner>
        <button
          type="button"
          disabled
          title="Creating records is not available in this app yet - the backend only offers a classic form for it."
          className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white opacity-60 cursor-not-allowed"
        >
          <Plus size={14} /> {newLabel}
        </button>
      </InBanner>

      {isLoading && <LegacyLoadingCard label={`Loading ${title.toLowerCase()}…`} />}
      {isError && <LegacyErrorCard title={`Couldn't load ${title.toLowerCase()}`} message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}
      {data && <LegacyReportTable title={title} table={data} hiddenColumns={HIDDEN_COLUMNS} />}
    </div>
  )
}

const REPORT_COLUMNS = ['Sl.No', 'Reference', 'Name Of Assets', 'Purchased Date', 'Expiry Date', 'Assets Amount', 'Depreciation %', 'Current Book Value', 'Location', 'Status']

// Real via asset/asset_report.php — Year filter, one row per depreciated
// purchase-invoice asset line for that year.
export function AssetTransactionReportPage({ icon: Icon }: { icon: ComponentType<{ size?: number; className?: string }> }) {
  const [year, setYear] = useState('')
  const [applied, setApplied] = useState<string | null>(null)
  const [error, setError] = useState('')
  const { data, isLoading, isError, error: fetchError, refetch } = useAssetTransactionReport(applied)

  function handleGo() {
    if (!/^\d{4}$/.test(year)) return setError('Select Year is required.')
    setError('')
    setApplied(year)
  }

  function handleClear() {
    setYear('')
    setApplied(null)
    setError('')
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Icon size={20} className="text-brand" /> Asset Area
      </h2>

      <Card className="!h-auto">
        <div className="max-w-sm">
          <Field label="Select Year" required>
            <input type="number" min={1900} max={2200} placeholder="YYYY" value={year} onChange={(e) => setYear(e.target.value)} className={inputClasses} />
          </Field>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <button type="button" onClick={handleGo} className="px-4 py-2 rounded-lg text-sm font-medium bg-brand text-white hover:bg-brand-hover">
            Go
          </button>
          <button type="button" onClick={handleClear} className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-text hover:bg-surface-hover">
            Clear
          </button>
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
      </Card>

      {isLoading && <LegacyLoadingCard label="Loading report…" />}
      {isError && <LegacyErrorCard title="Couldn't load report" message={fetchError instanceof Error ? fetchError.message : 'Unknown error.'} onRetry={() => refetch()} />}
      {!applied && <LegacyReportTable title="Asset Transaction Report" table={{ headers: REPORT_COLUMNS, rows: [] }} />}
      {data && <LegacyReportTable key={applied} title="Asset Transaction Report" table={data} />}
    </div>
  )
}
