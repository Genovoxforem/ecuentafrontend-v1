import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, CheckCheck } from 'lucide-react'
import { StickyListLayout, ScrollCard, STICKY_THEAD } from '../../../shared/components/layout/StickyListLayout'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { useExpenseListStats, useExpenseReportsList, type ExpenseListFilters } from '../expenses.queries'
import type { ExpenseListStats, StatBucket } from '../expenseJsonSource'
import { controlCls } from '../expenseTable'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { PaidBadge, PartyLink, PerPageSelect, SearchBox, SortTh, StatusBadge } from './expenseParts'
import { ROUTES } from '../../../routes'

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: '0', label: 'Draft' },
  { value: '2', label: 'Submitted' },
  { value: '5', label: 'Approved' },
  { value: '6', label: 'Paid' },
  { value: '4', label: 'Cancelled' },
  { value: '99', label: 'Refused' },
]

// The columns the backend's own table sorts by (named like the item's fields; the fapi list takes the same names). Linked To, Paid and
// Notes are not sortable on the backend's own table either.
const COLUMNS: {
  key: string
  label: string
  sort?: string
  align?: 'right'
}[] = [
  { key: 'ref', label: 'Ref', sort: 'ref' },
  { key: 'linked', label: 'Linked To' },
  { key: 'user', label: 'User', sort: 'user' },
  { key: 'period', label: 'Period', sort: 'date_debut' },
  { key: 'created', label: 'Created', sort: 'date_create' },
  { key: 'amount', label: 'Amount', sort: 'total_ttc', align: 'right' },
  { key: 'status', label: 'Status', sort: 'status' },
  { key: 'paid', label: 'Paid' },
  { key: 'notes', label: 'Notes' },
]

const money = (n: number) =>
  n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

// The four tiles above the list (expense/list.php): totals over every report, whatever the filters say.
function StatTiles({ stats }: { stats: ExpenseListStats }) {
  const tiles: {
    title: string
    main: StatBucket
    sub?: { label: string; value: StatBucket }[]
  }[] = [
    { title: 'Total expenses', main: stats.total },
    { title: 'Validated', main: stats.validated },
    {
      title: 'Approval',
      main: stats.approved,
      sub: [
        { label: 'Approved', value: stats.approved },
        { label: 'Unapproved', value: stats.unapproved },
      ],
    },
    {
      title: 'Payment',
      main: stats.paid,
      sub: [
        { label: 'Paid', value: stats.paid },
        { label: 'Unpaid', value: stats.unpaid },
      ],
    },
  ]
  return (
    <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.title} className="rounded-lg border border-border bg-surface p-3">
          <div className="text-xs text-text-muted">{t.title}</div>
          {t.sub ? (
            <div className="mt-1 space-y-0.5 text-sm">
              {t.sub.map((x) => (
                <div key={x.label} className="flex items-baseline justify-between gap-2">
                  <span className="text-text-muted">{x.label}</span>
                  <span className="tabular-nums text-text!">
                    <b>{x.value.count}</b> ({money(x.value.amount)})
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-1">
              <span className="text-xl font-bold text-text!">{t.main.count}</span>
              <span className="ml-2 text-sm tabular-nums text-text-muted">{money(t.main.amount)}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// Waits for typing to pause before the search goes to the server.
function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

// expense/list.php: every expense report, searched, sorted and paged by the backend
// (expense/ajax/expense_list.php), newest first.
export function ExpenseReportsList() {
  const [status, setStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const search = useDebounced(searchInput.trim())
  const [perPage, setPerPage] = useState(20)
  const [page, setPage] = useState(0)
  const [sort, setSort] = useState<{ by: string; dir: 'asc' | 'desc' }>({
    by: 'date_create',
    dir: 'desc',
  })

  const filters: ExpenseListFilters = {
    status,
    dateFrom,
    dateTo,
    search,
    orderBy: sort.by,
    orderDir: sort.dir,
  }
  const { data, isLoading, isError, error, refetch, isFetching } = useExpenseReportsList(filters, page, perPage)
  const rows = data?.rows ?? []
  const stats = useExpenseListStats().data

  const restart =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v)
      setPage(0)
    }
  const toggleSort = (by: string) => {
    setSort((s) => (s.by === by ? { by, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { by, dir: 'asc' }))
    setPage(0)
  }

  // What is on screen, as the backend's Copy / CSV / Excel / Print / PDF buttons export it.
  const getExportData = () => ({
    headers: ['Ref', 'User', 'Start Date', 'End Date', 'Created', 'Amount HT', 'VAT', 'Amount TTC', 'Status', 'Notes'],
    rows: rows.map((r) => [r.ref, r.userParty?.name ?? r.user, r.dateStart, r.dateEnd, r.dateCreate, r.totalHt, r.totalTva, r.totalTtc, r.status, r.notes]),
  })

  return (
    <StickyListLayout
      header={
        <>
          <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
            <CheckCheck size={20} className="text-brand" /> Expense List
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            {data && <TableExportButtons title="Expense List" getExportData={getExportData} />}
            <PerPageSelect value={perPage} onChange={restart(setPerPage)} label="" />
            <SearchBox value={searchInput} onChange={restart(setSearchInput)} placeholder="Search…" />
            <select value={status} onChange={(e) => restart(setStatus)(e.target.value)} className={controlCls} aria-label="Status">
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2 rounded-md border border-input-border bg-input-bg px-3 text-sm text-text-muted">
              <CalendarDays size={15} className="text-brand" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => restart(setDateFrom)(e.target.value)}
                className="h-9 bg-transparent text-text outline-none"
                aria-label="From"
              />
              <span>–</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => restart(setDateTo)(e.target.value)}
                className="h-9 bg-transparent text-text outline-none"
                aria-label="To"
              />
            </div>
          </div>
        </>
      }
    >
      {isLoading && <LegacyLoadingCard label="Loading expense reports…" />}
      {isError && (
        <LegacyErrorCard title="Couldn't load expense reports" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
      )}

      {data && (
        <>
          {stats && <StatTiles stats={stats} />}
          <ScrollCard className={`transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
            <table className="w-full text-sm">
              <thead className={STICKY_THEAD}>
                <tr className="border-b border-border bg-surface">
                  {COLUMNS.map((c) =>
                    c.sort ? (
                      <SortTh key={c.key} active={sort.by === c.sort} dir={sort.dir} onSort={() => toggleSort(c.sort!)} align={c.align}>
                        {c.label}
                      </SortTh>
                    ) : (
                      <th key={c.key} className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold">
                        {c.label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={COLUMNS.length} className="px-4 py-8 text-center italic text-text-faint">
                      {data.total === 0 && !status && !dateFrom && !dateTo && !search ? 'No expense records available' : 'No matching records found'}
                    </td>
                  </tr>
                )}
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="whitespace-nowrap px-3 py-2">
                      <Link to={ROUTES.expenseCard.replace(':id', String(r.id))} className="text-brand hover:underline">
                        {r.ref}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <PartyLink party={r.linkedParty} showIcon />
                    </td>
                    <td className="px-3 py-2">
                      <PartyLink party={r.userParty} avatar />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-text-muted">
                      <div>{r.dateStart}</div>
                      <div>{r.dateEnd}</div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-text-muted">{r.dateCreate}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                      <div className="font-semibold text-text!">{r.totalTtc}</div>
                      <div className="text-[11px] text-text-faint">
                        HT {r.totalHt} · VAT {r.totalTva}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-3 py-2">
                      <PaidBadge paid={r.paid} />
                    </td>
                    <td className="max-w-72 truncate px-3 py-2 text-text-muted" title={r.notes}>
                      {r.notes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollCard>
          <ListPagination page={page + 1} perPage={perPage} total={data.filtered} onPageChange={(p) => setPage(p - 1)} />
        </>
      )}
    </StickyListLayout>
  )
}
