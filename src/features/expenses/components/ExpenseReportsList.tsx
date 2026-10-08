import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, CheckCheck } from 'lucide-react'
import { StickyListLayout, ScrollCard, STICKY_THEAD } from '../../../shared/components/layout/StickyListLayout'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { useExpenseReportsList, type ExpenseListFilters } from '../expenses.queries'
import { parseParty } from '../expensePagesParser'
import { controlCls } from '../expenseTable'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { PaidBadge, PartyHtml, PerPageSelect, SearchBox, SortTh, StatusBadge } from './expenseParts'
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

// The columns the endpoint can sort by (its `columns[].data` names). Linked To, Paid and Notes are not
// sortable on the backend's own table either.
const COLUMNS: { key: string; label: string; sort?: string; align?: 'right' }[] = [
  { key: 'ref', label: 'Ref', sort: 'ref' },
  { key: 'linked', label: 'Linked To' },
  { key: 'user', label: 'User', sort: 'user' },
  { key: 'start', label: 'Start Date', sort: 'date_debut' },
  { key: 'end', label: 'End Date', sort: 'date_fin' },
  { key: 'created', label: 'Created', sort: 'date_create' },
  { key: 'ht', label: 'Amount HT', sort: 'total_ht', align: 'right' },
  { key: 'vat', label: 'VAT', sort: 'total_tva', align: 'right' },
  { key: 'ttc', label: 'Amount TTC', sort: 'total_ttc', align: 'right' },
  { key: 'status', label: 'Status', sort: 'status' },
  { key: 'paid', label: 'Paid' },
  { key: 'notes', label: 'Notes' },
]

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
  const [sort, setSort] = useState<{ by: string; dir: 'asc' | 'desc' }>({ by: 'date_create', dir: 'desc' })

  const filters: ExpenseListFilters = { status, dateFrom, dateTo, search, orderBy: sort.by, orderDir: sort.dir }
  const { data, isLoading, isError, error, refetch, isFetching } = useExpenseReportsList(filters, page, perPage)
  const rows = data?.rows ?? []

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
    rows: rows.map((r) => [r.ref, parseParty(r.userHtml)?.name ?? r.user, r.dateStart, r.dateEnd, r.dateCreate, r.totalHt, r.totalTva, r.totalTtc, r.status, r.notes]),
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
              <input type="date" value={dateFrom} onChange={(e) => restart(setDateFrom)(e.target.value)} className="h-9 bg-transparent text-text outline-none" aria-label="From" />
              <span>–</span>
              <input type="date" value={dateTo} onChange={(e) => restart(setDateTo)(e.target.value)} className="h-9 bg-transparent text-text outline-none" aria-label="To" />
            </div>
          </div>
        </>
      }
    >
      {isLoading && <LegacyLoadingCard label="Loading expense reports…" />}
      {isError && <LegacyErrorCard title="Couldn't load expense reports" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {data && (
        <>
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
                      {data.total === 0 ? 'No expense records available' : 'No matching records found'}
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
                      <PartyHtml html={r.linkedHtml} showIcon />
                    </td>
                    <td className="px-3 py-2">
                      <PartyHtml html={r.userHtml} avatar />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-text-muted">{r.dateStart}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-text-muted">{r.dateEnd}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-text-muted">{r.dateCreate}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-text-muted">{r.totalHt}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-text-muted">{r.totalTva}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-text!">{r.totalTtc}</td>
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
          <div className="-mx-[22px] -mb-4">
            <ListPagination page={page + 1} perPage={perPage} total={data.filtered} onPageChange={(p) => setPage(p - 1)} edgeToEdge />
          </div>
        </>
      )}
    </StickyListLayout>
  )
}
