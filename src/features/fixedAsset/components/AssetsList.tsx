import { useState } from 'react'
import { BriefcaseBusiness, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useAssetsList } from '../fixedAssets.queries'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'

const PAGE_SIZE = 25

// Real via asset/assets-sidebar-list-ajax.php — see fixedAssets.queries.ts
// for the full evidence trail (a thin, misleadingly-named sidebar-widget
// endpoint, the only real JSON this module has). Only 1 real asset exists
// on this instance today (confirmed: llx_asset has 1 row) — a near-empty
// table here is the honest real state, not a loading/error artifact.
export function AssetsList() {
  const [page, setPage] = useState(0)
  const { data, isLoading, isError, error, refetch } = useAssetsList(page, PAGE_SIZE)

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <BriefcaseBusiness size={20} className="text-brand" /> Assets Details
      </h2>

      {isLoading && <LegacyLoadingCard label="Loading assets…" />}
      {isError && <LegacyErrorCard title="Couldn't load assets" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {data && (
        <>
          <Card className="!h-auto !p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                  <th className="font-medium px-3 py-2">Ref</th>
                  <th className="font-medium px-3 py-2">Label</th>
                  <th className="font-medium px-3 py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-4 text-text-faint italic">
                      No assets found — this module has almost no real records on this instance yet.
                    </td>
                  </tr>
                ) : (
                  data.rows.map((a) => (
                    <tr key={a.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 text-text!">{a.ref}</td>
                      <td className="px-3 py-2 text-text-muted">{a.label}</td>
                      <td className="px-3 py-2 text-text-muted whitespace-nowrap">{a.createdAt}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card>

          <div className="flex items-center justify-between text-sm text-text-muted">
            <span>{data.filtered} assets</span>
            <div className="flex items-center gap-2">
              <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="p-1.5 rounded-md border border-border disabled:opacity-40">
                <ChevronLeft size={14} />
              </button>
              <span>Page {page + 1}</span>
              <button
                type="button"
                disabled={(page + 1) * PAGE_SIZE >= data.filtered}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-md border border-border disabled:opacity-40"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
