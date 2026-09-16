import { ListTree } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useBankBudget } from '../banking.queries'

// compta/bank/budget.php — no JSON API (confirmed live), a plain read-only
// report breaking down every tagged bank entry's debit/credit by
// Tag/Category. See bankBudgetParser.ts.
export function BankEntriesByCategory() {
  const { data, isLoading, isError, error, refetch } = useBankBudget()

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <ListTree size={20} className="text-brand" /> Bank entries by categories
      </h2>

      {isLoading && <LegacyLoadingCard label="Loading…" />}
      {isError && <LegacyErrorCard title="Couldn't load this report" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {data && (
        <Card className="!p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-alt">
                <th className="px-3 py-2 text-left font-medium text-text-muted">Tag/Category</th>
                <th className="px-3 py-2 text-right font-medium text-text-muted">Nb</th>
                <th className="px-3 py-2 text-right font-medium text-text-muted">Total</th>
                <th className="px-3 py-2 text-right font-medium text-text-muted">Average</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-text-faint italic">
                    No tagged entries found.
                  </td>
                </tr>
              ) : (
                data.rows.map((r, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 text-text!">{r.category}</td>
                    <td className="px-3 py-2 text-right text-text-muted">{r.count}</td>
                    <td className="px-3 py-2 text-right text-text-muted">{r.total}</td>
                    <td className="px-3 py-2 text-right text-text-muted">{r.average}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-surface-alt font-semibold">
                <td colSpan={2} className="px-3 py-2 text-right text-text!">
                  Total
                </td>
                <td className="px-3 py-2 text-right text-text!">{data.totalTotal}</td>
                <td className="px-3 py-2 text-right text-text!">{data.totalAverage}</td>
              </tr>
            </tfoot>
          </table>
        </Card>
      )}
    </div>
  )
}
