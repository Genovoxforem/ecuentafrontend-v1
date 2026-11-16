import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { useAllMembers, type MemberRow } from '../members.queries'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'

const PAGE_SIZES = [10, 25, 50, 100]

type SortKey = 'ref' | 'firstname' | 'lastname' | 'company' | 'login' | 'nature' | 'type' | 'email' | 'endOfSubscription' | 'status'

function sortValue(m: MemberRow, key: SortKey): string | number {
  return m[key]
}

// "End Subscription" is a date the list prints as the backend formats it; a member is up to date when it is still ahead.
function endTime(m: MemberRow): number | null {
  const t = new Date(m.endOfSubscription).getTime()
  return Number.isNaN(t) ? null : t
}

// The classic list is adherents/list.php; its status and "filter" query words (statut=-1|0|1, filter=uptodate|outofdate) are the ones the
// Members area tiles link with, so the same links work here: ?status=-1 draft, ?status=1 validated, ?status=0 terminated, plus
// &filter=uptodate or &filter=outofdate on the validated ones.
export function MembersList() {
  const [params] = useSearchParams()
  const status = params.get('status')
  const validity = params.get('filter')
  const { data, isLoading, isError, error, refetch } = useAllMembers()
  const [search, setSearch] = useState('')
  const [perPage, setPerPage] = useState(25)
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const now = Date.now()
    return (data?.rows ?? []).filter((m) => {
      if (status !== null && String(m.statusCode) !== status) return false
      if (validity === 'uptodate' || validity === 'outofdate') {
        const end = endTime(m)
        const upToDate = end !== null && end + 86_399_000 >= now
        if (m.statusCode !== 1 || (validity === 'uptodate') !== upToDate) return false
      }
      return !q || [m.ref, m.firstname, m.lastname, m.company, m.login, m.nature, m.type, m.email, m.status].some((v) => v.toLowerCase().includes(q))
    })
  }, [data, search, status, validity])

  const { sorted, sort, toggleSort } = useSortableRows<MemberRow, SortKey>(filtered, sortValue)
  const pageRows = sorted.slice((page - 1) * perPage, page * perPage)

  function getExportData() {
    return {
      headers: ['Ref', 'First Name', 'Last Name', 'Company', 'Login', 'Nature Of Member', 'Type', 'Email', 'End Subscription', 'Status'],
      rows: sorted.map((m) => [m.ref, m.firstname, m.lastname, m.company, m.login, m.nature, m.type, m.email, m.endOfSubscription, m.status]),
    }
  }

  return (
    <div className="space-y-4">
      {isLoading && <LegacyLoadingCard label="Loading members…" />}
      {isError && <LegacyErrorCard title="Couldn't load members" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {data && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-text-muted">
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value))
                  setPage(1)
                }}
                className="h-9 rounded-md border border-input-border bg-input-bg px-2 text-sm text-text outline-none focus:ring-2 focus:ring-brand/30"
              >
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              entries
            </label>
            <div className="flex items-center gap-3">
              <TableExportButtons title="Members" getExportData={getExportData} />
              <label className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint" />
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  placeholder="Search"
                  className="h-9 w-56 rounded-md border border-input-border bg-input-bg pl-9 pr-3 text-sm text-text outline-none focus:ring-2 focus:ring-brand/30"
                />
              </label>
            </div>
          </div>

          <Card className="!h-auto !p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <TheadRow>
                  <Th sortKey="ref" sort={sort} onSort={toggleSort}>Ref.</Th>
                  <Th sortKey="firstname" sort={sort} onSort={toggleSort}>First Name</Th>
                  <Th sortKey="lastname" sort={sort} onSort={toggleSort}>Last Name</Th>
                  <Th sortKey="company" sort={sort} onSort={toggleSort}>Company</Th>
                  <Th sortKey="login" sort={sort} onSort={toggleSort}>Login</Th>
                  <Th sortKey="nature" sort={sort} onSort={toggleSort}>Nature Of Member</Th>
                  <Th sortKey="type" sort={sort} onSort={toggleSort}>Type</Th>
                  <Th sortKey="email" sort={sort} onSort={toggleSort}>Email</Th>
                  <Th sortKey="endOfSubscription" sort={sort} onSort={toggleSort}>End Subscription</Th>
                  <Th sortKey="status" sort={sort} onSort={toggleSort}>Status</Th>
                </TheadRow>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-6 text-center text-text-faint">
                      No Data Available In Table
                    </td>
                  </tr>
                ) : (
                  pageRows.map((m, i) => (
                    <tr key={`${m.ref}-${i}`} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 text-text!">{m.ref}</td>
                      <td className="px-3 py-2 text-text-muted">{m.firstname}</td>
                      <td className="px-3 py-2 text-text-muted">{m.lastname}</td>
                      <td className="px-3 py-2 text-text-muted">{m.company}</td>
                      <td className="px-3 py-2 text-text-muted">{m.login}</td>
                      <td className="px-3 py-2 text-text-muted">{m.nature}</td>
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

          {/* With rows the pagination bar prints "Showing x to y of z entries" itself; it draws nothing for an empty list, which the classic one still counts. */}
          {sorted.length === 0 ? (
            <p className="text-sm text-text-muted">Showing 0 to 0 of 0 entries</p>
          ) : (
            <ListPagination page={page} perPage={perPage} total={sorted.length} onPageChange={setPage} />
          )}
        </>
      )}
    </div>
  )
}
