import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { InBanner } from '../../../shared/components/layout/bannerSlot'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, User, FileText, Check, TriangleAlert, Search, CreditCard, X, LoaderCircle, QrCode } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card, ICON_STYLES, fmtZMW } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { DateRangeButton, useDateRange } from '../../../shared/components/DateRangeFilter'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { formatMoney } from '../../../utils/format'
import { Avatar } from '../../../shared/components/Avatar'
import { ZraQrDialog } from './ZraQrDialog'
import { useMarkInvoicePaid, useRecordInvoicePayment, type InvoiceRow, type InvoicesSummary } from '../invoices.queries'

type SortKey = 'ref' | 'invoiceNo' | 'invoiceDate' | 'thirdParty' | 'city' | 'paymentType' | 'amountInclTax' | 'author' | 'status' | 'zraStatus'

// "Actions" (Mark Paid / Pay…) has no underlying sortable field — its header
// is intentionally left out of COLUMNS/SortKey and rendered as a plain,
// non-clickable <Th> instead (see thead below), matching every other
// icon/action-only column across the app.
const COLUMNS: { label: string; key: SortKey }[] = [
  { label: 'Ref', key: 'ref' },
  { label: 'Invoice No', key: 'invoiceNo' },
  { label: 'Invoice Date', key: 'invoiceDate' },
  { label: 'Third-Party', key: 'thirdParty' },
  { label: 'City', key: 'city' },
  { label: 'Payment Type', key: 'paymentType' },
  { label: 'Amount (Incl. Tax)', key: 'amountInclTax' },
  { label: 'Author', key: 'author' },
  { label: 'Status', key: 'status' },
  { label: 'Zra Status', key: 'zraStatus' },
]
const COLUMN_LABELS = COLUMNS.map((c) => c.label)
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

function matchesSearch(row: InvoiceRow, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [row.ref, row.invoiceNo, row.thirdParty, row.city, row.paymentType, row.author, row.status, row.zraStatus].some((field) => field.toLowerCase().includes(q))
}

function sortValue(row: InvoiceRow, key: SortKey): string | number {
  switch (key) {
    case 'ref':
      return row.ref
    case 'invoiceNo':
      return row.invoiceNo
    case 'invoiceDate':
      return row.invoiceDate
    case 'thirdParty':
      return row.thirdParty
    case 'city':
      return row.city
    case 'paymentType':
      return row.paymentType
    case 'amountInclTax':
      return row.amountInclTax
    case 'author':
      return row.author
    case 'status':
      return row.status
    case 'zraStatus':
      return row.zraStatus
  }
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

// Two-letter initials badge, in the colour the classic list gives this third party.
function InitialsBadge({ name, color }: { name: string; color: string }) {
  const parts = name.split(' ').filter(Boolean)
  const initials = ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? parts[0]?.[1] ?? '')).toUpperCase() || '?'
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: color || '#397db9' }}>
      {initials}
    </span>
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

const STATUS_FILTER_LABELS = ['draft', 'unpaid', 'paid', 'abandoned']

// `statusFilter` narrows the list to one Dolibarr invoice status (the classic page's
// list.php?search_status=N): the Abandoned Invoices page is this same list with 3.
// The summary cards stay overall figures, as on the classic page.
export function InvoicesList({ summary, statusFilter }: { summary: InvoicesSummary; statusFilter?: number }) {
  const [payingRef, setPayingRef] = useState<string | null>(null)
  const [qrRow, setQrRow] = useState<InvoiceRow | null>(null)
  const payingRow = summary.rows.find((r) => r.ref === payingRef)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const dateRange = useDateRange()
  const [searchParams, setSearchParams] = useSearchParams()
  // Real customer-scoping filter — InvoiceRow.socid is a real plain field
  // straight off the JSON API (see invoices.queries.ts), no parsing needed.
  // Lets a customer's own Related Items tab ("View all" on Invoices) link
  // here instead of the legacy backend's own filtered list.php.
  const customerIdParam = searchParams.get('customerId')
  const customerId = customerIdParam ? Number(customerIdParam) : null
  // ?status=N — the classic list.php?search_status=N links (the dashboard's
  // "unpaid invoices" row is status 1: validated, not paid yet).
  const statusParam = searchParams.get('status')
  const urlStatus = statusParam !== null && /^[0-3]$/.test(statusParam) ? Number(statusParam) : undefined
  const activeStatus = statusFilter ?? urlStatus

  const scopedRows = useMemo(() => (activeStatus === undefined ? summary.rows : summary.rows.filter((r) => r.rawStatut === activeStatus)), [summary.rows, activeStatus])
  const customerScoped = useMemo(() => (customerId ? scopedRows.filter((r) => r.socid === customerId) : scopedRows), [scopedRows, customerId])
  const customerName = customerId ? customerScoped[0]?.thirdParty : null
  const filteredRows = useMemo(
    () => customerScoped.filter((r) => matchesSearch(r, deferredSearch) && dateRange.inRange(r.invoiceDate)),
    [customerScoped, deferredSearch, dateRange],
  )
  const { sorted: sortedRows, sort, toggleSort } = useSortableRows<InvoiceRow, SortKey>(filteredRows, sortValue)
  const pageRows = sortedRows.slice((page - 1) * perPage, page * perPage)

  useEffect(() => {
    setPage(1)
  }, [dateRange.key, dateRange.customFrom, dateRange.customTo])

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handlePerPageChange(value: number) {
    setPerPage(value)
    setPage(1)
  }

  function getExportData() {
    const headers = COLUMN_LABELS
    const rows = sortedRows.map((r) => [
      r.ref,
      r.invoiceNo,
      r.invoiceDateLabel || r.invoiceDate,
      r.thirdParty,
      r.city,
      r.paymentType,
      `${formatMoney(r.amountInclTax)} ZMW`,
      r.author,
      r.statusLabel || r.status,
      r.zraStatus,
    ])
    return { headers, rows }
  }

  return (
    // -m-6 + flex-1 flex-col: same pattern as ThirdPartyList.tsx / StickyFormShell.tsx.
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      {/* In the blue-metal theme the page banner carries this title and both buttons (PageBanner's BANNER_ACTIONS). */}
      <InBanner>
        <div className="flex items-center gap-2">
          <Link to={ROUTES.invoiceCreateQuick} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover">
            <Plus size={14} /> New Quick Invoice
          </Link>
          <Link to={ROUTES.invoiceCreate} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover">
            <Plus size={14} /> New Detailed Invoice
          </Link>
        </div>
      </InBanner>

      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-[16px] py-4">
        {statusFilter === undefined && urlStatus !== undefined && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-brand/30 bg-brand/5 px-4 py-2 text-sm">
            <span className="text-text!">
              Showing only <span className="font-semibold">{STATUS_FILTER_LABELS[urlStatus]}</span> invoices
            </span>
            <button
              type="button"
              onClick={() => {
                const next = new URLSearchParams(searchParams)
                next.delete('status')
                setSearchParams(next)
                setPage(1)
              }}
              className="flex items-center gap-1 text-xs font-medium text-brand hover:underline"
            >
              <X size={12} /> Clear filter
            </button>
          </div>
        )}
        {customerId && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-brand/30 bg-brand/5 px-4 py-2 text-sm">
            <span className="text-text!">
              Showing only invoices for <span className="font-semibold">{customerName ?? `customer #${customerId}`}</span>
            </span>
            <button
              type="button"
              onClick={() => {
                const next = new URLSearchParams(searchParams)
                next.delete('customerId')
                setSearchParams(next)
              }}
              className="flex items-center gap-1 text-xs font-medium text-brand hover:underline"
            >
              <X size={12} /> Clear filter
            </button>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card className="invoice-summary-card !p-3 !flex-row items-center justify-between gap-3">
            <div>
              <p className="invoice-summary-label text-xs font-semibold text-text-muted uppercase tracking-wide">Clients</p>
              <p className="invoice-summary-value text-xl font-bold text-text! mt-1">{summary.clients}</p>
              <p className="invoice-summary-caption text-xs text-text-faint mt-0.5">Customer records</p>
            </div>
            <span className={`invoice-summary-icon shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${ICON_STYLES.blue}`}>
              <User size={20} />
            </span>
          </Card>
          <Card className="invoice-summary-card !p-3 !flex-row items-center justify-between gap-3">
            <div>
              <p className="invoice-summary-label text-xs font-semibold text-text-muted uppercase tracking-wide">Invoices</p>
              <p className="invoice-summary-value text-xl font-bold text-text! mt-1">{summary.invoices}</p>
              <p className="invoice-summary-caption text-xs text-text-faint mt-0.5">Sales invoices</p>
            </div>
            <span className={`invoice-summary-icon shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${ICON_STYLES.cyan}`}>
              <FileText size={20} />
            </span>
          </Card>
          <Card className="invoice-summary-card !p-3 !flex-row items-center justify-between gap-3">
            <div>
              <p className="invoice-summary-label text-xs font-semibold text-text-muted uppercase tracking-wide">Paid</p>
              <p className="invoice-summary-value text-xl font-bold text-text! mt-1">{fmtZMW(summary.paidAmount)}</p>
              <p className="invoice-summary-caption text-xs text-text-faint mt-0.5">Collected amount</p>
            </div>
            <span className={`invoice-summary-icon shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${ICON_STYLES.green}`}>
              <Check size={20} />
            </span>
          </Card>
          <Card className="invoice-summary-card !p-3 !flex-row items-center justify-between gap-3">
            <div>
              <p className="invoice-summary-label text-xs font-semibold text-text-muted uppercase tracking-wide">Unpaid</p>
              <p className="invoice-summary-value text-xl font-bold text-text! mt-1">{fmtZMW(summary.unpaidAmount)}</p>
              <p className="invoice-summary-caption text-xs text-text-faint mt-0.5">Outstanding amount</p>
            </div>
            <span className={`invoice-summary-icon shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${ICON_STYLES.rose}`}>
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
            <DateRangeButton state={dateRange} />
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <TheadRow>
                  {COLUMNS.map((col) => (
                    <Th key={col.key} sortKey={col.key} sort={sort} onSort={toggleSort}>
                      {col.label}
                    </Th>
                  ))}
                  {/* Actions column has no underlying sortable data — plain, non-clickable header. */}
                  <Th>Actions</Th>
                </TheadRow>
              </thead>
              <tbody>
                {scopedRows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-text-faint italic" colSpan={COLUMN_LABELS.length + 1}>
                      No Data Available In Table
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-text-faint italic" colSpan={COLUMN_LABELS.length + 1}>
                      No invoices match "{search}".
                    </td>
                  </tr>
                ) : (
                  pageRows.map((r) => (
                    <tr key={r.ref} className="border-b border-border">
                      <td className="px-4 py-3 text-brand">
                        <Link to={ROUTES.invoiceDetail.replace(':id', String(r.id))} className="hover:underline">
                          {r.ref}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-text-muted">{r.invoiceNo}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-text-muted">
                        <div className="text-text!">{r.invoiceDateLabel || r.invoiceDate}</div>
                        {r.dueDate && <div className="text-xs text-text-faint">Due: {r.dueDate}</div>}
                      </td>
                      <td className="px-4 py-3">
                        {r.socid ? (
                          <Link to={ROUTES.customerDetail.replace(':id', String(r.socid))} className="inline-flex items-center gap-2 whitespace-nowrap text-brand hover:underline">
                            <InitialsBadge name={r.thirdParty} color={r.thirdPartyColor} />
                            {r.thirdParty}
                          </Link>
                        ) : (
                          <span className="inline-flex items-center gap-2 whitespace-nowrap text-text!">
                            <InitialsBadge name={r.thirdParty} color={r.thirdPartyColor} />
                            {r.thirdParty}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-text-muted">{r.city}</td>
                      <td className="px-4 py-3 text-text-muted">{r.paymentType}</td>
                      <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                        <div className="font-bold text-text!">{formatMoney(r.amountInclTax)}</div>
                        {(r.amountHt || r.vatAmount) && (
                          <div className="text-xs text-text-faint">
                            HT: {r.amountHt} | VAT: {r.vatAmount}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {r.author && (
                          <span className="inline-flex items-center gap-2 whitespace-nowrap">
                            <Avatar photo={r.authorPhoto || undefined} name={r.author} size={24} color="bg-brand" />
                            {r.authorId ? (
                              <Link to={ROUTES.userDetail.replace(':id', String(r.authorId))} className="text-brand hover:underline">
                                {r.author}
                              </Link>
                            ) : (
                              <span className="text-text-muted">{r.author}</span>
                            )}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-block rounded-md border border-border bg-surface px-2 py-0.5 text-xs font-medium text-text-muted">{r.statusLabel || r.status}</span>
                        {r.currency && <div className="mt-0.5 text-xs text-text-faint">Currency: {r.currency}</div>}
                      </td>
                      <td className={`px-4 py-3 whitespace-nowrap font-medium ${/succeed/i.test(r.zraStatus) ? 'text-success-fg' : /error|fail/i.test(r.zraStatus) ? 'text-warning-fg' : 'text-text-muted'}`}>
                        {r.zraStatus || '-'}
                        {r.zraQrUrl && (
                          <button type="button" onClick={() => setQrRow(r)} title="View QR code" className="ml-2 align-middle text-brand hover:opacity-70">
                            <QrCode size={15} />
                          </button>
                        )}
                      </td>
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
      {qrRow && <ZraQrDialog url={qrRow.zraQrUrl} invoiceRef={qrRow.ref} onClose={() => setQrRow(null)} />}
      <ListPagination page={page} perPage={perPage} total={filteredRows.length} onPageChange={setPage} edgeToEdge />
    </div>
  )
}
