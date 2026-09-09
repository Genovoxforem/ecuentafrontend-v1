import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { List, Search, Pencil, Trash2, TrendingDown, TrendingUp, Wallet, Clock3, RefreshCcw } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { useBankAccountsList, useBankAccountsDropdown, useBankEntriesList, useReconcileCounts, parseAmount, type BankEntryRow, type BankAccountRow, type BankAccountDropdownRow } from '../banking.queries'
import { formatMoney } from '../../../utils/format'
import { ROUTES } from '../../../routes'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'

const selectCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 appearance-none'
const dateInputCls = 'h-9 px-2 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 w-full'

type SortKey = 'refLabel' | 'description' | 'dateOps' | 'dateValue' | 'paymentType' | 'checkNum' | 'thirdParty' | 'bankAccount' | 'debit' | 'credit' | 'runningBalance' | 'accountStatement' | 'conciliated'

const COLUMNS: { label: string; key?: SortKey; align?: 'right' }[] = [
  { label: 'Ref', key: 'refLabel' },
  { label: 'Description', key: 'description' },
  { label: 'Oper. Date', key: 'dateOps' },
  { label: 'Value Date', key: 'dateValue' },
  { label: 'Type', key: 'paymentType' },
  { label: 'Number', key: 'checkNum' },
  { label: 'Third Party', key: 'thirdParty' },
  { label: 'Bank Account', key: 'bankAccount' },
  { label: 'Debit', key: 'debit', align: 'right' },
  { label: 'Credit', key: 'credit', align: 'right' },
  { label: 'Balance', key: 'runningBalance', align: 'right' },
  { label: 'Account Stmt.', key: 'accountStatement' },
  { label: 'Reconciled', key: 'conciliated' },
  { label: 'Actions' },
]
const COLUMN_LABELS = COLUMNS.map((c) => c.label)
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

function sortValue(r: BankEntryRow, key: SortKey): string | number {
  switch (key) {
    case 'refLabel':
      return r.refLabel
    case 'description':
      return r.description
    case 'dateOps':
      return r.dateOps
    case 'dateValue':
      return r.dateValue
    case 'paymentType':
      return r.paymentType
    case 'checkNum':
      return r.checkNum
    case 'thirdParty':
      return r.thirdParty
    case 'bankAccount':
      return r.bankAccount
    case 'debit':
      return r.debit
    case 'credit':
      return r.credit
    case 'runningBalance':
      return r.runningBalance
    case 'accountStatement':
      return r.accountStatement
    case 'conciliated':
      return r.conciliated ? 1 : 0
  }
}

// bankentries_list_ajax.php's "Bank Account" cell renders the account's
// short `ref` code (e.g. "PettyCash"), not its `label` ("Petty Cash") — try
// matching against the real dropdown endpoint's `ref` field first (see
// useBankAccountsDropdown), falling back to a label match for accounts
// where ref happens to equal label.
function findAccountId(accounts: BankAccountRow[] | undefined, dropdownAccounts: BankAccountDropdownRow[] | undefined, cellText: string): number | undefined {
  return dropdownAccounts?.find((a) => a.ref === cellText)?.id ?? accounts?.find((a) => a.label === cellText)?.id
}

const STAT_CARD_STYLES = {
  debit: { badge: 'bg-danger-bg text-danger-fg', value: 'text-danger-fg' },
  credit: { badge: 'bg-success-bg text-success-fg', value: 'text-success-fg' },
  balance: { badge: 'bg-brand/10 text-brand', value: 'text-text!' },
  pending: { badge: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300', value: 'text-purple-700 dark:text-purple-300' },
} as const

function StatCard({ icon: Icon, label, value, tone }: { icon: typeof TrendingDown; label: string; value: string; tone: keyof typeof STAT_CARD_STYLES }) {
  const styles = STAT_CARD_STYLES[tone]
  return (
    <Card className="!h-auto !p-4 flex items-center gap-3">
      <div className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${styles.badge}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className={`text-base font-bold ${styles.value}`}>{value}</p>
        <p className="text-xs text-text-faint">{label}</p>
      </div>
    </Card>
  )
}

// Real via compta/bank/bankentries_list_ajax.php — confirmed genuine JSON
// DataTables API, actively wired into the live bankentries_list.php page
// (unlike bank-sidebar-list-ajax.php), with real permission checks
// (banque->lire / banque->modifier). Filters (search, Operation/Value Date
// ranges, unreconciled-only) all map to real, confirmed GET params read
// directly from that file's PHP source — see BankEntriesFilters in
// banking.queries.ts. Not reproduced: the real page's row-level Edit/Delete
// actions (shown here as visibly present but disabled, to avoid an unwired
// destructive write on live financial data) and its checkbox-based bulk
// reconciliation submit flow (the "Reconcile" button here only applies the
// same read-only search_conciliated=0 filter the real page's own Conciliate
// link uses, without the write-back).
export function BankEntriesList({ accountId: accountIdProp, embedded = false }: { accountId?: number; embedded?: boolean } = {}) {
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: accounts } = useBankAccountsList()
  const { data: dropdownAccounts } = useBankAccountsDropdown()
  // 1-indexed to match ListPagination's convention; converted to the hook's
  // own 0-indexed `page` argument below.
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [dateOpsFrom, setDateOpsFrom] = useState('')
  const [dateOpsTo, setDateOpsTo] = useState('')
  const [dateValueFrom, setDateValueFrom] = useState('')
  const [dateValueTo, setDateValueTo] = useState('')
  const [unreconciledOnly, setUnreconciledOnly] = useState(false)
  const accountParam = searchParams.get('account')
  const accountId = accountIdProp ?? (accountParam ? Number(accountParam) : undefined)

  // Debounced: search is a real server round-trip (search[value] param), not
  // a client-side array filter, so we don't want to fire one per keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const filters = { search, dateOpsFrom, dateOpsTo, dateValueFrom, dateValueTo, unreconciledOnly }
  const { data, isLoading, isError, error, refetch } = useBankEntriesList(accountId, page - 1, perPage, filters)
  const { sorted: sortedEntries, sort, toggleSort } = useSortableRows<BankEntryRow, SortKey>(data?.rows ?? [], sortValue)

  // Account-scoped aggregate stats (Total Debit/Credit/Current Balance/Pending
  // Reconciliation) — a separate, unfiltered, all-rows fetch so the stat cards
  // stay stable while the table above is being filtered/searched/paged.
  // React Query caches this by key, so when embedded next to BankAccountDetail's
  // own identical call (accountId, page 0, length 2000, no filters) it's a
  // cache hit, not a second network request.
  const account = accounts?.find((a) => a.id === accountId)
  const aggregateQuery = useBankEntriesList(accountId, 0, 2000)
  const reconcileForAccount = useReconcileCounts(accountId ? [accountId] : [])
  const totals = useMemo(() => {
    const rows = aggregateQuery.data?.rows ?? []
    let debit = 0
    let credit = 0
    for (const r of rows) {
      if (r.debit) debit += parseAmount(r.debit)
      if (r.credit) credit += parseAmount(r.credit)
    }
    return { debit, credit }
  }, [aggregateQuery.data])
  const pendingReconciliation = reconcileForAccount[0]?.data

  function handleAccountChange(value: string) {
    setPage(1)
    if (value) setSearchParams({ account: value })
    else setSearchParams({})
  }

  function handlePerPageChange(value: number) {
    setPerPage(value)
    setPage(1)
  }

  function toggleUnreconciledOnly() {
    setUnreconciledOnly((v) => !v)
    setPage(1)
  }

  function getExportData() {
    const rows = sortedEntries.map((r) => [
      r.refLabel,
      r.description,
      r.dateOps,
      r.dateValue,
      r.paymentType,
      r.checkNum || '—',
      r.thirdParty || '—',
      r.bankAccount,
      r.debit,
      r.credit,
      r.runningBalance,
      r.accountStatement || '—',
      r.conciliated ? 'Yes' : 'No',
    ])
    return { headers: COLUMN_LABELS.filter((l) => l !== 'Actions'), rows }
  }

  return (
    // -m-6 + flex-1 flex-col: same pattern as ServicesList.tsx / ThirdPartyList.tsx.
    // When embedded (nested inside BankAccountDetail's "Bank Entries" tab), that
    // page shell + sticky header are dropped since the host page already provides
    // its own header/tabs and isn't a bounded-height flex ancestor.
    <div className={embedded ? 'space-y-4' : '-m-6 flex-1 flex flex-col min-h-0'}>
      {!embedded && (
        <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
          <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
            <List size={20} className="text-brand" /> List Entries
          </h2>
        </div>
      )}

      <div className={embedded ? 'space-y-4' : 'flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4'}>
        {!embedded && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-text-muted">Account</label>
            <select value={accountId ?? ''} onChange={(e) => handleAccountChange(e.target.value)} className={selectCls}>
              <option value="">All accounts</option>
              {(accounts ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {accountId && account && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={TrendingDown} label="Total Debit" value={`${formatMoney(totals.debit)} ${account.currencyCode}`} tone="debit" />
            <StatCard icon={TrendingUp} label="Total Credit" value={`${formatMoney(totals.credit)} ${account.currencyCode}`} tone="credit" />
            <StatCard icon={Wallet} label="Current Balance" value={`${formatMoney(account.balance)} ${account.currencyCode}`} tone="balance" />
            <StatCard
              icon={Clock3}
              label="Pending Reconciliation"
              value={reconcileForAccount[0]?.isLoading ? '…' : reconcileForAccount[0]?.isError ? '—' : String(pendingReconciliation ?? 0)}
              tone="pending"
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs font-medium text-text-muted mb-1.5">Operation Date</p>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateOpsFrom}
                onChange={(e) => {
                  setDateOpsFrom(e.target.value)
                  setPage(1)
                }}
                className={dateInputCls}
              />
              <span className="text-text-faint text-xs shrink-0">to</span>
              <input
                type="date"
                value={dateOpsTo}
                onChange={(e) => {
                  setDateOpsTo(e.target.value)
                  setPage(1)
                }}
                className={dateInputCls}
              />
            </div>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs font-medium text-text-muted mb-1.5">Value Date</p>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateValueFrom}
                onChange={(e) => {
                  setDateValueFrom(e.target.value)
                  setPage(1)
                }}
                className={dateInputCls}
              />
              <span className="text-text-faint text-xs shrink-0">to</span>
              <input
                type="date"
                value={dateValueTo}
                onChange={(e) => {
                  setDateValueTo(e.target.value)
                  setPage(1)
                }}
                className={dateInputCls}
              />
            </div>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs font-medium text-text-muted mb-1.5">Search</p>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by description, number, party…"
                className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text pl-8 pr-3 py-1.5"
              />
            </div>
          </div>
        </div>

        {isLoading && <LegacyLoadingCard label="Loading entries…" />}
        {isError && <LegacyErrorCard title="Couldn't load entries" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

        {data && (
          <Card className={embedded ? '!p-0 overflow-hidden' : '!p-0 overflow-hidden flex-1 min-h-0'}>
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
              <button
                type="button"
                onClick={toggleUnreconciledOnly}
                title="Real filter — reuses bankentries_list_ajax.php's own search_conciliated=0 param, the same one the real page's Conciliate link applies. Selecting entries and submitting a statement number isn't wired here to avoid an unreviewed write on live financial data."
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${
                  unreconciledOnly ? 'bg-brand text-white' : 'border border-input-border text-text hover:bg-surface-hover'
                }`}
              >
                <RefreshCcw size={14} /> {unreconciledOnly ? 'Unreconciled Only' : 'Reconcile'}
              </button>
              <div className="ml-auto">
                <TableExportButtons title="List Entries" getExportData={getExportData} />
              </div>
            </div>
            <div className={embedded ? 'overflow-auto max-h-[28rem]' : 'flex-1 min-h-0 overflow-auto'}>
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <TheadRow>
                    {COLUMNS.map((col) => (
                      <Th key={col.label} sortKey={col.key} sort={sort} onSort={toggleSort} align={col.align}>
                        {col.label}
                      </Th>
                    ))}
                  </TheadRow>
                </thead>
                <tbody>
                  {sortedEntries.length === 0 ? (
                    <tr>
                      <td colSpan={COLUMN_LABELS.length} className="px-3 py-4 text-text-faint italic">
                        {search || dateOpsFrom || dateOpsTo || dateValueFrom || dateValueTo || unreconciledOnly ? 'No entries match these filters.' : 'No entries found.'}
                      </td>
                    </tr>
                  ) : (
                    sortedEntries.map((r) => {
                      const linkedAccountId = findAccountId(accounts, dropdownAccounts, r.bankAccount)
                      return (
                        <tr key={r.id} className="border-b border-border last:border-0">
                          <td className="px-3 py-2 text-text!">{r.refLabel}</td>
                          <td className="px-3 py-2 text-text-muted">{r.description}</td>
                          <td className="px-3 py-2 text-text-muted whitespace-nowrap">{r.dateOps}</td>
                          <td className="px-3 py-2 text-text-muted whitespace-nowrap">{r.dateValue}</td>
                          <td className="px-3 py-2 text-text-muted">{r.paymentType}</td>
                          <td className="px-3 py-2 text-text-muted">{r.checkNum || '—'}</td>
                          <td className="px-3 py-2 text-text-muted">{r.thirdParty || '—'}</td>
                          <td className="px-3 py-2 text-text-muted">
                            {linkedAccountId ? (
                              <Link to={ROUTES.bankingAccountDetail.replace(':id', String(linkedAccountId))} className="text-brand hover:underline">
                                {r.bankAccount}
                              </Link>
                            ) : (
                              r.bankAccount
                            )}
                          </td>
                          <td className="px-3 py-2 text-right text-danger">{r.debit}</td>
                          <td className="px-3 py-2 text-right text-success-fg">{r.credit}</td>
                          <td className="px-3 py-2 text-right text-text!">{r.runningBalance}</td>
                          <td className="px-3 py-2 text-text-muted">{r.accountStatement || '—'}</td>
                          <td className="px-3 py-2">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${r.conciliated ? 'bg-success-bg text-success-fg' : 'bg-neutral-bg text-neutral-fg'}`}>
                              {r.conciliated ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1.5 text-text-faint">
                              <button type="button" disabled title="Editing bank entries isn't wired in this app — use the legacy system." className="p-1 rounded opacity-60 cursor-not-allowed">
                                <Pencil size={13} />
                              </button>
                              <button type="button" disabled title="Deleting bank entries isn't wired in this app — use the legacy system." className="p-1 rounded opacity-60 cursor-not-allowed">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
      <ListPagination page={page} perPage={perPage} total={data?.filtered ?? 0} onPageChange={setPage} edgeToEdge={!embedded} />
    </div>
  )
}
