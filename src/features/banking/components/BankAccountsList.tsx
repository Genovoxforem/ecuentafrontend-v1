import { Link } from 'react-router-dom'
import { Landmark } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useBankAccountsList } from '../banking.queries'
import { formatMoney } from '../../../utils/format'
import { ROUTES } from '../../../routes'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'

// Real via compta/bank/bank-sidebar-list-ajax.php — confirmed genuine JSON,
// but an orphaned endpoint: the live compta/bank/index.php and list.php
// pages never call it themselves (same "real API sitting unused next to a
// scraped/classic page" pattern this session already found for the General
// Ledger module's listbyaccount_ajax_api.php). No permission check exists
// on this endpoint server-side — any logged-in user can call it.
export function BankAccountsList() {
  const { data: accounts, isLoading, isError, error, refetch } = useBankAccountsList()

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Landmark size={20} className="text-brand" /> Bank Accounts
      </h2>

      {isLoading && <LegacyLoadingCard label="Loading bank accounts…" />}
      {isError && <LegacyErrorCard title="Couldn't load bank accounts" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {accounts && (
        <Card className="!h-auto !p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                <th className="font-medium px-4 py-2">Account</th>
                <th className="font-medium px-4 py-2">Account Number</th>
                <th className="font-medium px-4 py-2">Currency</th>
                <th className="font-medium px-4 py-2 text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-text-faint italic">
                    No bank accounts found.
                  </td>
                </tr>
              ) : (
                accounts.map((a) => (
                  <tr key={a.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 text-text!">
                      <Link to={`${ROUTES.bankingEntries}?account=${a.id}`} className="text-brand hover:underline">
                        {a.label}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-text-muted">{a.accountNumber || '—'}</td>
                    <td className="px-4 py-2 text-text-muted">{a.currencyCode}</td>
                    <td className="px-4 py-2 text-right text-text!">{formatMoney(a.balance)}</td>
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
