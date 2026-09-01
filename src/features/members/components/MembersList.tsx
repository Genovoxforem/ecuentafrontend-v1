import { useState } from 'react'
import { Users, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useMembersList } from '../members.queries'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'

const PAGE_SIZE = 25

// Real via adherents/ajax/ajax_adherents_list.php — see members.queries.ts
// for the full evidence trail. This module has zero real members on this
// instance today (confirmed: 0 rows in llx_adherent) — an empty table here
// is the honest real state, not a loading/error artifact.
export function MembersList() {
  const [page, setPage] = useState(0)
  const { data, isLoading, isError, error, refetch } = useMembersList(page, PAGE_SIZE)

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Users size={20} className="text-brand" /> Members
      </h2>

      {isLoading && <LegacyLoadingCard label="Loading members…" />}
      {isError && <LegacyErrorCard title="Couldn't load members" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {data && (
        <>
          <Card className="!h-auto !p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                  <th className="font-medium px-3 py-2">Ref</th>
                  <th className="font-medium px-3 py-2">First Name</th>
                  <th className="font-medium px-3 py-2">Last Name</th>
                  <th className="font-medium px-3 py-2">Company</th>
                  <th className="font-medium px-3 py-2">Login</th>
                  <th className="font-medium px-3 py-2">Type</th>
                  <th className="font-medium px-3 py-2">Email</th>
                  <th className="font-medium px-3 py-2">End Of Subscription</th>
                  <th className="font-medium px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-4 text-text-faint italic">
                      No members found — this module has no real records on this instance yet.
                    </td>
                  </tr>
                ) : (
                  data.rows.map((m, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 text-text!">{m.ref}</td>
                      <td className="px-3 py-2 text-text-muted">{m.firstname}</td>
                      <td className="px-3 py-2 text-text-muted">{m.lastname}</td>
                      <td className="px-3 py-2 text-text-muted">{m.company}</td>
                      <td className="px-3 py-2 text-text-muted">{m.login}</td>
                      <td className="px-3 py-2 text-text-muted">{m.type}</td>
                      <td className="px-3 py-2 text-text-muted">{m.email}</td>
                      <td className="px-3 py-2 text-text-muted whitespace-nowrap">{m.endOfSubscription}</td>
                      <td className="px-3 py-2">
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-neutral-bg text-neutral-fg">{m.status}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card>

          <div className="flex items-center justify-between text-sm text-text-muted">
            <span>{data.filtered} members</span>
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
