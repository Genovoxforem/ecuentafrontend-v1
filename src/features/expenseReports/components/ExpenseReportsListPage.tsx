import { useDeferredValue, useState } from 'react'
import { Link } from 'react-router-dom'
import { Wallet, CheckCircle2, Banknote, ClipboardCheck, Search, FileText, Plus, Home, ChevronRight } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useExpenseReportListPage, useExpenseReportStatusCounts, EXPENSE_REPORT_STATUS_OPTIONS, type ExpenseReportRow, type ExpenseReportListFilters } from '../expenseReportsList.queries'
import { ROUTES } from '../../../routes'

const PAGE_SIZE = 20

type SortKey = 'ref' | 'linkedTo' | 'user' | 'dateStart' | 'dateEnd' | 'dateCreate' | 'totalHt' | 'totalTva' | 'totalTtc' | 'status'

function sortValue(r: ExpenseReportRow, key: SortKey): string | number {
  switch (key) {
    case 'totalHt':
      return Number(r.totalHt) || 0
    case 'totalTva':
      return Number(r.totalTva) || 0
    case 'totalTtc':
      return Number(r.totalTtc) || 0
    default:
      return r[key]
  }
}

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'

const STATUS_BADGE_CLS: Record<string, string> = {
  Draft: 'bg-neutral-bg text-neutral-fg',
  Validated: 'bg-info-bg text-info-fg',
  Approved: 'bg-success-bg text-success-fg',
  Paid: 'bg-brand/10 text-brand',
  Canceled: 'bg-warning-bg text-warning-fg',
  Refused: 'bg-danger-bg text-danger-fg',
}

// Small decorative illustration (receipt + coin stack + calculator) for the
// page banner — plain inline SVG, no external asset/font dependency.
function ExpenseIllustration() {
  return (
    <svg width="96" height="72" viewBox="0 0 96 72" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="6" y="4" width="40" height="56" rx="4" fill="white" stroke="#bfdbfe" strokeWidth="2" />
      <line x1="14" y1="16" x2="38" y2="16" stroke="#93c5fd" strokeWidth="2" strokeLinecap="round" />
      <line x1="14" y1="24" x2="38" y2="24" stroke="#93c5fd" strokeWidth="2" strokeLinecap="round" />
      <line x1="14" y1="32" x2="30" y2="32" stroke="#93c5fd" strokeWidth="2" strokeLinecap="round" />
      <rect x="36" y="32" width="42" height="32" rx="4" fill="#397db9" opacity="0.12" />
      <rect x="36" y="32" width="42" height="32" rx="4" fill="none" stroke="#397db9" strokeWidth="2" />
      <rect x="42" y="38" width="30" height="6" rx="2" fill="#397db9" opacity="0.35" />
      <rect x="42" y="48" width="9" height="9" rx="2" fill="#397db9" opacity="0.35" />
      <rect x="54" y="48" width="9" height="9" rx="2" fill="#397db9" opacity="0.35" />
      <circle cx="80" cy="20" r="10" fill="#fbbf24" stroke="#f59e0b" strokeWidth="2" />
      <circle cx="80" cy="20" r="5" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
      <circle cx="70" cy="12" r="8" fill="#fcd34d" stroke="#f59e0b" strokeWidth="2" />
    </svg>
  )
}

function StatCard({ icon: Icon, label, tone, children }: { icon: typeof Wallet; label: string; tone: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-xl p-4 text-white ${tone}`}>
      <p className="flex items-center gap-1.5 text-sm font-medium opacity-90">
        <Icon size={15} /> {label}
      </p>
      <div className="mt-2">{children}</div>
    </div>
  )
}

// expensereport/list.php — Dolibarr's classic Expense Report list, a
// genuinely different real module from this app's existing "Expenses"
// feature (see expenseReportsList.queries.ts's own header comment for the
// full real-vs-real breakdown). Stat cards show real, independently
// verified counts only — the real page's own dollar amounts couldn't be
// reproduced from this endpoint's row data (see that same comment).
export function ExpenseReportsListPage() {
  const [filters, setFilters] = useState<ExpenseReportListFilters>({ status: '', search: '' })
  const [page, setPage] = useState(0)
  const deferredSearch = useDeferredValue(filters.search)
  const { data, isLoading, isError, error, refetch } = useExpenseReportListPage(filters, page, PAGE_SIZE)
  const counts = useExpenseReportStatusCounts()

  const rows = data?.rows ?? []
  const searchedRows = deferredSearch
    ? rows.filter((r) => [r.ref, r.linkedTo, r.user, r.notes].some((v) => v.toLowerCase().includes(deferredSearch.toLowerCase())))
    : rows
  const { sorted: sortedRows, sort, toggleSort } = useSortableRows<ExpenseReportRow, SortKey>(searchedRows, sortValue)

  function setFilter<K extends keyof ExpenseReportListFilters>(key: K, value: ExpenseReportListFilters[K]) {
    setPage(0)
    setFilters((f) => ({ ...f, [key]: value }))
  }

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0 overflow-x-hidden">
      <div className="sticky -top-6 z-10 -mx-6 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-text-faint mb-1">
          <Link to={ROUTES.expensesList} className="flex items-center gap-1 hover:text-text">
            <Home size={12} /> Expenses
          </Link>
          <ChevronRight size={11} />
          <span className="text-text font-medium">Expense Reports</span>
        </nav>
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Wallet size={20} className="text-brand" /> Expense Reports
        </h2>
      </div>

      <div className="flex-1 flex flex-col min-h-0 -mx-6 px-6 py-4 space-y-4">
        <div className="relative overflow-hidden rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 via-sky-50 to-white px-5 py-5 sm:px-6 sm:py-6 dark:border-white/10 dark:from-brand/10 dark:via-brand/5 dark:to-transparent">
          <button
            type="button"
            disabled
            title="New isn't wired — expensereport/card.php?action=create is a classic full-page form, no JSON."
            className="absolute top-4 right-4 sm:top-5 sm:right-6 flex items-center gap-1.5 rounded-lg bg-brand/50 px-3.5 py-2 text-sm font-medium text-white cursor-not-allowed"
          >
            <Plus size={14} /> New Expense Report
          </button>
          <div className="relative flex flex-wrap items-center justify-between gap-4 pr-0 sm:pr-40">
            <div className="flex items-start gap-4">
              <span className="shrink-0 w-12 h-12 rounded-xl bg-brand grid place-items-center text-white shadow-sm">
                <FileText size={22} />
              </span>
              <div>
                <h2 className="text-lg font-bold text-text!">Expense Report</h2>
                <p className="text-sm text-text-faint mt-0.5 max-w-md">Create and manage your expense reports with attachments and approval workflow.</p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-3 pt-2">
              <ExpenseIllustration />
              <p className="italic text-brand/70 font-medium text-sm leading-tight -rotate-2 select-none">
                Track Expenses
                <br />
                Simplify Approvals
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={Wallet} label="Total Expenses" tone="bg-brand">
            {counts.data ? <h3 className="text-2xl font-bold">{counts.data.total.toLocaleString()}</h3> : <span className="text-sm opacity-75">Loading…</span>}
          </StatCard>
          <StatCard icon={CheckCircle2} label="Approved / Unapproved" tone="bg-success">
            <div className="flex items-center justify-between text-sm">
              <div>
                <p className="opacity-80 text-xs">Approved</p>
                <p className="text-lg font-bold">{counts.data ? counts.data.approved.toLocaleString() : '—'}</p>
              </div>
              <div className="text-right">
                <p className="opacity-80 text-xs">Unapproved</p>
                <p className="text-lg font-bold">{counts.data ? counts.data.unapproved.toLocaleString() : '—'}</p>
              </div>
            </div>
          </StatCard>
          <StatCard icon={Banknote} label="Paid / Unpaid" tone="bg-info">
            <div className="flex items-center justify-between text-sm">
              <div>
                <p className="opacity-80 text-xs">Paid</p>
                <p className="text-lg font-bold">{counts.data ? counts.data.paid.toLocaleString() : '—'}</p>
              </div>
              <div className="text-right">
                <p className="opacity-80 text-xs">Unpaid</p>
                <p className="text-lg font-bold">{counts.data ? counts.data.unpaid.toLocaleString() : '—'}</p>
              </div>
            </div>
          </StatCard>
          <StatCard icon={ClipboardCheck} label="Validated" tone="bg-warning">
            {counts.data ? <h3 className="text-2xl font-bold">{counts.data.validated.toLocaleString()}</h3> : <span className="text-sm opacity-75">Loading…</span>}
          </StatCard>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)} className={`${inputCls} appearance-none`}>
              {EXPENSE_REPORT_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint pointer-events-none" />
              <input
                type="text"
                placeholder="Search this page…"
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                className={`${inputCls} pl-8 w-56`}
              />
            </div>
          </div>
          {data && <p className="text-xs text-text-faint">{data.filtered.toLocaleString()} expense reports</p>}
        </div>

        {isLoading && <LegacyLoadingCard label="Loading expense reports…" />}
        {isError && <LegacyErrorCard title="Couldn't load expense reports" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

        {data && (
          <Card className="!p-0 overflow-hidden flex-1 min-h-0">
            <div className="flex-1 min-h-0 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <TheadRow>
                    <Th sortKey="ref" sort={sort} onSort={toggleSort}>Ref</Th>
                    <Th sortKey="linkedTo" sort={sort} onSort={toggleSort}>Linked To</Th>
                    <Th sortKey="user" sort={sort} onSort={toggleSort}>User</Th>
                    <Th sortKey="dateStart" sort={sort} onSort={toggleSort}>Start Date</Th>
                    <Th sortKey="dateEnd" sort={sort} onSort={toggleSort}>End Date</Th>
                    <Th sortKey="dateCreate" sort={sort} onSort={toggleSort}>Created</Th>
                    <Th sortKey="totalHt" sort={sort} onSort={toggleSort} align="right">Amount HT</Th>
                    <Th sortKey="totalTva" sort={sort} onSort={toggleSort} align="right">VAT</Th>
                    <Th sortKey="totalTtc" sort={sort} onSort={toggleSort} align="right">Amount TTC</Th>
                    <Th sortKey="status" sort={sort} onSort={toggleSort}>Status</Th>
                    <th className="font-medium px-3 py-2 text-left">Notes</th>
                  </TheadRow>
                </thead>
                <tbody>
                  {sortedRows.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-3 py-4 text-text-faint italic">
                        No expense reports found.
                      </td>
                    </tr>
                  ) : (
                    sortedRows.map((r) => (
                      <tr key={r.id} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 text-text!">
                          {r.id ? (
                            <Link to={ROUTES.expenseReportDetail.replace(':id', String(r.id))} className="text-brand hover:underline whitespace-nowrap">
                              {r.ref}
                            </Link>
                          ) : (
                            r.ref
                          )}
                        </td>
                        <td className="px-3 py-2 text-text-muted whitespace-nowrap">{r.linkedTo || '-'}</td>
                        <td className="px-3 py-2 text-text-muted whitespace-nowrap">{r.user}</td>
                        <td className="px-3 py-2 text-text-muted whitespace-nowrap">{r.dateStart}</td>
                        <td className="px-3 py-2 text-text-muted whitespace-nowrap">{r.dateEnd}</td>
                        <td className="px-3 py-2 text-text-muted whitespace-nowrap">{r.dateCreate}</td>
                        <td className="px-3 py-2 text-right text-text-muted">{r.totalHt}</td>
                        <td className="px-3 py-2 text-right text-text-muted">{r.totalTva}</td>
                        <td className="px-3 py-2 text-right text-text!">{r.totalTtc}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${STATUS_BADGE_CLS[r.status] ?? 'bg-neutral-bg text-neutral-fg'}`}>{r.status}</span>
                        </td>
                        <td className="px-3 py-2 text-text-faint text-xs max-w-[16rem] truncate">{r.notes || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {data && <ListPagination page={page + 1} perPage={PAGE_SIZE} total={data.filtered} onPageChange={(p) => setPage(p - 1)} edgeToEdge />}
    </div>
  )
}
