import { Hash, ExternalLink } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { resolveBackendAsset } from '../../../api/backends'
import { useLotSerialsReport } from '../products.queries'
import { LegacyLoadingCard, LegacyErrorCard } from './LegacyReportStates'

const COLUMNS = ['Lot/Serial', 'Product', 'Sell-by Date', 'Eat-by Date', 'Creation Date']

// Real data scraped from product/stock/productlot_list.php (no REST
// equivalent) — see productLegacyParsers.ts / useLotSerialsReport.
export function LotsSerialsPage() {
  const { data: rows, isLoading, isError, error, refetch } = useLotSerialsReport()

  return (
    <div className="space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Hash size={20} className="text-brand" /> List Of Lot/Serials
      </h2>

      {isError && <LegacyErrorCard title="Couldn't load lots/serials" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}
      {isLoading && <LegacyLoadingCard label="Loading real lot/serial records from the legacy backend…" />}

      {rows && (
        <Card className="!p-0 !h-auto overflow-hidden">
          <div className="overflow-auto max-h-[70vh]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                  {COLUMNS.map((col) => (
                    <th key={col} className="font-medium px-3 py-2.5 whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td className="px-3 py-4 text-text-faint italic" colSpan={COLUMNS.length}>
                      No lot/serial records found.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, i) => (
                    <tr key={`${row.lotSerial}-${row.productRef}-${i}`} className="border-b border-border hover:bg-surface-hover">
                      <td className="px-3 py-2.5">
                        {row.lotSerialUrl ? (
                          <a href={resolveBackendAsset(row.lotSerialUrl)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-brand hover:underline font-medium">
                            {row.lotSerial}
                            <ExternalLink size={10} className="text-text-faint" />
                          </a>
                        ) : (
                          row.lotSerial
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {row.productUrl ? (
                          <a href={resolveBackendAsset(row.productUrl)} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                            {row.productLabel}
                          </a>
                        ) : (
                          <span className="text-text!">{row.productLabel}</span>
                        )}
                        {row.productRef && <span className="block text-xs text-text-faint">Ref: {row.productRef}</span>}
                      </td>
                      <td className="px-3 py-2.5 text-text-muted whitespace-nowrap">{row.sellByDate || '-'}</td>
                      <td className="px-3 py-2.5 text-text-muted whitespace-nowrap">{row.eatByDate || '-'}</td>
                      <td className="px-3 py-2.5 text-text-muted whitespace-nowrap">{row.creationDate || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
