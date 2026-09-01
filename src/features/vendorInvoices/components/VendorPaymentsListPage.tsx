import { useMemo, useState } from 'react'
import { Flag, Search } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { formatMoney, formatDateTimeAmPm } from '../../../utils/format'
import { usePurchasePayments, type PurchasePaymentRow } from '../vendorPayments.queries'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

type SortKey = 'ref' | 'paymentDate' | 'thirdPartyName' | 'paymentTypeLabel' | 'paymentReference' | 'accountLabel' | 'amount'

const COLUMNS: { label: string; key: SortKey }[] = [
  { label: 'Ref.Payment', key: 'ref' },
  { label: 'Date', key: 'paymentDate' },
  { label: 'Third-Party', key: 'thirdPartyName' },
  { label: 'Type', key: 'paymentTypeLabel' },
  { label: 'Number', key: 'paymentReference' },
  { label: 'Account', key: 'accountLabel' },
  { label: 'Amount', key: 'amount' },
]
const COLUMN_LABELS = COLUMNS.map((c) => c.label)

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function matchesSearch(r: PurchasePaymentRow, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [r.ref, r.thirdPartyName ?? '', r.paymentTypeLabel ?? '', r.paymentReference ?? '', r.accountLabel ?? ''].some((field) => field.toLowerCase().includes(q))
}

function sortValue(r: PurchasePaymentRow, key: SortKey): string | number {
  switch (key) {
    case 'ref':
      return r.ref
    case 'paymentDate':
      return r.paymentDate
    case 'thirdPartyName':
      return r.thirdPartyName ?? ''
    case 'paymentTypeLabel':
      return r.paymentTypeLabel ?? ''
    case 'paymentReference':
      return r.paymentReference ?? ''
    case 'accountLabel':
      return r.accountLabel ?? ''
    case 'amount':
      return r.amount
  }
}

// Real GET /api/purchase-payments/ data (see vendorPayments.queries.ts),
// against llx_paiementfourn. Defaults the report period to today, matching
// the legacy "Vendor Payments" page's own default (which genuinely shows
// no rows most days — payments cluster on the dates they were recorded).
export function VendorPaymentsListPage() {
  const { data, isLoading, isError } = usePurchasePayments()
  const [from, setFrom] = useState(todayIso())
  const [to, setTo] = useState(todayIso())
  const [applied, setApplied] = useState({ from: todayIso(), to: todayIso() })
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [search, setSearch] = useState('')

  const rows = useMemo(() => data?.items ?? [], [data])
  const dateFiltered = useMemo(() => {
    const fromDate = new Date(applied.from)
    const toDate = new Date(applied.to)
    toDate.setHours(23, 59, 59, 999)
    return rows.filter((r) => {
      const d = new Date(r.paymentDate)
      return !Number.isNaN(d.getTime()) && d >= fromDate && d <= toDate
    })
  }, [rows, applied])
  const filtered = useMemo(() => dateFiltered.filter((r) => matchesSearch(r, search)), [dateFiltered, search])
  const { sorted, sort, toggleSort } = useSortableRows<PurchasePaymentRow, SortKey>(filtered, sortValue)
  const pageRows = sorted.slice((page - 1) * perPage, page * perPage)

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handlePerPageChange(value: number) {
    setPerPage(value)
    setPage(1)
  }

  function getExportData() {
    const exportRows = sorted.map((r) => [r.ref, formatDateTimeAmPm(r.paymentDate), r.thirdPartyName || '-', r.paymentTypeLabel || '-', r.paymentReference || '-', r.accountLabel || '-', formatMoney(r.amount)])
    return { headers: COLUMN_LABELS, rows: exportRows }
  }

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Flag size={20} className="text-brand" /> Vendor Payments
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
            <button type="button" onClick={() => setApplied({ from, to })} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
              View Report
            </button>
          </div>
        </Card>

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
            <TableExportButtons title="Vendor Payments" getExportData={getExportData} />
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
                ) : isError ? (
                  <tr>
                    <td colSpan={COLUMN_LABELS.length} className="px-4 py-4 text-danger">
                      Could not load vendor payments.
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMN_LABELS.length} className="px-4 py-4 text-text-faint italic">
                      {dateFiltered.length === 0 ? 'No Data Available In Table' : `No vendor payments match "${search}".`}
                    </td>
                  </tr>
                ) : (
                  pageRows.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                      <td className="px-4 py-3 text-brand font-medium">{r.ref}</td>
                      <td className="px-4 py-3 text-text-muted whitespace-nowrap">{formatDateTimeAmPm(r.paymentDate)}</td>
                      <td className="px-4 py-3 text-text!">{r.thirdPartyName || '-'}</td>
                      <td className="px-4 py-3 text-text-muted">{r.paymentTypeLabel || '-'}</td>
                      <td className="px-4 py-3 text-text-muted">{r.paymentReference || '-'}</td>
                      <td className="px-4 py-3 text-text-muted">{r.accountLabel || '-'}</td>
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
