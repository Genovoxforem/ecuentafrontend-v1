import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Hourglass, Loader2, Search } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { ROUTES } from '../../../routes'
import { formatMoney } from '../../../utils/format'
import type { DuePaymentRow } from '../../../api/payments'
import { useDuePayments } from '../duePayments.queries'

type SortKey = 'ref' | 'customer' | 'invoiceDate' | 'dueDate' | 'daysOverdue' | 'total' | 'paid' | 'remaining'

const COLUMNS: { label: string; key: SortKey; numeric?: boolean }[] = [
  { label: 'Invoice', key: 'ref' },
  { label: 'Third-Party', key: 'customer' },
  { label: 'Invoice Date', key: 'invoiceDate' },
  { label: 'Due Date', key: 'dueDate' },
  { label: 'Days Overdue', key: 'daysOverdue', numeric: true },
  { label: 'Total', key: 'total', numeric: true },
  { label: 'Paid', key: 'paid', numeric: true },
  { label: 'Remaining', key: 'remaining', numeric: true },
]

const BUCKETS: { key: DuePaymentRow['aging_bucket']; label: string }[] = [
  { key: 'current', label: 'Not yet due' },
  { key: 'd1_30', label: '1-30 days' },
  { key: 'd31_60', label: '31-60 days' },
  { key: 'd61_90', label: '61-90 days' },
  { key: 'd90_plus', label: 'Over 90 days' },
]

function sortValue(r: DuePaymentRow, key: SortKey): string | number {
  switch (key) {
    case 'ref':
      return r.ref
    case 'customer':
      return r.third_party_name
    case 'invoiceDate':
      return r.invoice_date
    case 'dueDate':
      return r.due_date
    case 'daysOverdue':
      return r.days_overdue
    case 'total':
      return r.total_ttc
    case 'paid':
      return r.paid
    case 'remaining':
      return r.remaining
  }
}

const fmtDate = (v: string) => {
  const m = v?.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[2]}/${m[3]}/${m[1]}` : (v ?? '')
}

// Customers owed, with ageing (compta/facture/fapi/due_payments.php).
export function DuePaymentsPage() {
  const [asOf, setAsOf] = useState('')
  const [overdueOnly, setOverdueOnly] = useState(false)
  const [search, setSearch] = useState('')
  const { data, isLoading, isFetching, isError, error, refetch } = useDuePayments({ date: asOf, overdueOnly })

  const rows = useMemo(() => data?.items ?? [], [data])
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? rows.filter((r) => [r.ref, r.ref_client, r.third_party_name].some((f) => (f ?? '').toLowerCase().includes(q))) : rows
  }, [rows, search])
  const { sorted, sort, toggleSort } = useSortableRows<DuePaymentRow, SortKey>(filtered, sortValue)

  if (isError && !data) {
    return <LegacyErrorCard title="Couldn't load the due payments" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  }

  const currency = rows[0]?.currency ?? 'ZMW'

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Hourglass size={20} className="text-brand" /> Due payments{data ? ` as of ${fmtDate(data.as_of)}` : ''}
        </h2>
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="!h-auto">
            <p className="text-xs text-text-faint">Total owed</p>
            <p className="text-lg font-bold text-text!">
              {formatMoney(data?.totals.remaining ?? 0)} {currency}
            </p>
            <p className="text-xs text-text-muted">
              {data?.totals.invoices ?? 0} invoices · {data?.totals.customers ?? 0} customers
            </p>
          </Card>
          {BUCKETS.map((b) => (
            <Card key={b.key} className="!h-auto">
              <p className="text-xs text-text-faint">{b.label}</p>
              <p className={`text-lg font-bold ${b.key === 'current' ? 'text-text!' : 'text-danger'}`}>{formatMoney(data?.aging[b.key] ?? 0)}</p>
            </Card>
          ))}
        </div>

        <Card className="!p-0 overflow-hidden flex-1 min-h-0">
          <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
            <label className="flex items-center gap-2 text-sm text-text-muted">
              As of
              <input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5" />
            </label>
            <label className="flex items-center gap-2 text-sm text-text-muted">
              <input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} /> Overdue only
            </label>
            <div className="relative w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search"
                className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text pl-8 pr-3 py-1.5"
              />
            </div>
            {isFetching && <Loader2 size={14} className="animate-spin text-text-faint" />}
            <TableExportButtons
              title="Due payments"
              getExportData={() => ({
                headers: COLUMNS.map((c) => c.label),
                rows: sorted.map((r) => [r.ref, r.third_party_name, fmtDate(r.invoice_date), fmtDate(r.due_date), String(r.days_overdue), formatMoney(r.total_ttc), formatMoney(r.paid), formatMoney(r.remaining)]),
              })}
            />
          </div>
          <div className={`flex-1 min-h-0 overflow-auto transition-opacity ${isFetching && data ? 'opacity-60' : ''}`}>
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <TheadRow>
                  {COLUMNS.map((col) => (
                    <Th key={col.key} sortKey={col.key} sort={sort} onSort={toggleSort} align={col.numeric ? 'right' : 'left'}>
                      {col.label}
                    </Th>
                  ))}
                </TheadRow>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={COLUMNS.length} className="px-4 py-8 text-center text-text-faint">
                      <Loader2 size={16} className="inline animate-spin" /> Loading…
                    </td>
                  </tr>
                ) : sorted.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMNS.length} className="px-4 py-8 text-center text-text-faint italic">
                      No unpaid customer invoices.
                    </td>
                  </tr>
                ) : (
                  sorted.map((r) => (
                    <tr key={r.invoice_id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5 font-medium">
                        <Link to={ROUTES.invoiceDetail.replace(':id', String(r.invoice_id))} className="text-brand hover:underline">
                          {r.ref}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        <Link to={ROUTES.customerDetail.replace(':id', String(r.socid))} className="text-brand hover:underline">
                          {r.third_party_name}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-text-muted whitespace-nowrap">{fmtDate(r.invoice_date)}</td>
                      <td className="px-4 py-2.5 text-text-muted whitespace-nowrap">{fmtDate(r.due_date)}</td>
                      <td className={`px-4 py-2.5 text-right ${r.days_overdue > 0 ? 'text-danger' : 'text-text-muted'}`}>{r.days_overdue > 0 ? r.days_overdue : '—'}</td>
                      <td className="px-4 py-2.5 text-right text-text-muted">{formatMoney(r.total_ttc)}</td>
                      <td className="px-4 py-2.5 text-right text-text-muted">{formatMoney(r.paid)}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-text!">{formatMoney(r.remaining)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
