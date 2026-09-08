import { HandCoins, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '../../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../../products/components/LegacyReportStates'
import { useLoansList } from '../../generalLedgerAccounting.queries'
import { ROUTES } from '../../../../routes'

// loan/list.php itself has no JSON API, but its own side-panel widget
// (loan/loan-sidebar-list-ajax.php) does — see useLoansList's own comment
// for how that was confirmed real and reused here. Third Party/Date
// Start/Valid Date are real columns the endpoint's SQL selects but never
// serializes into its JSON output, so those stay out rather than guessed.
export function EmployeeLoansList() {
  const { data: rows, isLoading, isError, error, refetch } = useLoansList()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <HandCoins size={20} className="text-brand" /> Employee Loans
        </h2>
        <Link to={ROUTES.ledgerLoanCreate} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover">
          <Plus size={14} /> New Loan
        </Link>
      </div>

      {isLoading && <LegacyLoadingCard label="Loading loans…" />}
      {isError && <LegacyErrorCard title="Couldn't load loans" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {rows && (
        <Card className="!h-auto !p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                <th className="font-medium px-3 py-2">Label</th>
                <th className="font-medium px-3 py-2">Capital</th>
                <th className="font-medium px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-4 text-text-faint italic">
                    No loans recorded yet.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 text-text! font-medium">{r.label}</td>
                    <td className="px-3 py-2 text-text-muted">{r.capital}</td>
                    <td className="px-3 py-2 text-text-muted">{r.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
