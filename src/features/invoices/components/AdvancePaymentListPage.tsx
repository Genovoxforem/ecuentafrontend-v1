import { useMemo, useState } from 'react'
import { HandCoins, Search } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { formatMoney } from '../../../utils/format'
import { useAdvancePayments, type AdvancePaymentRow } from '../advancePayments.queries'

const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

type SortKey = 'ref' | 'date' | 'thirdParty' | 'paymentTypeLabel' | 'author' | 'amount'

const COLUMNS: { label: string; key: SortKey }[] = [
  { label: 'Ref', key: 'ref' },
  { label: 'Date', key: 'date' },
  { label: 'Third-Party', key: 'thirdParty' },
  { label: 'Payment Type', key: 'paymentTypeLabel' },
  { label: 'Author', key: 'author' },
  { label: 'Total Advance', key: 'amount' },
]
const COLUMN_LABELS = COLUMNS.map((c) => c.label)

function fmtDate(v: string) {
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
}

function matchesSearch(r: AdvancePaymentRow, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [r.ref, r.thirdParty ?? '', r.paymentTypeLabel ?? '', r.author ?? ''].some((field) => field.toLowerCase().includes(q))
}

function sortValue(r: AdvancePaymentRow, key: SortKey): string | number {
  switch (key) {
    case 'ref':
      return r.ref
    case 'date':
      return r.date
    case 'thirdParty':
      return r.thirdParty ?? ''
    case 'paymentTypeLabel':
      return r.paymentTypeLabel ?? ''
    case 'author':
      return r.author ?? ''
    case 'amount':
      return r.amount
  }
}

// Real GET /api/invoices/advance-payments/ data (see
// advancePayments.queries.ts), reading llx_paiement_advance directly.
export function AdvancePaymentListPage() {
  const { data, isLoading, isError } = useAdvancePayments()
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [search, setSearch] = useState('')

  const rows = useMemo(() => data?.items ?? [], [data])
  const filteredRows = useMemo(() => rows.filter((r) => matchesSearch(r, search)), [rows, search])
  const { sorted, sort, toggleSort } = useSortableRows<AdvancePaymentRow, SortKey>(filteredRows, sortValue)
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
    const exportRows = sorted.map((r) => [r.ref, fmtDate(r.date), r.thirdParty || '-', r.paymentTypeLabel || '-', r.author || '-', formatMoney(r.amount)])
    return { headers: COLUMN_LABELS, rows: exportRows }
  }

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <HandCoins size={20} className="text-brand" /> Customer Advance Payments
        </h2>
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
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
            <TableExportButtons title="Customer Advance Payments" getExportData={getExportData} />
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
                      Could not load advance payments.
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMN_LABELS.length} className="px-4 py-4 text-text-faint italic">
                      No Data Available In Table
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMN_LABELS.length} className="px-4 py-4 text-text-faint italic">
                      No advance payments match "{search}".
                    </td>
                  </tr>
                ) : (
                  pageRows.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                      <td className="px-4 py-3 text-brand font-medium">{r.ref}</td>
                      <td className="px-4 py-3 text-text-muted whitespace-nowrap">{fmtDate(r.date)}</td>
                      <td className="px-4 py-3 text-text!">{r.thirdParty || '-'}</td>
                      <td className="px-4 py-3 text-text-muted">{r.paymentTypeLabel || '-'}</td>
                      <td className="px-4 py-3 text-text-muted">{r.author || '-'}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-text!">{formatMoney(r.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      <ListPagination page={page} perPage={perPage} total={filteredRows.length} onPageChange={setPage} edgeToEdge />
    </div>
  )
}
