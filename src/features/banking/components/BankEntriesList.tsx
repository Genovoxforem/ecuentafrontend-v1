import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { List, Search } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { useBankAccountsList, useBankEntriesList, type BankEntryRow } from '../banking.queries'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'

const selectCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 appearance-none'

type SortKey = 'refLabel' | 'description' | 'dateOps' | 'dateValue' | 'paymentType' | 'thirdParty' | 'bankAccount' | 'debit' | 'credit' | 'runningBalance' | 'conciliated'

const COLUMNS: { label: string; key: SortKey; align?: 'right' }[] = [
  { label: 'Ref', key: 'refLabel' },
  { label: 'Description', key: 'description' },
  { label: 'Date', key: 'dateOps' },
  { label: 'Value Date', key: 'dateValue' },
  { label: 'Type', key: 'paymentType' },
  { label: 'Third Party', key: 'thirdParty' },
  { label: 'Account', key: 'bankAccount' },
  { label: 'Debit', key: 'debit', align: 'right' },
  { label: 'Credit', key: 'credit', align: 'right' },
  { label: 'Balance', key: 'runningBalance', align: 'right' },
  { label: 'Reconciled', key: 'conciliated' },
]
const COLUMN_LABELS = COLUMNS.map((c) => c.label)
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

// The entries below are only ever the ONE page of real rows currently
// fetched from bankentries_list_ajax.php's real server-side pagination (see
// banking.queries.ts) — search/sort here run over that already-loaded page,
// not a fabricated full dataset, since re-fetching every page up front just
// to sort/search client-side would multiply real requests to this endpoint
// for no confirmed benefit (no server-side free-text search param is
// confirmed to exist here, only search_account).
function matchesSearch(entry: BankEntryRow, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [entry.refLabel, entry.description, entry.paymentType, entry.thirdParty, entry.bankAccount].some((field) => field.toLowerCase().includes(q))
}

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
    case 'conciliated':
      return r.conciliated ? 1 : 0
  }
}

// Real via compta/bank/bankentries_list_ajax.php — confirmed genuine JSON
// DataTables API, actively wired into the live bankentries_list.php page
// (unlike bank-sidebar-list-ajax.php), with real permission checks
// (banque->lire / banque->modifier).
export function BankEntriesList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: accounts } = useBankAccountsList()
  // 1-indexed to match ListPagination's convention; converted to the hook's
  // own 0-indexed `page` argument below.
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)
  const [search, setSearch] = useState('')
  const accountParam = searchParams.get('account')
  const accountId = accountParam ? Number(accountParam) : undefined

  const { data, isLoading, isError, error, refetch } = useBankEntriesList(accountId, page - 1, perPage)

  const filteredEntries = useMemo(() => (data?.rows ?? []).filter((r) => matchesSearch(r, search)), [data, search])
  const { sorted: sortedEntries, sort, toggleSort } = useSortableRows<BankEntryRow, SortKey>(filteredEntries, sortValue)

  function handleAccountChange(value: string) {
    setPage(1)
    if (value) setSearchParams({ account: value })
    else setSearchParams({})
  }

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handlePerPageChange(value: number) {
    setPerPage(value)
    setPage(1)
  }

  function getExportData() {
    // Scoped to the currently-loaded page only, same reason as matchesSearch above.
    const rows = sortedEntries.map((r) => [
      r.refLabel,
      r.description,
      r.dateOps,
      r.dateValue,
      r.paymentType,
      r.thirdParty || '—',
      r.bankAccount,
      r.debit,
      r.credit,
      r.runningBalance,
      r.conciliated ? 'Yes' : 'No',
    ])
    return { headers: COLUMN_LABELS, rows }
  }

  return (
    // -m-6 + flex-1 flex-col: same pattern as ServicesList.tsx / ThirdPartyList.tsx.
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <List size={20} className="text-brand" /> List Entries
        </h2>
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
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

        {isLoading && <LegacyLoadingCard label="Loading entries…" />}
        {isError && <LegacyErrorCard title="Couldn't load entries" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

        {data && (
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
                  placeholder="Search this page"
                  className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text pl-8 pr-3 py-1.5"
                />
              </div>
              <TableExportButtons title="List Entries" getExportData={getExportData} />
            </div>
            <div className="flex-1 min-h-0 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <TheadRow>
                    {COLUMNS.map((col) => (
                      <Th key={col.key} sortKey={col.key} sort={sort} onSort={toggleSort} align={col.align}>
                        {col.label}
                      </Th>
                    ))}
                  </TheadRow>
                </thead>
                <tbody>
                  {data.rows.length === 0 ? (
                    <tr>
                      <td colSpan={COLUMN_LABELS.length} className="px-3 py-4 text-text-faint italic">
                        No entries found.
                      </td>
                    </tr>
                  ) : filteredEntries.length === 0 ? (
                    <tr>
                      <td colSpan={COLUMN_LABELS.length} className="px-3 py-4 text-text-faint italic">
                        No entries on this page match "{search}".
                      </td>
                    </tr>
                  ) : (
                    sortedEntries.map((r) => (
                      <tr key={r.id} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 text-text!">{r.refLabel}</td>
                        <td className="px-3 py-2 text-text-muted">{r.description}</td>
                        <td className="px-3 py-2 text-text-muted whitespace-nowrap">{r.dateOps}</td>
                        <td className="px-3 py-2 text-text-muted whitespace-nowrap">{r.dateValue}</td>
                        <td className="px-3 py-2 text-text-muted">{r.paymentType}</td>
                        <td className="px-3 py-2 text-text-muted">{r.thirdParty || '—'}</td>
                        <td className="px-3 py-2 text-text-muted">{r.bankAccount}</td>
                        <td className="px-3 py-2 text-right text-danger">{r.debit}</td>
                        <td className="px-3 py-2 text-right text-success-fg">{r.credit}</td>
                        <td className="px-3 py-2 text-right text-text!">{r.runningBalance}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${r.conciliated ? 'bg-success-bg text-success-fg' : 'bg-neutral-bg text-neutral-fg'}`}>
                            {r.conciliated ? 'Yes' : 'No'}
                          </span>
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
      <ListPagination page={page} perPage={perPage} total={data?.filtered ?? 0} onPageChange={setPage} edgeToEdge />
    </div>
  )
}
