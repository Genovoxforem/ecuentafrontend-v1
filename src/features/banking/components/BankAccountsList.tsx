import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Landmark, Search } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { useBankAccountsList, type BankAccountRow } from '../banking.queries'
import { formatMoney } from '../../../utils/format'
import { ROUTES } from '../../../routes'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'

type SortKey = 'label' | 'accountNumber' | 'currencyCode' | 'balance'

const COLUMNS: { label: string; key: SortKey }[] = [
  { label: 'Account', key: 'label' },
  { label: 'Account Number', key: 'accountNumber' },
  { label: 'Currency', key: 'currencyCode' },
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
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [search, setSearch] = useState('')

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
    const rows = sortedAccounts.map((a) => [a.label, a.accountNumber || '—', a.currencyCode, formatMoney(a.balance)])
    return { headers: COLUMN_LABELS, rows }
  }

  return (
    // -m-6 + flex-1 flex-col: same pattern as ServicesList.tsx / ThirdPartyList.tsx.
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Landmark size={20} className="text-brand" /> Bank Accounts
        </h2>
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
                      <Th key={col.key} sortKey={col.key} sort={sort} onSort={toggleSort} align={col.key === 'balance' ? 'right' : 'left'}>
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
                          <Link to={`${ROUTES.bankingEntries}?account=${a.id}`} className="text-brand hover:underline">
                            {a.label}
                          </Link>
                        </td>
                        <td className="px-4 py-2 text-text-muted">{a.accountNumber || '—'}</td>
                        <td className="px-4 py-2 text-text-muted">{a.currencyCode}</td>
                        <td className="px-4 py-2 text-right text-text!">{formatMoney(a.balance)}</td>
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
