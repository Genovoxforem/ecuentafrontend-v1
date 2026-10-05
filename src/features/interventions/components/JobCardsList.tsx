import { useDeferredValue, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Wrench, ClipboardList, CalendarCheck, Building2, Car, Search, Plus } from 'lucide-react'
import { Card, ICON_STYLES } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { LegacyErrorCard, LegacyLoadingCard } from '../../products/components/LegacyReportStates'
import { ROUTES } from '../../../routes'
import { useJobCards, useJobCardStats, type JobCardRow } from '../jobCardList.queries'

const PAGE_SIZES = [15, 25, 50, 100]

type SortKey = 'ref' | 'company' | 'description' | 'allottedTo' | 'dateIn' | 'dateOut' | 'created' | 'status'

// "05/28/2026 10:39 AM" -> sortable "2026-05-28 10:39 AM".
const sortableDate = (us: string) => us.replace(/^(\d{2})\/(\d{2})\/(\d{4})/, '$3-$1-$2')

function sortValue(r: JobCardRow, key: SortKey): string | number {
  switch (key) {
    case 'ref':
      return r.id
    case 'company':
      return r.company
    case 'description':
      return r.description
    case 'allottedTo':
      return r.allottedTo
    case 'dateIn':
      return sortableDate(r.dateIn)
    case 'dateOut':
      return sortableDate(r.dateOut)
    case 'created':
      return sortableDate(r.createdOn)
    case 'status':
      return r.status
  }
}

const STAT_ICONS = [
  { icon: ClipboardList, style: ICON_STYLES.blue },
  { icon: CalendarCheck, style: ICON_STYLES.green },
  { icon: Building2, style: ICON_STYLES.violet },
  { icon: Car, style: ICON_STYLES.amber },
]

function statusClasses(code: number | null) {
  if (code === 0) return 'bg-neutral-bg text-neutral-fg'
  if (code === 1) return 'bg-warning-bg text-warning-fg'
  if (code === 2 || code === 3) return 'bg-success-bg text-success-fg'
  return 'bg-info-bg text-info-fg'
}

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  return ((words[0]?.[0] ?? '') + (words[1]?.[0] ?? words[0]?.[1] ?? '')).toUpperCase()
}

// The Ticket menu's "Intervention" page: the classic "List of JobCards"
// (fichinter/list.php) — its cards and every job card, read live (see
// jobCardList.queries.ts). The classic job card page itself (fichinter/card.php)
// has no React counterpart yet, so refs are shown as text, never as a backend link.
export function JobCardsList() {
  const { data, isLoading, isError, error, refetch } = useJobCards()
  const { data: stats } = useJobCardStats()
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)

  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase()
    const rows = data?.rows ?? []
    if (!q) return rows
    return rows.filter((r) => [r.ref, r.company, r.companySubtitle, r.description, r.allottedTo, r.createdBy, r.status].some((v) => v.toLowerCase().includes(q)))
  }, [data, deferredSearch])
  const { sorted, sort, toggleSort } = useSortableRows<JobCardRow, SortKey>(filtered, sortValue)
  const pageRows = sorted.slice((page - 1) * perPage, page * perPage)

  function getExportData() {
    return {
      headers: ['Ref', 'Company', 'Description', 'Job Allotted To', 'In Date Time', 'Out Date Time', 'Created By', 'Created On', 'Status'],
      rows: sorted.map((r) => [r.ref, r.company, r.description, r.allottedTo, r.dateIn, r.dateOut, r.createdBy, r.createdOn, r.status]),
    }
  }

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Wrench size={20} className="text-brand" /> List of JobCards
        </h2>
        <Link to={ROUTES.jobCardCreate} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          <Plus size={14} /> New Intervention
        </Link>
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {(stats ?? []).map((s, i) => {
            const { icon: Icon, style } = STAT_ICONS[i % STAT_ICONS.length]
            return (
              <Card key={s.title} className="!p-3 !flex-row items-center justify-between gap-3 !h-auto">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">{s.title}</p>
                  <p className="text-xl font-bold text-text! mt-1">{s.value}</p>
                  <p className="text-xs text-text-faint mt-0.5">{s.sub}</p>
                </div>
                <span className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${style}`}>
                  <Icon size={20} />
                </span>
              </Card>
            )
          })}
        </div>

        {isLoading && <LegacyLoadingCard label="Loading job cards…" />}
        {isError && <LegacyErrorCard title="Couldn't load job cards" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

        {data && (
          <Card className="!p-0 overflow-hidden flex-1 min-h-0">
            <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value))
                  setPage(1)
                }}
                className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5"
              >
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <div className="relative w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  placeholder="Search Job Cards"
                  className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text pl-8 pr-3 py-1.5"
                />
              </div>
              <TableExportButtons title="Job Cards" getExportData={getExportData} />
            </div>
            <div className="flex-1 min-h-0 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <TheadRow>
                    <Th sortKey="ref" sort={sort} onSort={toggleSort}>Ref</Th>
                    <Th sortKey="company" sort={sort} onSort={toggleSort}>Company</Th>
                    <Th sortKey="description" sort={sort} onSort={toggleSort}>Description</Th>
                    <Th sortKey="allottedTo" sort={sort} onSort={toggleSort}>Job Allotted To</Th>
                    <Th sortKey="dateIn" sort={sort} onSort={toggleSort}>In Date Time</Th>
                    <Th sortKey="dateOut" sort={sort} onSort={toggleSort}>Out Date Time</Th>
                    <Th sortKey="created" sort={sort} onSort={toggleSort}>Created</Th>
                    <Th sortKey="status" sort={sort} onSort={toggleSort}>Status</Th>
                  </TheadRow>
                </thead>
                <tbody>
                  {pageRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-4 text-text-faint italic">
                        No job cards found.
                      </td>
                    </tr>
                  ) : (
                    pageRows.map((r) => (
                      <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface-hover align-top">
                        <td className="px-4 py-3 font-medium text-text whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5">
                            <Car size={13} className="text-brand shrink-0" /> {r.ref}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {r.companyId ? (
                            <Link to={ROUTES.customerDetail.replace(':id', String(r.companyId))} className="inline-flex items-center gap-2 text-brand hover:underline capitalize">
                              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand text-[11px] font-bold text-white">{initials(r.company)}</span>
                              {r.company}
                            </Link>
                          ) : (
                            <span className="text-text capitalize">{r.company}</span>
                          )}
                          {r.companySubtitle && <div className="text-xs text-text-faint pl-9">{r.companySubtitle}</div>}
                        </td>
                        <td className="px-4 py-3 text-text-muted capitalize">{r.description}</td>
                        <td className="px-4 py-3">
                          {r.allottedTo ? (
                            r.allottedToId ? (
                              <Link to={ROUTES.userDetail.replace(':id', String(r.allottedToId))} className="text-brand hover:underline capitalize">
                                {r.allottedTo}
                              </Link>
                            ) : (
                              <span className="capitalize">{r.allottedTo}</span>
                            )
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-text-muted whitespace-nowrap">{r.dateIn}</td>
                        <td className="px-4 py-3 text-text-muted whitespace-nowrap">{r.dateOut}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-text capitalize">{r.createdBy}</div>
                          <div className="text-xs text-text-faint">{r.createdOn}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusClasses(r.statusBadge)}`}>{r.status}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {data && <ListPagination page={page} perPage={perPage} total={sorted.length} onPageChange={setPage} edgeToEdge />}
    </div>
  )
}
