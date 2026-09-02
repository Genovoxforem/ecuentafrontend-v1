import { useState } from 'react'
import { Receipt } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { useSalesInvoicesReport, type SalesInvoiceRow } from '../reports.queries'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { formatMoney } from '../../../utils/format'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

type SortKey = 'ref' | 'date' | 'customer' | 'paymentMode' | 'totalHt' | 'totalTtc' | 'paid' | 'remain' | 'status'

function sortValue(inv: SalesInvoiceRow, key: SortKey): string | number {
  switch (key) {
    case 'ref':
      return inv.ref
    case 'date':
      return inv.date
    case 'customer':
      return inv.customer
    case 'paymentMode':
      return inv.paymentMode
    case 'totalHt':
      return inv.totalHt
    case 'totalTtc':
      return inv.totalTtc
    case 'paid':
      return inv.paid
    case 'remain':
      return inv.remain
    case 'status':
      return inv.status
  }
}

function firstDayOfMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const STATUS_BADGE_CLS: Record<string, string> = {
  Paid: 'bg-success-bg text-success-fg',
  Partial: 'bg-warning-bg text-warning-fg',
  Unpaid: 'bg-danger-bg text-danger-fg',
  Draft: 'bg-neutral-bg text-neutral-fg',
  'Written Off': 'bg-neutral-bg text-neutral-fg',
}

// Real via compta/facture/listreport_api.php — see reports.queries.ts for
// the full evidence trail. A genuinely real, secured, filterable DataTables
// report ("Sales Invoices" in the Reports Center's real "Receivables"
// category).
export function SalesInvoicesReportView() {
  const [dateFrom, setDateFrom] = useState(firstDayOfMonth())
  const [dateTo, setDateTo] = useState(today())
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)
  const { data, isLoading, isError, error, refetch } = useSalesInvoicesReport(dateFrom, dateTo)
  const invoices = data?.invoices ?? []
  const { sorted: sortedInvoices, sort, toggleSort } = useSortableRows<SalesInvoiceRow, SortKey>(invoices, sortValue)
  const pageInvoices = sortedInvoices.slice((page - 1) * perPage, page * perPage)

  function getExportData() {
    return {
      headers: ['Ref', 'Date', 'Customer', 'Payment Mode', 'Total (Excl.)', 'Total (Incl.)', 'Paid', 'Balance Due', 'Status'],
      rows: sortedInvoices.map((inv) => [
        inv.ref,
        inv.date,
        inv.customer,
        inv.paymentMode,
        formatMoney(inv.totalHt),
        formatMoney(inv.totalTtc),
        formatMoney(inv.paid),
        formatMoney(inv.remain),
        inv.status,
      ]),
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Receipt size={20} className="text-brand" /> Sales Invoices
      </h2>

      <div className="flex flex-wrap items-center gap-2">
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={inputCls} title="From" />
        <span className="text-text-faint text-sm">to</span>
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={inputCls} title="To" />
      </div>

      {isLoading && <LegacyLoadingCard label="Loading sales invoices…" />}
      {isError && <LegacyErrorCard title="Couldn't load the report" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}

      {data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <Card className="!h-auto">
              <p className="text-xs text-text-faint">Total (Excl.)</p>
              <p className="font-semibold text-text!">{data.totals.ht}</p>
            </Card>
            <Card className="!h-auto">
              <p className="text-xs text-text-faint">VAT</p>
              <p className="font-semibold text-text!">{data.totals.vat}</p>
            </Card>
            <Card className="!h-auto">
              <p className="text-xs text-text-faint">Total (Incl.)</p>
              <p className="font-semibold text-text!">{data.totals.ttc}</p>
            </Card>
            <Card className="!h-auto">
              <p className="text-xs text-text-faint">Paid</p>
              <p className="font-semibold text-success-fg">{data.totals.paid}</p>
            </Card>
            <Card className="!h-auto">
              <p className="text-xs text-text-faint">Balance Due</p>
              <p className="font-semibold text-danger-fg">{data.totals.remain}</p>
            </Card>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value))
                setPage(1)
              }}
              className="h-9 px-2 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <TableExportButtons title="Sales Invoices" getExportData={getExportData} />
          </div>

          <Card className="!h-auto !p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <TheadRow>
                  <Th sortKey="ref" sort={sort} onSort={toggleSort}>Ref</Th>
                  <Th sortKey="date" sort={sort} onSort={toggleSort}>Date</Th>
                  <Th sortKey="customer" sort={sort} onSort={toggleSort}>Customer</Th>
                  <Th sortKey="paymentMode" sort={sort} onSort={toggleSort}>Payment Mode</Th>
                  <Th sortKey="totalHt" sort={sort} onSort={toggleSort} align="right">Total (Excl.)</Th>
                  <Th sortKey="totalTtc" sort={sort} onSort={toggleSort} align="right">Total (Incl.)</Th>
                  <Th sortKey="paid" sort={sort} onSort={toggleSort} align="right">Paid</Th>
                  <Th sortKey="remain" sort={sort} onSort={toggleSort} align="right">Balance Due</Th>
                  <Th sortKey="status" sort={sort} onSort={toggleSort}>Status</Th>
                </TheadRow>
              </thead>
              <tbody>
                {pageInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-4 text-text-faint italic">
                      No sales invoices found for the selected period.
                    </td>
                  </tr>
                ) : (
                  pageInvoices.map((inv, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 text-text!">{inv.ref}</td>
                      <td className="px-3 py-2 text-text-muted whitespace-nowrap">{inv.date}</td>
                      <td className="px-3 py-2 text-text-muted">{inv.customer}</td>
                      <td className="px-3 py-2 text-text-muted">{inv.paymentMode}</td>
                      <td className="px-3 py-2 text-right text-text-muted">{formatMoney(inv.totalHt)}</td>
                      <td className="px-3 py-2 text-right text-text!">{formatMoney(inv.totalTtc)}</td>
                      <td className="px-3 py-2 text-right text-success-fg">{formatMoney(inv.paid)}</td>
                      <td className="px-3 py-2 text-right text-danger-fg">{formatMoney(inv.remain)}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE_CLS[inv.status] ?? 'bg-neutral-bg text-neutral-fg'}`}>{inv.status}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card>

          <ListPagination page={page} perPage={perPage} total={sortedInvoices.length} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}
