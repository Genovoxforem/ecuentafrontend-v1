import { useState } from 'react'
import { Users } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { useMembersList, type MemberRow } from '../members.queries'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'

const PAGE_SIZE = 25

type SortKey = 'ref' | 'firstname' | 'lastname' | 'company' | 'login' | 'type' | 'email' | 'endOfSubscription' | 'status'

function sortValue(m: MemberRow, key: SortKey): string | number {
  return m[key]
}

// Real via adherents/ajax/ajax_adherents_list.php — see members.queries.ts
// for the full evidence trail. This module has zero real members on this
// instance today (confirmed: 0 rows in llx_adherent) — an empty table here
// is the honest real state, not a loading/error artifact.
export function MembersList() {
  const [page, setPage] = useState(0)
  const { data, isLoading, isError, error, refetch } = useMembersList(page, PAGE_SIZE)
  const rows = data?.rows ?? []
  const { sorted: sortedRows, sort, toggleSort } = useSortableRows<MemberRow, SortKey>(rows, sortValue)

  function getExportData() {
    return {
      headers: ['Ref', 'First Name', 'Last Name', 'Company', 'Login', 'Type', 'Email', 'End Of Subscription', 'Status'],
      rows: sortedRows.map((m) => [m.ref, m.firstname, m.lastname, m.company, m.login, m.type, m.email, m.endOfSubscription, m.status]),
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Users size={20} className="text-brand" /> Members
      </h2>

      {isLoading && <LegacyLoadingCard label="Loading members…" />}
      {isError && <LegacyErrorCard title="Couldn't load members" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {data && (
        <>
          <div className="flex justify-end">
            <TableExportButtons title="Members" getExportData={getExportData} />
          </div>

          <Card className="!h-auto !p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <TheadRow>
                  <Th sortKey="ref" sort={sort} onSort={toggleSort}>Ref</Th>
                  <Th sortKey="firstname" sort={sort} onSort={toggleSort}>First Name</Th>
                  <Th sortKey="lastname" sort={sort} onSort={toggleSort}>Last Name</Th>
                  <Th sortKey="company" sort={sort} onSort={toggleSort}>Company</Th>
                  <Th sortKey="login" sort={sort} onSort={toggleSort}>Login</Th>
                  <Th sortKey="type" sort={sort} onSort={toggleSort}>Type</Th>
                  <Th sortKey="email" sort={sort} onSort={toggleSort}>Email</Th>
                  <Th sortKey="endOfSubscription" sort={sort} onSort={toggleSort}>End Of Subscription</Th>
                  <Th sortKey="status" sort={sort} onSort={toggleSort}>Status</Th>
                </TheadRow>
              </thead>
              <tbody>
                {sortedRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-4 text-text-faint italic">
                      No members found — this module has no real records on this instance yet.
                    </td>
                  </tr>
                ) : (
                  sortedRows.map((m, i) => (
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

          <ListPagination page={page + 1} perPage={PAGE_SIZE} total={data.filtered} onPageChange={(p) => setPage(p - 1)} />
        </>
      )}
    </div>
  )
}
