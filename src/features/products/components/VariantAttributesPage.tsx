import { SlidersHorizontal } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useVariantAttributesReport } from '../products.queries'
import { LegacyLoadingCard, LegacyErrorCard } from './LegacyReportStates'
import { extractQueryParam } from '../productLegacyParsers'
import { ROUTES } from '../../../routes'

const COLUMNS = ['Ref', 'Label', '# of Different Values', '# of Linked Products']

// Real data scraped from variants/list.php (no REST equivalent) — see
// productLegacyParsers.ts / useVariantAttributesReport.
export function VariantAttributesPage() {
  const { data: rows, isLoading, isError, error, refetch } = useVariantAttributesReport()

  return (
    <div className="space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <SlidersHorizontal size={20} className="text-brand" /> Variant Attributes for Products
      </h2>

      {isError && <LegacyErrorCard title="Couldn't load variant attributes" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}
      {isLoading && <LegacyLoadingCard label="Loading real variant attributes from the legacy backend…" />}

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
                      No variant attributes defined yet.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.ref} className="border-b border-border hover:bg-surface-hover">
                      <td className="px-3 py-2.5">
                        {extractQueryParam(row.url, 'id') ? (
                          <Link to={ROUTES.productVariantAttributeDetail.replace(':id', extractQueryParam(row.url, 'id')!)} className="text-brand hover:underline font-medium">
                            {row.ref}
                          </Link>
                        ) : (
                          row.ref
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-text!">{row.label}</td>
                      <td className="px-3 py-2.5 text-text-muted text-right tabular-nums">{row.valuesCount}</td>
                      <td className="px-3 py-2.5 text-text-muted text-right tabular-nums">{row.productsCount}</td>
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
