import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingCart, Plus, User, FileText, Check, TriangleAlert, Search, CalendarDays, CreditCard, X, LoaderCircle } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card, ICON_STYLES, fmtZMW } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { formatMoney } from '../../../utils/format'
import { useMarkInvoicePaid, useRecordInvoicePayment, type InvoiceRow, type InvoicesSummary } from '../invoices.queries'

const COLUMNS = ['Ref', 'Invoice No', 'Invoice Date', 'Third-Party', 'City', 'Payment Type', 'Amount (Incl. Tax)', 'Author', 'Status', 'Zra Status', 'Actions']
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

function matchesSearch(row: InvoiceRow, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [row.ref, row.invoiceNo, row.thirdParty, row.city, row.paymentType, row.author, row.status, row.zraStatus].some((field) => field.toLowerCase().includes(q))
}

function RecordPaymentForm({ row, onClose }: { row: InvoiceRow; onClose: () => void }) {
  const recordPayment = useRecordInvoicePayment()
  const [amount, setAmount] = useState(row.amountInclTax)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit() {
    setError('')
    if (amount <= 0) {
      setError('Amount must be greater than zero.')
      return
    }
    try {
      await recordPayment.mutateAsync({ invoiceId: row.id, amount, note })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record payment')
    }
  }

  return (
    <Card className="border-brand/40 mb-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-text!">Record Payment — {row.ref}</h3>
        <button type="button" onClick={onClose} className="p-1 rounded-md text-text-faint hover:bg-surface-hover">
          <X size={16} />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-text">Amount</span>
          <input
            type="number"
            min={0}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-text">Note</span>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2" />
        </label>
      </div>
      {error && <p className="text-sm text-danger mt-2">{error}</p>}
      <div className="flex justify-end mt-3">
        <button
          type="button"
          disabled={recordPayment.isPending}
          onClick={handleSubmit}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {recordPayment.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />} Submit payment
        </button>
      </div>
    </Card>
  )
}

function RowActions({ row, payingRef, onTogglePay }: { row: InvoiceRow; payingRef: string | null; onTogglePay: (ref: string | null) => void }) {
  const markPaid = useMarkInvoicePaid()
  if (!row.canRecordPayment) return <span className="text-text-faint">-</span>
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={markPaid.isPending}
        onClick={() => markPaid.mutate(row.id)}
        className="flex items-center gap-1 text-xs font-medium text-success hover:underline disabled:opacity-60"
      >
        <Check size={12} /> Mark Paid
      </button>
      <button
        type="button"
        onClick={() => onTogglePay(payingRef === row.ref ? null : row.ref)}
        className="flex items-center gap-1 text-xs font-medium text-brand hover:underline"
      >
        <CreditCard size={12} /> Pay…
      </button>
    </div>
  )
}

export function InvoicesList({ summary }: { summary: InvoicesSummary }) {
  const [payingRef, setPayingRef] = useState<string | null>(null)
  const payingRow = summary.rows.find((r) => r.ref === payingRef)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [search, setSearch] = useState('')

  const filteredRows = useMemo(() => summary.rows.filter((r) => matchesSearch(r, search)), [summary.rows, search])
  const pageRows = filteredRows.slice((page - 1) * perPage, page * perPage)

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handlePerPageChange(value: number) {
    setPerPage(value)
    setPage(1)
  }

  function getExportData() {
    const headers = COLUMNS.slice(0, -1)
    const rows = filteredRows.map((r) => [
      r.ref,
      r.invoiceNo,
      r.invoiceDate,
      r.thirdParty,
      r.city,
      r.paymentType,
      `${formatMoney(r.amountInclTax)} ZMW`,
      r.author,
      r.status,
      r.zraStatus,
    ])
    return { headers, rows }
  }

  return (
    // -m-6 + flex-1 flex-col: same pattern as ThirdPartyList.tsx / StickyFormShell.tsx.
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <ShoppingCart size={20} className="text-brand" /> Sales Invoices
        </h2>
        <div className="flex items-center gap-2">
          <Link to={ROUTES.invoiceCreate} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover">
            <Plus size={14} /> New Quick Invoice
          </Link>
          <Link to={ROUTES.invoiceCreate} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover">
            <Plus size={14} /> New Detailed Invoice
          </Link>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card className="!p-3 !flex-row items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Clients</p>
              <p className="text-xl font-bold text-text! mt-1">{summary.clients}</p>
              <p className="text-xs text-text-faint mt-0.5">Customer records</p>
            </div>
            <span className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${ICON_STYLES.blue}`}>
              <User size={20} />
            </span>
          </Card>
          <Card className="!p-3 !flex-row items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Invoices</p>
              <p className="text-xl font-bold text-text! mt-1">{summary.invoices}</p>
              <p className="text-xs text-text-faint mt-0.5">Sales invoices</p>
            </div>
            <span className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${ICON_STYLES.cyan}`}>
              <FileText size={20} />
            </span>
          </Card>
          <Card className="!p-3 !flex-row items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Paid</p>
              <p className="text-xl font-bold text-text! mt-1">{fmtZMW(summary.paidAmount)}</p>
              <p className="text-xs text-text-faint mt-0.5">Collected amount</p>
            </div>
            <span className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${ICON_STYLES.green}`}>
              <Check size={20} />
            </span>
          </Card>
          <Card className="!p-3 !flex-row items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Unpaid</p>
              <p className="text-xl font-bold text-text! mt-1">{fmtZMW(summary.unpaidAmount)}</p>
              <p className="text-xs text-text-faint mt-0.5">Outstanding amount</p>
            </div>
            <span className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${ICON_STYLES.rose}`}>
              <TriangleAlert size={20} />
            </span>
          </Card>
        </div>

        {payingRow && <RecordPaymentForm row={payingRow} onClose={() => setPayingRef(null)} />}

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
            <TableExportButtons title="Sales Invoices" getExportData={getExportData} />
            <button type="button" disabled title="Not built yet" className="p-2 rounded-md border border-input-border bg-input-bg text-text-faint cursor-default ml-auto">
              <CalendarDays size={14} />
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                  {COLUMNS.map((col) => (
                    <th key={col} className="font-medium px-4 py-2.5 whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summary.rows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-text-faint italic" colSpan={COLUMNS.length}>
                      No Data Available In Table
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-text-faint italic" colSpan={COLUMNS.length}>
                      No invoices match "{search}".
                    </td>
                  </tr>
                ) : (
                  pageRows.map((r) => (
                    <tr key={r.ref} className="border-b border-border">
                      <td className="px-4 py-3 text-brand">{r.ref}</td>
                      <td className="px-4 py-3 text-text-muted">{r.invoiceNo}</td>
                      <td className="px-4 py-3 text-text-muted whitespace-nowrap">{r.invoiceDate}</td>
                      <td className="px-4 py-3 text-text!">{r.thirdParty}</td>
                      <td className="px-4 py-3 text-text-muted">{r.city}</td>
                      <td className="px-4 py-3 text-text-muted">{r.paymentType}</td>
                      <td className="px-4 py-3 text-text! text-right tabular-nums">{formatMoney(r.amountInclTax)} ZMW</td>
                      <td className="px-4 py-3 text-text-muted">{r.author}</td>
                      <td className="px-4 py-3 text-text-muted">{r.status}</td>
                      <td className="px-4 py-3 text-text-muted">{r.zraStatus}</td>
                      <td className="px-4 py-3">
                        <RowActions row={r} payingRef={payingRef} onTogglePay={setPayingRef} />
                      </td>
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
