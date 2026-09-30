import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Flag, Loader2, Search } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { ROUTES } from '../../../routes'
import { formatMoney } from '../../../utils/format'
import { usePayments, type PaymentRow } from '../payments.queries'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]
const COLUMN_LABELS = ['Ref.Payment', 'Date', 'Third-Party', 'Type', 'Number', 'Bank Entry', 'Account', 'Amount']

type SortKey = 'ref' | 'paymentDate' | 'customerName' | 'paymentTypeLabel' | 'paymentReference' | 'bankEntryId' | 'accountName' | 'amount'

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const todayIso = () => iso(new Date())
const firstOfMonthIso = () => {
  const d = new Date()
  return iso(new Date(d.getFullYear(), d.getMonth(), 1))
}
// yyyy-MM-dd -> MM/dd/yyyy (the classic page's own date format)
const fmtDate = (v: string) => {
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? `${m[2]}/${m[3]}/${m[1]}` : v
}

function matchesSearch(r: PaymentRow, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [r.ref, r.customerName ?? '', r.paymentTypeLabel ?? '', r.paymentReference ?? '', r.accountName ?? '', String(r.bankEntryId ?? '')].some((field) => field.toLowerCase().includes(q))
}

function sortValue(r: PaymentRow, key: SortKey): string | number {
  switch (key) {
    case 'ref':
      return r.ref
    case 'paymentDate':
      return r.paymentDate
    case 'customerName':
      return r.customerName ?? ''
    case 'paymentTypeLabel':
      return r.paymentTypeLabel ?? ''
    case 'paymentReference':
      return r.paymentReference ?? ''
    case 'bankEntryId':
      return r.bankEntryId ?? 0
    case 'accountName':
      return r.accountName ?? ''
    case 'amount':
      return r.amount
  }
}

// The classic "Report Area" (compta/paiement/list.php — see
// paymentsListParser.ts): every payment received in the chosen period, with
// the bank entry and account each one was booked to. The period is a real
// backend filter; search, sorting and paging run on the returned rows.
export function PaymentsListPage() {
  const [from, setFrom] = useState(firstOfMonthIso())
  const [to, setTo] = useState(todayIso())
  const [applied, setApplied] = useState({ from: firstOfMonthIso(), to: todayIso() })
  const { data, isLoading, isFetching, isError, error, refetch } = usePayments(applied)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [search, setSearch] = useState('')

  const rows = useMemo(() => data?.items ?? [], [data])
  const filtered = useMemo(() => rows.filter((r) => matchesSearch(r, search)), [rows, search])
  const { sorted, sort, toggleSort } = useSortableRows<PaymentRow, SortKey>(filtered, sortValue)
  const pageRows = sorted.slice((page - 1) * perPage, page * perPage)

  const total = sorted.reduce((sum, r) => sum + r.amount, 0)

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handlePerPageChange(value: number) {
    setPerPage(value)
    setPage(1)
  }

  function getExportData() {
    const exportRows = sorted.map((r) => [r.ref, fmtDate(r.paymentDate), r.customerName || '-', r.paymentTypeLabel || '-', r.paymentReference || '-', r.bankEntryId ? String(r.bankEntryId) : '-', r.accountName || '-', formatMoney(r.amount)])
    return { headers: COLUMN_LABELS, rows: exportRows }
  }

  if (isError && !data) {
    return (
      <div className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Flag size={20} className="text-brand" /> Report Area
        </h2>
        <LegacyErrorCard title="Couldn't load the payments" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
      </div>
    )
  }

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Flag size={20} className="text-brand" /> Report Area
        </h2>
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
        <Card className="!h-auto">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-text-faint mb-1">Report period</label>
              <div className="flex items-center gap-2">
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
                <span className="text-text-faint">-</span>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
              </div>
            </div>
            <button
              type="button"
              disabled={isFetching}
              onClick={() => {
                setApplied({ from, to })
                setPage(1)
              }}
              className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
            >
              {isFetching && <Loader2 size={14} className="animate-spin" />} View Report
            </button>
          </div>
        </Card>

        <h3 className="text-base font-semibold text-text!">Payments Received From Customers</h3>

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
            <TableExportButtons title="Payments Received From Customers" getExportData={getExportData} />
          </div>
          <div className={`flex-1 min-h-0 overflow-auto transition-opacity ${isFetching && data ? 'opacity-60' : ''}`}>
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <TheadRow>
                  <Th sortKey="ref" sort={sort} onSort={toggleSort}>
                    Ref.Payment
                  </Th>
                  <Th sortKey="paymentDate" sort={sort} onSort={toggleSort}>
                    Date
                  </Th>
                  <Th sortKey="customerName" sort={sort} onSort={toggleSort}>
                    Third-Party
                  </Th>
                  <Th sortKey="paymentTypeLabel" sort={sort} onSort={toggleSort}>
                    Type
                  </Th>
                  <Th sortKey="paymentReference" sort={sort} onSort={toggleSort}>
                    Number
                  </Th>
                  <Th sortKey="bankEntryId" sort={sort} onSort={toggleSort}>
                    Bank Entry
                  </Th>
                  <Th sortKey="accountName" sort={sort} onSort={toggleSort}>
                    Account
                  </Th>
                  <Th sortKey="amount" sort={sort} onSort={toggleSort} align="right">
                    Amount
                  </Th>
                </TheadRow>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-4 text-text-faint italic">
                      Loading…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-4 text-text-faint italic">
                      {rows.length === 0 ? 'No Data Available In Table' : `No payments match "${search}".`}
                    </td>
                  </tr>
                ) : (
                  <>
                    {pageRows.map((r, i) => (
                      <tr key={`${r.ref}-${i}`} className="border-b border-border last:border-0 hover:bg-surface-hover">
                        <td className="px-4 py-3 text-brand font-medium whitespace-nowrap">{r.ref}</td>
                        <td className="px-4 py-3 text-text-muted whitespace-nowrap">{fmtDate(r.paymentDate)}</td>
                        <td className="px-4 py-3">
                          {r.socid ? (
                            <Link to={ROUTES.customerDetail.replace(':id', String(r.socid))} className="text-brand hover:underline">
                              {r.customerName || '-'}
                            </Link>
                          ) : (
                            <span className="text-text!">{r.customerName || '-'}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-text-muted">{r.paymentTypeLabel || '-'}</td>
                        <td className="px-4 py-3 text-text-muted">{r.paymentReference || '-'}</td>
                        <td className="px-4 py-3">
                          {r.bankEntryId ? (
                            <Link to={ROUTES.bankingEntryDetail.replace(':id', String(r.bankEntryId))} className="text-brand hover:underline">
                              {r.bankEntryId}
                            </Link>
                          ) : (
                            <span className="text-text-faint">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {r.accountId ? (
                            <Link to={ROUTES.bankingAccountDetail.replace(':id', String(r.accountId))} className="text-brand hover:underline">
                              {r.accountName}
                            </Link>
                          ) : (
                            <span className="text-text-faint">{r.accountName || '-'}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-text!">{formatMoney(r.amount)}</td>
                      </tr>
                    ))}
                    <tr className="font-semibold text-text!">
                      <td className="px-4 py-3" colSpan={7}>
                        Total
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatMoney(total)}</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      <ListPagination page={page} perPage={perPage} total={filtered.length} onPageChange={setPage} edgeToEdge />
    </div>
  )
}
