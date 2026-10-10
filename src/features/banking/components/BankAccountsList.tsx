import { useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { InBanner } from '../../../shared/components/layout/bannerSlot'
import { Link } from 'react-router-dom'
import { Landmark, Search, Filter, AlertTriangle } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { useBankAccountsDetailedList, type BankAccountStatusFilter } from '../banking.queries'
import type { BankAccountListRow } from '../bankAccountsListParser'
import { ROUTES } from '../../../routes'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'

type SortKey = 'ref' | 'label' | 'type' | 'number' | 'accountingAccount' | 'journal' | 'reconcile' | 'status' | 'balance'

// The columns of the backend's own list (compta/bank/list.php), all read from it.
const COLUMNS: { label: string; key: SortKey; align?: 'right' }[] = [
  { label: 'Bank Accounts', key: 'ref' },
  { label: 'Label', key: 'label' },
  { label: 'Type', key: 'type' },
  { label: 'Number', key: 'number' },
  { label: 'Accounting Account', key: 'accountingAccount' },
  { label: 'Accounting Code Journal', key: 'journal' },
  { label: 'Entries To Reconcile', key: 'reconcile' },
  { label: 'Status', key: 'status' },
  { label: 'Balance', key: 'balance', align: 'right' },
]
const COLUMN_LABELS = COLUMNS.map((c) => c.label)
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]
const STATUS_OPTIONS: { value: BankAccountStatusFilter; label: string }[] = [
  { value: 'opened', label: 'Opened' },
  { value: 'closed', label: 'Closed' },
  { value: 'all', label: 'All' },
]

function reconcileText(a: BankAccountListRow): string {
  return a.toReconcile.kind === 'count' ? String(a.toReconcile.count) : a.toReconcile.text
}

function matchesSearch(a: BankAccountListRow, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [a.ref, a.label, a.type, a.number, a.accountingAccount, a.journal, a.statusLabel, a.balanceText].some((field) => field.toLowerCase().includes(q))
}

function sortValue(a: BankAccountListRow, key: SortKey): string | number {
  switch (key) {
    case 'ref':
      return a.ref
    case 'label':
      return a.label
    case 'type':
      return a.type
    case 'number':
      return a.number
    case 'accountingAccount':
      return a.accountingAccount
    case 'journal':
      return a.journal
    case 'reconcile':
      return a.toReconcile.kind === 'count' ? a.toReconcile.count : -1
    case 'status':
      return a.statusLabel
    case 'balance':
      return a.balance
  }
}

// Bank Management Details (compta/bank/list.php) — shown under both Banking and General Ledger
// > Setup > Bank accounts, since the backend has one page for both. Every cell is what that page
// prints; its own default is to list open accounts only, and the filter button changes that.
export function BankAccountsList() {
  const [status, setStatus] = useState<BankAccountStatusFilter>('opened')
  const [showFilter, setShowFilter] = useState(false)
  const filterBtnRef = useRef<HTMLButtonElement>(null)
  const { data: accounts, isLoading, isError, error, refetch } = useBankAccountsDetailedList(status)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [search, setSearch] = useState('')

  const filteredAccounts = useMemo(() => (accounts ?? []).filter((a) => matchesSearch(a, search)), [accounts, search])
  const { sorted: sortedAccounts, sort, toggleSort } = useSortableRows<BankAccountListRow, SortKey>(filteredAccounts, sortValue)
  const pageAccounts = sortedAccounts.slice((page - 1) * perPage, page * perPage)

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handlePerPageChange(value: number) {
    setPerPage(value)
    setPage(1)
  }

  function handleStatusChange(value: BankAccountStatusFilter) {
    setStatus(value)
    setPage(1)
  }

  function getExportData() {
    const rows = sortedAccounts.map((a) => [a.ref, a.label, a.type, a.number, a.accountingAccount, a.journal, reconcileText(a), a.statusLabel, a.balanceText])
    return { headers: COLUMN_LABELS, rows }
  }

  const entriesLink = (id: string) => `${ROUTES.bankingEntries}?account=${id}`

  return (
    // -m-6 + flex-1 flex-col: same pattern as ServicesList.tsx / ThirdPartyList.tsx.
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <InBanner>
        <div className="relative flex items-center gap-2">
          <button
            ref={filterBtnRef}
            type="button"
            aria-label="Filter"
            aria-expanded={showFilter}
            onClick={() => setShowFilter((v) => !v)}
            className={`flex items-center justify-center w-9 h-9 rounded-lg border text-text-muted hover:bg-surface-hover ${status !== 'opened' ? 'border-brand text-brand' : 'border-input-border'}`}
          >
            <Filter size={14} />
          </button>
          {showFilter && filterBtnRef.current && createPortal(
            <div
              className="fixed z-[80] w-56 rounded-lg border border-border bg-surface p-3 shadow-xl"
              style={{ top: filterBtnRef.current.getBoundingClientRect().bottom + 8, right: window.innerWidth - filterBtnRef.current.getBoundingClientRect().right }}
            >
              <label className="block text-xs text-text-faint mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => handleStatusChange(e.target.value as BankAccountStatusFilter)}
                className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>,
            document.body,
          )}
        </div>
      </InBanner>
      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
        {isLoading && <LegacyLoadingCard label="Loading bank accounts…" />}
        {isError && <LegacyErrorCard title="Couldn't load bank accounts" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

        {accounts && (
          <Card className="!p-0 overflow-hidden flex-1 min-h-0">
            <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
              <select
                value={perPage}
                onChange={(e) => handlePerPageChange(Number(e.target.value))}
                className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5"
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <div className="relative w-48">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search"
                  className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text pl-8 pr-3 py-1.5"
                />
              </div>
              <TableExportButtons title="Bank Accounts" getExportData={getExportData} />
            </div>
            <div className="flex-1 min-h-0 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <TheadRow>
                    {COLUMNS.map((col) => (
                      <Th key={col.label} sortKey={col.key} sort={sort} onSort={toggleSort} align={col.align ?? 'left'} className="!px-3 !whitespace-normal">
                        {col.label}
                      </Th>
                    ))}
                  </TheadRow>
                </thead>
                <tbody>
                  {accounts.length === 0 ? (
                    <tr>
                      <td colSpan={COLUMN_LABELS.length} className="px-4 py-4 text-text-faint italic">
                        No {status === 'all' ? '' : `${status === 'opened' ? 'open' : 'closed'} `}bank accounts found.
                      </td>
                    </tr>
                  ) : filteredAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={COLUMN_LABELS.length} className="px-4 py-4 text-text-faint italic">
                        No bank accounts match "{search}".
                      </td>
                    </tr>
                  ) : (
                    pageAccounts.map((a) => (
                      <tr key={a.id} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 whitespace-nowrap">
                          <Link to={ROUTES.bankingAccountDetail.replace(':id', a.id)} className="flex items-center gap-1.5 text-brand hover:underline">
                            <Landmark size={13} className="shrink-0" /> {a.ref}
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-text!">{a.label}</td>
                        <td className="px-3 py-2 text-text-muted">{a.type || '—'}</td>
                        <td className="px-3 py-2 text-text-muted">{a.number || '—'}</td>
                        <td className="px-3 py-2 text-text-muted">{a.accountingAccount || '—'}</td>
                        <td className="px-3 py-2 text-text-muted">{a.journal || '—'}</td>
                        <td className="px-3 py-2">
                          {a.toReconcile.kind === 'count' ? (
                            <span className="inline-flex items-center gap-1.5">
                              <Link to={entriesLink(a.id)} title="Entries to reconcile" className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-warning-bg text-warning-fg hover:opacity-80">
                                {a.toReconcile.count}
                              </Link>
                              {a.toReconcile.late > 0 && (
                                <span title="Late" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-danger-bg text-danger-fg">
                                  <AlertTriangle size={11} /> {a.toReconcile.late}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-text-muted">{a.toReconcile.text || '—'}</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${a.open ? 'bg-success-bg text-success-fg' : 'bg-neutral-bg text-neutral-fg'}`}>{a.statusLabel}</span>
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap tabular-nums">
                          <Link to={entriesLink(a.id)} className={`hover:underline ${a.balance < 0 ? 'text-danger' : 'text-brand'}`}>
                            {a.balanceText}
                          </Link>
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
      <ListPagination page={page} perPage={perPage} total={filteredAccounts.length} onPageChange={setPage} edgeToEdge />
    </div>
  )
}
