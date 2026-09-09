import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Landmark, Search, Plus, Filter } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { useBankAccountsList, useBankAccountsDropdown, useReconcileCounts, type BankAccountRow } from '../banking.queries'
import { formatMoney } from '../../../utils/format'
import { ROUTES } from '../../../routes'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'

type SortKey = 'label' | 'accountNumber' | 'currencyCode' | 'balance'

// Column set matches the real compta/bank/list.php exactly.
// Real: Bank Accounts/Label/Number/Currency/Balance (bank-sidebar-list-ajax.php),
// Status (inferred from presence in api/bank_accounts.php, which hardcodes
// `WHERE clos = 0` — an account appearing there is genuinely open; one
// missing is genuinely closed, not guessed), and Entries To Reconcile (the
// real `search_conciliated=0` count from bankentries_list_ajax.php — see
// useReconcileCounts in banking.queries.ts for the full explanation of what
// is and isn't reproduced from the real page's badge).
// Still honest "—": Type, Accounting Account and Accounting Code Journal —
// list.php's own direct SQL has zero json_encode anywhere (confirmed by
// reading it directly) and no other confirmed JSON endpoint returns these
// fields (bank-sidebar-list-ajax.php's SQL only selects
// rowid/totbank/label/number/currency_code).
const COLUMNS: { label: string; key?: SortKey }[] = [
  { label: 'Bank Accounts', key: 'label' },
  { label: 'Label' },
  { label: 'Type' },
  { label: 'Number', key: 'accountNumber' },
  { label: 'Accounting Account' },
  { label: 'Accounting Code Journal' },
  { label: 'Entries To Reconcile' },
  { label: 'Status' },
  { label: 'Balance', key: 'balance' },
]
const COLUMN_LABELS = COLUMNS.map((c) => c.label)
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

function matchesSearch(account: BankAccountRow, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [account.label, account.accountNumber, account.currencyCode].some((field) => field.toLowerCase().includes(q))
}

function sortValue(a: BankAccountRow, key: SortKey): string | number {
  switch (key) {
    case 'label':
      return a.label
    case 'accountNumber':
      return a.accountNumber
    case 'currencyCode':
      return a.currencyCode
    case 'balance':
      return a.balance
  }
}

// Real via compta/bank/bank-sidebar-list-ajax.php — confirmed genuine JSON,
// but an orphaned endpoint: the live compta/bank/index.php and list.php
// pages never call it themselves (same "real API sitting unused next to a
// scraped/classic page" pattern this session already found for the General
// Ledger module's listbyaccount_ajax_api.php). No permission check exists
// on this endpoint server-side — any logged-in user can call it.
export function BankAccountsList() {
  const { data: accounts, isLoading, isError, error, refetch } = useBankAccountsList()
  const { data: openAccounts, isLoading: openAccountsLoading } = useBankAccountsDropdown()
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [search, setSearch] = useState('')

  const openAccountIds = useMemo(() => new Set((openAccounts ?? []).map((a) => a.id)), [openAccounts])
  const accountIds = useMemo(() => (accounts ?? []).map((a) => a.id), [accounts])
  const reconcileResults = useReconcileCounts(accountIds)
  const reconcileCounts = useMemo(() => {
    const map = new Map<number, { loading: boolean; error: boolean; count: number }>()
    accountIds.forEach((id, i) => {
      const r = reconcileResults[i]
      map.set(id, { loading: r.isLoading, error: r.isError, count: r.data ?? 0 })
    })
    return map
  }, [accountIds, reconcileResults])

  const filteredAccounts = useMemo(() => (accounts ?? []).filter((a) => matchesSearch(a, search)), [accounts, search])
  const { sorted: sortedAccounts, sort, toggleSort } = useSortableRows<BankAccountRow, SortKey>(filteredAccounts, sortValue)
  const pageAccounts = sortedAccounts.slice((page - 1) * perPage, page * perPage)

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handlePerPageChange(value: number) {
    setPerPage(value)
    setPage(1)
  }

  function getExportData() {
    const rows = sortedAccounts.map((a) => [
      a.label,
      a.label,
      '—',
      a.accountNumber || '—',
      '—',
      '—',
      String(reconcileCounts.get(a.id)?.count ?? '—'),
      openAccountIds.has(a.id) ? 'Open' : 'Closed',
      formatMoney(a.balance),
    ])
    return { headers: COLUMN_LABELS, rows }
  }

  return (
    // -m-6 + flex-1 flex-col: same pattern as ServicesList.tsx / ThirdPartyList.tsx.
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Landmark size={20} className="text-brand" /> Bank Management Details
        </h2>
        <div className="flex items-center gap-2">
          <Link to={ROUTES.bankingNewAccount} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
            <Plus size={14} /> New
          </Link>
          <button
            type="button"
            disabled
            title="No real filter API confirmed for this backend"
            className="flex items-center justify-center w-9 h-9 rounded-lg border border-input-border text-text-faint opacity-60 cursor-not-allowed"
          >
            <Filter size={14} />
          </button>
        </div>
      </div>

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
                      <Th key={col.label} sortKey={col.key} sort={sort} onSort={toggleSort} align={col.key === 'balance' ? 'right' : 'left'}>
                        {col.label}
                      </Th>
                    ))}
                  </TheadRow>
                </thead>
                <tbody>
                  {accounts.length === 0 ? (
                    <tr>
                      <td colSpan={COLUMN_LABELS.length} className="px-4 py-4 text-text-faint italic">
                        No bank accounts found.
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
                        <td className="px-4 py-2 text-text!">
                          <Link to={ROUTES.bankingAccountDetail.replace(':id', String(a.id))} className="flex items-center gap-1.5 text-brand hover:underline">
                            <Landmark size={13} className="shrink-0" /> {a.label}
                          </Link>
                        </td>
                        <td className="px-4 py-2 text-text-muted">{a.label}</td>
                        <td className="px-4 py-2 text-text-faint" title="No real API available on this backend">
                          —
                        </td>
                        <td className="px-4 py-2 text-text-muted">{a.accountNumber || '—'}</td>
                        <td className="px-4 py-2 text-text-faint" title="No real API available on this backend">
                          —
                        </td>
                        <td className="px-4 py-2 text-text-faint" title="No real API available on this backend">
                          —
                        </td>
                        <td className="px-4 py-2">
                          {(() => {
                            const r = reconcileCounts.get(a.id)
                            if (!r || r.loading) return <span className="text-text-faint">…</span>
                            if (r.error) return <span className="text-text-faint" title="Couldn't load from bankentries_list_ajax.php">—</span>
                            return (
                              <span
                                className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-brand/10 text-brand"
                                title="Unreconciled entries (search_conciliated=0 count via bankentries_list_ajax.php)"
                              >
                                {r.count}
                              </span>
                            )
                          })()}
                        </td>
                        <td className="px-4 py-2">
                          {openAccountsLoading ? (
                            <span className="text-text-faint">…</span>
                          ) : (
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                openAccountIds.has(a.id) ? 'bg-success-bg text-success-fg' : 'bg-neutral-bg text-neutral-fg'
                              }`}
                              title="Inferred from presence in api/bank_accounts.php, which filters WHERE clos = 0"
                            >
                              {openAccountIds.has(a.id) ? 'Open' : 'Closed'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right text-text!">
                          {formatMoney(a.balance)} {a.currencyCode}
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
