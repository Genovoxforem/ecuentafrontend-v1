import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Lock, Truck, FileText, Bot, HandCoins, Search, X as XIcon, MoreVertical, Check, CalendarRange } from 'lucide-react'
import { Card, ICON_STYLES } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { ROUTES } from '../../../routes'
import { formatMoney } from '../../../utils/format'
import { useVendorInvoices, vendorInvoiceStatusLabel, type VendorInvoiceStatus, type VendorInvoiceRow } from '../vendorInvoices.queries'

const PAGE_SIZE_OPTIONS = [15, 25, 50, 100, 250, 500]

// The classic page's toolbar buttons (list.php and its importlist.php views).
const TABS: { status: VendorInvoiceStatus; label: string; path: string }[] = [
  { status: 'all', label: 'All', path: ROUTES.vendorInvoiceList },
  { status: 'manual', label: 'Manual Purchases', path: ROUTES.vendorInvoiceManual },
  { status: 'automatic', label: 'Automatic Purchases', path: ROUTES.vendorInvoiceAutomatic },
  { status: 'expense', label: 'Marked As Expense', path: ROUTES.vendorInvoiceExpense },
  { status: 'imports', label: 'Imports(ASYCUDA)', path: ROUTES.vendorInvoiceImports },
]

// The classic page's ⋮ menu (list.php?search_status=N). Paid / Un Paid keep their own routes.
const STATUS_MENU: { status: VendorInvoiceStatus; label: string; path: string }[] = [
  { status: 'all', label: 'All', path: ROUTES.vendorInvoiceList },
  { status: 'draft', label: 'Draft', path: `${ROUTES.vendorInvoiceList}?status=draft` },
  { status: 'validated', label: 'Validated', path: `${ROUTES.vendorInvoiceList}?status=validated` },
  { status: 'succeeded', label: 'Succeeded', path: `${ROUTES.vendorInvoiceList}?status=succeeded` },
  { status: 'notSucceeded', label: 'Not Succeeded', path: `${ROUTES.vendorInvoiceList}?status=notSucceeded` },
  { status: 'paid', label: 'Paid', path: ROUTES.vendorInvoicePaid },
  { status: 'unpaid', label: 'Un Paid', path: ROUTES.vendorInvoiceUnpaid },
  { status: 'abandoned', label: 'Abandoned', path: `${ROUTES.vendorInvoiceList}?status=abandoned` },
]
const URL_STATUSES = new Set<VendorInvoiceStatus>(['draft', 'validated', 'succeeded', 'notSucceeded', 'abandoned'])

type SortKey = 'ref' | 'refVendor' | 'invoiceDate' | 'thirdParty' | 'paymentType' | 'amount' | 'saleTypeCode' | 'registrationTypeCode' | 'status' | 'zraStatus'

function sortValue(r: VendorInvoiceRow, key: SortKey): string | number {
  switch (key) {
    case 'ref':
      return r.ref
    case 'refVendor':
      return r.refSupplier ?? ''
    case 'invoiceDate':
      return r.invoiceDate ?? ''
    case 'thirdParty':
      return r.thirdPartyName ?? ''
    case 'paymentType':
      return r.paymentTypeLabel ?? ''
    case 'amount':
      return r.amountTtc
    case 'saleTypeCode':
      return r.saleTypeCode ?? ''
    case 'registrationTypeCode':
      return r.registrationTypeCode ?? ''
    case 'status':
      return vendorInvoiceStatusLabel(r)
    case 'zraStatus':
      return r.zraStatus ?? ''
  }
}

// Colour of the classic status badge (badge-statusN): 0 draft, 1 not paid, 3 started, 6 paid, 8/9 abandoned.
function statusBadgeClasses(row: VendorInvoiceRow) {
  const code = row.statusBadge
  if (code === 6 || (code === null && row.paye)) return 'bg-success-bg text-success-fg'
  if (code === 1) return 'bg-warning-bg text-warning-fg'
  if (code === 3 || code === 4) return 'bg-info-bg text-info-fg'
  if (code === 8 || code === 9 || row.statusCode === 3) return 'bg-danger-bg text-danger-fg'
  return 'bg-surface-hover text-text-muted'
}

// "2026-09-28" -> "09/28/2026", the classic list's own date format.
function usDate(iso: string | null) {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? `${m[2]}/${m[3]}/${m[1]}` : (iso ?? '')
}

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  return ((words[0]?.[0] ?? '') + (words[1]?.[0] ?? words[0]?.[1] ?? '')).toUpperCase()
}

function StatusMenu({ active }: { active: VendorInvoiceStatus }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])
  const filtered = STATUS_MENU.some((s) => s.status === active && s.status !== 'all')
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Filter by status"
        aria-label="Filter by status"
        aria-expanded={open}
        className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm ${filtered ? 'bg-brand text-white' : 'bg-surface-hover text-text hover:bg-surface-alt'}`}
      >
        <MoreVertical size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-44 rounded-lg border border-border bg-surface py-1 shadow-xl">
          {STATUS_MENU.map((s) => (
            <Link
              key={s.label}
              to={s.path}
              onClick={() => setOpen(false)}
              className={`flex items-center justify-between px-3 py-1.5 text-sm hover:bg-surface-hover ${active === s.status ? 'font-semibold text-brand' : 'text-text'}`}
            >
              {s.label}
              {active === s.status && <Check size={14} />}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

// fourn/facture/list.php and its importlist.php views, from the same
// facture_ajax_list.php the classic page reads (see vendorInvoices.queries.ts):
// every toolbar button and ⋮ status filter is applied server-side, the cards
// are always the overall figures, as on the classic page.
export function VendorInvoiceListPage({ status }: { status: VendorInvoiceStatus }) {
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const urlStatus = searchParams.get('status') as VendorInvoiceStatus | null
  const view: VendorInvoiceStatus = status === 'all' && urlStatus && URL_STATUSES.has(urlStatus) ? urlStatus : status
  const dateRange = dateFrom && dateTo ? { from: dateFrom, to: dateTo } : undefined

  const { data, isLoading, isError, error } = useVendorInvoices(view, search, dateRange)
  // The cards: always the unfiltered list's figures (shared with the dashboard and statistics).
  const { data: overall } = useVendorInvoices('all')
  // Real vendor-scoping filter — thirdPartyId is now populated for real from
  // the row's own third-party link (see vendorInvoices.queries.ts). Lets a
  // vendor's own Related Items tab ("View all" on Supplier invoices) link
  // here instead of the legacy backend's own filtered list.php.
  const customerIdParam = searchParams.get('customerId')
  const customerId = customerIdParam ? Number(customerIdParam) : null

  useEffect(() => setPage(1), [search, perPage, view, dateFrom, dateTo])

  const customerScoped = data?.items ?? []
  const allRows = customerId ? customerScoped.filter((r) => r.thirdPartyId === customerId) : customerScoped
  const customerName = customerId ? allRows[0]?.thirdPartyName : null
  const total = allRows.length
  const { sorted: sortedRows, sort, toggleSort } = useSortableRows<VendorInvoiceRow, SortKey>(allRows, sortValue)
  const rows = sortedRows.slice((page - 1) * perPage, page * perPage)
  const summary = overall?.summary
  const activeTab = TABS.find((t) => t.status === view)?.status ?? (view === 'all' ? 'all' : null)

  function getExportData() {
    return {
      headers: ['Ref', 'Ref Vendor', 'Invoice Date', 'Due Date', 'Third-Party', 'Payment Type', 'Amount (Incl. Tax)', 'Sale Type Code', 'Registration Type Code', 'Status', 'Zra Status'],
      rows: sortedRows.map((r) => [
        r.ref,
        r.refSupplier ?? '',
        usDate(r.invoiceDate),
        r.dueDate,
        r.thirdPartyName ?? '',
        r.paymentTypeLabel ?? '',
        formatMoney(r.amountTtc),
        r.saleTypeCode ?? '',
        r.registrationTypeCode ?? '',
        vendorInvoiceStatusLabel(r),
        r.zraStatus ?? '',
      ]),
    }
  }

  return (
    // -m-6 + flex-1 flex-col: same pattern as ThirdPartyList.tsx / StickyFormShell.tsx.
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-20 -mx-6 space-y-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
        {/* In the blue-metal theme the page banner carries this title and both buttons (PageBanner's BANNER_ACTIONS). */}
        <div data-hide-under-banner className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
            <Lock size={20} className="text-brand" /> Purchase Invoices
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <Link to={ROUTES.vendorInvoiceCreateQuick} className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover">
              + New Quick Invoice
            </Link>
            <Link to={ROUTES.vendorInvoiceCreate} className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover">
              + New Detailed Invoice
            </Link>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Purchase invoice views">
          {TABS.map((t) => (
            <Link
              key={t.status}
              to={t.path}
              role="tab"
              aria-selected={activeTab === t.status}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${activeTab === t.status ? 'bg-brand text-white' : 'bg-surface-hover text-text hover:bg-surface-alt'}`}
            >
              {t.label}
            </Link>
          ))}
          <StatusMenu active={view} />
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
        {customerId && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-brand/30 bg-brand/5 px-4 py-2 text-sm">
            <span className="text-text!">
              Showing only invoices for <span className="font-semibold">{customerName ?? `vendor #${customerId}`}</span>
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
              <XIcon size={12} /> Clear filter
            </button>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card className="!p-3 !flex-row items-center justify-between gap-3 !h-auto">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Suppliers</p>
              <p className="text-xl font-bold text-text! mt-1">{summary?.suppliers ?? '—'}</p>
              <p className="text-xs text-text-faint mt-0.5">Vendor records</p>
            </div>
            <span className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${ICON_STYLES.blue}`}>
              <Truck size={20} />
            </span>
          </Card>
          <Card className="!p-3 !flex-row items-center justify-between gap-3 !h-auto">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Invoices</p>
              <p className="text-xl font-bold text-text! mt-1">{summary?.invoices ?? '—'}</p>
              <p className="text-xs text-text-faint mt-0.5">Purchase invoices</p>
            </div>
            <span className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${ICON_STYLES.indigo}`}>
              <FileText size={20} />
            </span>
          </Card>
          <Card className="!p-3 !flex-row items-center justify-between gap-3 !h-auto">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Automatic Purchases</p>
              <p className="text-xl font-bold text-text! mt-1">{summary ? `${formatMoney(summary.automaticAmount)} ZMW` : '—'}</p>
              <p className="text-xs text-text-faint mt-0.5">Auto purchase amount</p>
            </div>
            <span className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${ICON_STYLES.amber}`}>
              <Bot size={20} />
            </span>
          </Card>
          <Card className="!p-3 !flex-row items-center justify-between gap-3 !h-auto">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Manual Purchases</p>
              <p className="text-xl font-bold text-text! mt-1">{summary ? `${formatMoney(summary.manualAmount)} ZMW` : '—'}</p>
              <p className="text-xs text-text-faint mt-0.5">Manual purchase amount</p>
            </div>
            <span className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${ICON_STYLES.green}`}>
              <HandCoins size={20} />
            </span>
          </Card>
        </div>

        <Card className="!p-0 overflow-hidden flex-1 min-h-0">
          <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
            <select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))} className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5">
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <div className="relative w-52">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search"
                className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text pl-8 pr-3 py-1.5"
              />
            </div>
            {/* The classic page's date-range picker: both ends needed, as its datefilter is "from - to". */}
            <div className="flex items-center gap-1.5" title="Invoice date range">
              <CalendarRange size={15} className="text-text-faint" />
              <input
                type="date"
                aria-label="Invoice date from"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => setDateFrom(e.target.value)}
                className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1"
              />
              <span className="text-text-faint text-sm">–</span>
              <input
                type="date"
                aria-label="Invoice date to"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => setDateTo(e.target.value)}
                className="text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1"
              />
              {(dateFrom || dateTo) && (
                <button
                  type="button"
                  onClick={() => {
                    setDateFrom('')
                    setDateTo('')
                  }}
                  title="Clear dates"
                  className="p-1 rounded text-text-faint hover:bg-surface-hover hover:text-text"
                >
                  <XIcon size={13} />
                </button>
              )}
            </div>
            <TableExportButtons title="Purchase Invoices" getExportData={getExportData} />
          </div>

          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <TheadRow>
                  <Th sortKey="ref" sort={sort} onSort={toggleSort}>Ref</Th>
                  <Th sortKey="refVendor" sort={sort} onSort={toggleSort}>Ref Vendor</Th>
                  <Th sortKey="invoiceDate" sort={sort} onSort={toggleSort}>Invoice Date</Th>
                  <Th sortKey="thirdParty" sort={sort} onSort={toggleSort}>Third-Party</Th>
                  <Th sortKey="paymentType" sort={sort} onSort={toggleSort}>Payment Type</Th>
                  <Th sortKey="amount" sort={sort} onSort={toggleSort}>Amount (Incl. Tax)</Th>
                  <Th sortKey="saleTypeCode" sort={sort} onSort={toggleSort}>Sale Type Code</Th>
                  <Th sortKey="registrationTypeCode" sort={sort} onSort={toggleSort}>Registration Type Code</Th>
                  <Th sortKey="status" sort={sort} onSort={toggleSort}>Status</Th>
                  <Th sortKey="zraStatus" sort={sort} onSort={toggleSort}>Zra Status</Th>
                </TheadRow>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-4 text-text-faint italic">
                      Loading…
                    </td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-4 text-danger">
                      Could not load purchase invoices. {error instanceof Error ? error.message : ''}
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-4 text-text-faint italic">
                      No Data Available In Table
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id ?? r.ref} className="border-b border-border last:border-0 hover:bg-surface-hover align-top">
                      <td className="px-4 py-3 text-brand font-medium whitespace-nowrap">
                        {r.id ? (
                          <Link to={ROUTES.vendorInvoiceDetail.replace(':id', String(r.id))} className="hover:underline">
                            {r.ref}
                          </Link>
                        ) : (
                          r.ref
                        )}
                      </td>
                      <td className="px-4 py-3 text-text-muted">{r.refSupplier || '-'}</td>
                      <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                        {usDate(r.invoiceDate)}
                        {r.dueDate && <div className="text-xs text-text-faint">Due: {r.dueDate}</div>}
                      </td>
                      <td className="px-4 py-3">
                        {r.thirdPartyName ? (
                          <div>
                            {r.thirdPartyId ? (
                              <Link to={ROUTES.customerDetail.replace(':id', String(r.thirdPartyId))} className="inline-flex items-center gap-2 text-brand hover:underline">
                                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-success text-[11px] font-bold text-white">{initials(r.thirdPartyName)}</span>
                                {r.thirdPartyName}
                              </Link>
                            ) : (
                              <span className="text-text">{r.thirdPartyName}</span>
                            )}
                            {r.thirdPartySubtitle && <div className="text-xs text-text-faint pl-9">{r.thirdPartySubtitle}</div>}
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3 text-text-muted">{r.paymentTypeLabel || '-'}</td>
                      <td className="px-4 py-3 text-text!">
                        <div className="font-semibold tabular-nums">{formatMoney(r.amountTtc)}</div>
                        <div className="text-xs text-text-faint tabular-nums whitespace-nowrap">
                          HT: {formatMoney(r.amountHt)} | VAT: {formatMoney(r.amountVat)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text-muted">{r.saleTypeCode || '-'}</td>
                      <td className="px-4 py-3 text-text-muted">{r.registrationTypeCode || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusBadgeClasses(r)}`}>{vendorInvoiceStatusLabel(r)}</span>
                        {r.currency && <div className="text-xs text-text-faint mt-0.5 whitespace-nowrap">Currency: {r.currency}</div>}
                      </td>
                      {/* Cut to one line like the classic 165px badge; the full ZRA message stays in the tooltip. */}
                      <td className="px-4 py-3 text-text-muted capitalize">
                        <span className="block max-w-[200px] truncate" title={r.zraStatus ?? undefined}>
                          {r.zraStatus || '-'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <ListPagination page={page} perPage={perPage} total={total} onPageChange={setPage} edgeToEdge />
    </div>
  )
}
