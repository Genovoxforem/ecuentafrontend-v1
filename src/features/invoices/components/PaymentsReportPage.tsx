import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileBarChart2, Loader2, Search } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { ROUTES } from '../../../routes'
import { formatMoney } from '../../../utils/format'
import { usePayments, type PaymentRow } from '../payments.queries'

const selectCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none appearance-none'
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

type SortKey = 'ref' | 'paymentDate' | 'customerName' | 'paymentTypeLabel' | 'amount'

const COLUMNS: { label: string; key: SortKey }[] = [
  { label: 'Ref.Payment', key: 'ref' },
  { label: 'Date', key: 'paymentDate' },
  { label: 'Third-Party', key: 'customerName' },
  { label: 'Type', key: 'paymentTypeLabel' },
  { label: 'Amount', key: 'amount' },
]
const COLUMN_LABELS = COLUMNS.map((c) => c.label)

const pad = (n: number) => String(n).padStart(2, '0')
// The whole calendar month as a backend period.
function monthPeriod(year: number, month: number) {
  const last = new Date(year, month + 1, 0).getDate()
  return { from: `${year}-${pad(month + 1)}-01`, to: `${year}-${pad(month + 1)}-${pad(last)}` }
}
const fmtDate = (v: string) => {
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? `${m[2]}/${m[3]}/${m[1]}` : v
}

function matchesSearch(r: PaymentRow, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [r.ref, r.customerName ?? '', r.paymentTypeLabel ?? ''].some((field) => field.toLowerCase().includes(q))
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
    case 'amount':
      return r.amount
  }
}

// Payments received in one calendar month — the same real payments list as the
// Report Area page (compta/paiement/list.php, see paymentsListParser.ts) asked
// for that month's period; the total and the table are that period's rows.
export function PaymentsReportPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth())
  const [year, setYear] = useState(now.getFullYear())
  const [applied, setApplied] = useState({ month: now.getMonth(), year: now.getFullYear() })
  const { data, isLoading, isFetching, isError, error, refetch } = usePayments(monthPeriod(applied.year, applied.month))
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [search, setSearch] = useState('')

  const rows = useMemo(() => data?.items ?? [], [data])
  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i)

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
    const exportRows = sorted.map((r) => [r.ref, fmtDate(r.paymentDate), r.customerName || '-', r.paymentTypeLabel || '-', formatMoney(r.amount)])
    return { headers: COLUMN_LABELS, rows: exportRows }
  }

  if (isError && !data) {
    return (
      <div className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <FileBarChart2 size={20} className="text-brand" /> Payments reports
        </h2>
        <LegacyErrorCard title="Couldn't load the payments report" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
      </div>
    )
  }

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <FileBarChart2 size={20} className="text-brand" /> Payments reports for {applied.year}
        </h2>
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
        <Card className="!h-auto">
          <div className="flex flex-wrap items-end gap-3">
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className={selectCls}>
              {MONTHS.map((m, i) => (
                <option key={m} value={i}>
                  {m}
                </option>
              ))}
            </select>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={selectCls}>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={isFetching}
              onClick={() => {
                setApplied({ month, year })
                setPage(1)
              }}
              className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
            >
              {isFetching && <Loader2 size={14} className="animate-spin" />} Create
            </button>
          </div>
        </Card>

        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-alt px-4 py-3">
          <span className="text-sm text-text-muted">
            Total received in {MONTHS[applied.month]} {applied.year}
          </span>
          <span className="text-lg font-bold text-text!">{formatMoney(total)} ZMW</span>
        </div>

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
            <TableExportButtons title={`Payments Report ${MONTHS[applied.month]} ${applied.year}`} getExportData={getExportData} />
          </div>
          <div className={`flex-1 min-h-0 overflow-auto transition-opacity ${isFetching && data ? 'opacity-60' : ''}`}>
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <TheadRow>
                  {COLUMNS.map((col) => (
                    <Th key={col.key} sortKey={col.key} sort={sort} onSort={toggleSort} align={col.key === 'amount' ? 'right' : 'left'}>
                      {col.label}
                    </Th>
                  ))}
                </TheadRow>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={COLUMN_LABELS.length} className="px-4 py-4 text-text-faint italic">
                      Loading…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMN_LABELS.length} className="px-4 py-4 text-text-faint italic">
                      {rows.length === 0 ? 'No Data Available In Table' : `No payments match "${search}".`}
                    </td>
                  </tr>
                ) : (
                  pageRows.map((r, i) => (
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
                      <td className="px-4 py-3 text-right tabular-nums text-text!">{formatMoney(r.amount)}</td>
                    </tr>
                  ))
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
