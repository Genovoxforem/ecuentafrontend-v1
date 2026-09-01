import { useState } from 'react'
import { BriefcaseBusiness } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { useAssetsList, type AssetRow } from '../fixedAssets.queries'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'

const PAGE_SIZE = 25

type SortKey = 'ref' | 'label' | 'createdAt'

function sortValue(a: AssetRow, key: SortKey): string | number {
  switch (key) {
    case 'ref':
      return a.ref
    case 'label':
      return a.label
    case 'createdAt':
      return a.createdAt
  }
}

// Real via asset/assets-sidebar-list-ajax.php — see fixedAssets.queries.ts
// for the full evidence trail (a thin, misleadingly-named sidebar-widget
// endpoint, the only real JSON this module has). Only 1 real asset exists
// on this instance today (confirmed: llx_asset has 1 row) — a near-empty
// table here is the honest real state, not a loading/error artifact.
export function AssetsList() {
  const [page, setPage] = useState(0)
  const { data, isLoading, isError, error, refetch } = useAssetsList(page, PAGE_SIZE)
  const rows = data?.rows ?? []
  const { sorted: sortedRows, sort, toggleSort } = useSortableRows<AssetRow, SortKey>(rows, sortValue)

  function getExportData() {
    return { headers: ['Ref', 'Label', 'Created'], rows: sortedRows.map((a) => [a.ref, a.label, a.createdAt]) }
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <BriefcaseBusiness size={20} className="text-brand" /> Assets Details
      </h2>

      {isLoading && <LegacyLoadingCard label="Loading assets…" />}
      {isError && <LegacyErrorCard title="Couldn't load assets" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {data && (
        <>
          <div className="flex justify-end">
            <TableExportButtons title="Assets Details" getExportData={getExportData} />
          </div>

          <Card className="!h-auto !p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <TheadRow>
                  <Th sortKey="ref" sort={sort} onSort={toggleSort}>Ref</Th>
                  <Th sortKey="label" sort={sort} onSort={toggleSort}>Label</Th>
                  <Th sortKey="createdAt" sort={sort} onSort={toggleSort}>Created</Th>
                </TheadRow>
              </thead>
              <tbody>
                {sortedRows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-4 text-text-faint italic">
                      No assets found — this module has almost no real records on this instance yet.
                    </td>
                  </tr>
                ) : (
                  sortedRows.map((a) => (
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

          <ListPagination page={page + 1} perPage={PAGE_SIZE} total={data.filtered} onPageChange={(p) => setPage(p - 1)} />
        </>
      )}
    </div>
  )
}
