import { useMemo, useState } from 'react'
import { FileBarChart2, Search } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { formatMoney, formatDateTimeAmPm } from '../../../utils/format'
import { usePayments, type PaymentRow } from '../payments.queries'
import { BackendUnavailableCard, isBackendUnavailable } from '../../../shared/components/BackendUnavailable'

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

// Real GET /api/payments/ data (see payments.queries.ts), grouped
// client-side by month/year — this backend has no per-period report
// endpoint of its own, so the grouping happens here rather than being
// invented server-side.
export function PaymentsReportPage() {
  const { data, isLoading, error } = usePayments()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth())
  const [year, setYear] = useState(now.getFullYear())
  const [applied, setApplied] = useState({ month: now.getMonth(), year: now.getFullYear() })
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [search, setSearch] = useState('')

  const rows = useMemo(() => data?.items ?? [], [data])
  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i)

  const periodFiltered = useMemo(
    () =>
      rows.filter((r) => {
        const d = new Date(r.paymentDate)
        return !Number.isNaN(d.getTime()) && d.getMonth() === applied.month && d.getFullYear() === applied.year
      }),
    [rows, applied],
  )
  const filtered = useMemo(() => periodFiltered.filter((r) => matchesSearch(r, search)), [periodFiltered, search])
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
    const exportRows = sorted.map((r) => [r.ref, formatDateTimeAmPm(r.paymentDate), r.customerName || '-', r.paymentTypeLabel || '-', formatMoney(r.amount)])
    return { headers: COLUMN_LABELS, rows: exportRows }
  }

  // api/payments/ doesn't exist on the current backend (see BackendUnavailable.tsx) — same
  // underlying query as PaymentsListPage, shown here too rather than letting this page fall
  // through to a silent "No Data Available" table.
  if (isBackendUnavailable(error)) {
    return (
      <div className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <FileBarChart2 size={20} className="text-brand" /> Payments reports
        </h2>
        <BackendUnavailableCard feature="Payments" />
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
            <button type="button" onClick={() => setApplied({ month, year })} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
              Create
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
          <div className="flex-1 min-h-0 overflow-auto">
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
                      {periodFiltered.length === 0 ? 'No Data Available In Table' : `No payments match "${search}".`}
                    </td>
                  </tr>
                ) : (
                  pageRows.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                      <td className="px-4 py-3 text-brand font-medium">{r.ref}</td>
                      <td className="px-4 py-3 text-text-muted whitespace-nowrap">{formatDateTimeAmPm(r.paymentDate)}</td>
                      <td className="px-4 py-3 text-text!">{r.customerName || '-'}</td>
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
