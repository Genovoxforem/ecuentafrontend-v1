import { HandCoins } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useLoanList } from '../banking.queries'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'

// Real via loan/loan-sidebar-list-ajax.php — confirmed genuine JSON, but no
// permission check at all server-side (any logged-in user can call it).
// This is Dolibarr's core loan/ module (llx_loan), NOT the same feature as
// Payroll's own "Employee Loan" (payroll/loan.php, a different table —
// confirmed separately this session).
export function LoanList() {
  const { data: loans, isLoading, isError, error, refetch } = useLoanList()

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <HandCoins size={20} className="text-brand" /> Loan List
      </h2>

      {isLoading && <LegacyLoadingCard label="Loading loans…" />}
      {isError && <LegacyErrorCard title="Couldn't load loans" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {loans && (
        <Card className="!h-auto !p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                <th className="font-medium px-4 py-2">Loan</th>
                <th className="font-medium px-4 py-2">Amount</th>
                <th className="font-medium px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {loans.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-4 text-text-faint italic">
                    No loans found.
                  </td>
                </tr>
              ) : (
                loans.map((l) => (
                  <tr key={l.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 text-text!">{l.label}</td>
                    <td className="px-4 py-2 text-text-muted">{l.amountLabel}</td>
                    <td className="px-4 py-2 text-text-muted">{l.statusLabel}</td>
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
