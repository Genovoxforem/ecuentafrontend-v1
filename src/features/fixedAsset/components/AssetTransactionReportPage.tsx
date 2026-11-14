import { useState, type ComponentType } from 'react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'
import { LegacyReportTable } from '../../../shared/components/table/LegacyReportTable'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { ASSET_REPORT_COLUMNS, useAssetTransactionReport } from '../fixedAssetPages.queries'

// The yearly asset depreciation report of the previous asset module (asset_old/asset_report.php) on asset/fapi/asset_report.php: a Year filter and
// one row per depreciated purchase-invoice asset line of that year, in the classic's 10 columns.
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
      {!applied && <LegacyReportTable title="Asset Transaction Report" table={{ headers: ASSET_REPORT_COLUMNS, rows: [] }} />}
      {/* A backend before 13 Nov 2026 (BUG-138) answered the current year for a year it does not accept (abc, 1899); newer ones refuse it with a 422, shown above. */}
      {data && String(data.year) !== applied && (
        <p role="status" className="rounded-lg border border-warning/30 bg-warning-bg px-4 py-2.5 text-sm text-warning-fg">
          The backend built this report for {data.year}, not {applied}.
        </p>
      )}
      {data && <LegacyReportTable key={applied} title="Asset Transaction Report" table={data} />}
    </div>
  )
}
