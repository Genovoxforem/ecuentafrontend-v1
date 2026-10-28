import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Layers } from 'lucide-react'
import { Card } from '../../../../shared/components/dashboard/DashboardKit'
import { ROUTES } from '../../../../routes'
import { LegacyLoadingCard, LegacyErrorCard } from '../../../products/components/LegacyReportStates'
import { useGroupAccounts } from '../../personalizedGroups.queries'

// The accounts of one personalized group: the classic "List of accounts" page (accountancy/admin/categories.php?action=display),
// read from accountancy/fapi/personalized_groups.php. The classic page also adds and removes accounts; those writes are not available here yet.
export function PersonalizedGroupAccountsPage() {
  const { id = '' } = useParams<{ id: string }>()
  const { data, isLoading, isError, error, refetch } = useGroupAccounts(Number(id))
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link to={ROUTES.ledgerPersonalizedGroups} className="flex items-center gap-1 text-sm text-text-muted hover:text-brand">
          <ArrowLeft size={14} /> Personalized Groups
        </Link>
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Layers size={20} className="text-brand" /> {data ? `${data.group.code} — ${data.group.label}` : 'Accounts Of The Group'}
        </h2>
      </div>

      {isLoading && <LegacyLoadingCard label="Loading the accounts…" />}
      {isError && <LegacyErrorCard title="Couldn't load the group" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}
      {data && (
        <>
          <Card className="!h-auto text-sm text-text">
            <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1">
              <dt className="text-text-faint">Country</dt>
              <dd>{data.group.country || '—'}</dd>
              <dt className="text-text-faint">Calculated</dt>
              <dd>{data.group.calculated ? `Yes — ${data.group.formula}` : 'No'}</dd>
              <dt className="text-text-faint">Status</dt>
              <dd>{data.group.active ? 'Active' : 'Disabled'}</dd>
            </dl>
          </Card>
          <Card className="!h-auto !p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                    <th className="font-medium px-3 py-2">Accounting account</th>
                    <th className="font-medium px-3 py-2">Label</th>
                  </tr>
                </thead>
                <tbody>
                  {data.accounts.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-3 py-4 text-text-faint italic">
                        {data.group.calculated ? 'A calculated group has no accounts of its own.' : 'No account is linked to this group.'}
                      </td>
                    </tr>
                  ) : (
                    data.accounts.map((a) => (
                      <tr key={a.number} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 tabular-nums text-text">{a.number}</td>
                        <td className="px-3 py-2 text-text-muted">{a.label}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
          <p className="text-xs text-text-faint">Adding and removing accounts is not available in this app yet.</p>
        </>
      )}
    </div>
  )
}
