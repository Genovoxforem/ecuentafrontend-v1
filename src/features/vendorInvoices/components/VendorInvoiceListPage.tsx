import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Lock, Truck, FileText, Bot, HandCoins, Search } from 'lucide-react'
import { Card, ICON_STYLES } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { Th, TheadRow, useSortableRows } from '../../../shared/components/table/SortableTh'
import { ROUTES } from '../../../routes'
import { formatMoney, formatDate } from '../../../utils/format'
import { useVendorInvoices, vendorInvoiceStatusLabel, type VendorInvoiceStatus, type VendorInvoiceRow } from '../vendorInvoices.queries'

const PAGE_SIZE_OPTIONS = [15, 25, 50, 100]

const TABS: { status: VendorInvoiceStatus; label: string; path: string }[] = [
  { status: 'all', label: 'All', path: ROUTES.vendorInvoiceList },
  { status: 'manual', label: 'Manual Purchases', path: ROUTES.vendorInvoiceManual },
  { status: 'automatic', label: 'Automatic Purchases', path: ROUTES.vendorInvoiceAutomatic },
]

type SortKey = 'ref' | 'refVendor' | 'invoiceDate' | 'thirdParty' | 'paymentType' | 'amount' | 'saleTypeCode' | 'registrationTypeCode' | 'status' | 'zraStatus'

function sortValue(r: VendorInvoiceRow, key: SortKey): string | number {
  switch (key) {
    case 'ref':
      return r.ref
    case 'refVendor':
      return r.refSupplier ?? ''
    case 'invoiceDate':
      return r.invoiceDate ? new Date(r.invoiceDate).getTime() : 0
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

function statusBadgeClasses(row: { statusCode: number; paye: boolean }) {
  if (row.statusCode === 2 || row.paye) return 'bg-success-bg text-success-fg'
  if (row.statusCode === 1) return 'bg-warning-bg text-warning-fg'
  if (row.statusCode === 3) return 'bg-danger-bg text-danger-fg'
  return 'bg-surface-hover text-text-muted'
}

// Real GET /api/purchase-invoices/ data (see vendorInvoices.queries.ts),
// against llx_facture_fourn. `status` is fixed per route — one real route
// per real filter, same convention as the rest of this app (Paid/Not Paid/
// Manual Purchases/Automatic Purchases each have their own module+route;
// see that endpoint's header comment for what each value filters on).
export function VendorInvoiceListPage({ status }: { status: VendorInvoiceStatus }) {
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [search, setSearch] = useState('')

  const { data, isLoading, isError } = useVendorInvoices(status, search, 1, 500)

  useEffect(() => setPage(1), [search, perPage, status])

  const allRows = data?.items ?? []
  const total = allRows.length
  const { sorted: sortedRows, sort, toggleSort } = useSortableRows<VendorInvoiceRow, SortKey>(allRows, sortValue)
  const rows = sortedRows.slice((page - 1) * perPage, page * perPage)
  const summary = data?.summary

  function getExportData() {
    return {
      headers: ['Ref', 'Ref Vendor', 'Invoice Date', 'Third-Party', 'Payment Type', 'Amount (Incl. Tax)', 'Sale Type Code', 'Registration Type Code', 'Status'],
      rows: sortedRows.map((r) => [
        r.ref,
        r.refSupplier ?? '',
        formatDate(r.invoiceDate),
        r.thirdPartyName ?? '',
        r.paymentTypeLabel ?? '',
        formatMoney(r.amountTtc),
        r.saleTypeCode ?? '',
        r.registrationTypeCode ?? '',
        vendorInvoiceStatusLabel(r),
      ]),
    }
  }

  return (
    // -m-6 + flex-1 flex-col: same pattern as ThirdPartyList.tsx / StickyFormShell.tsx.
    <div className="-m-6 flex-1 flex flex-col min-h-0">
      <div className="sticky -top-6 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-6 py-3 dark:bg-gray-950">
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
          {TABS.map((t) => (
            <Link
              key={t.status}
              to={t.path}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${status === t.status ? 'bg-brand text-white' : 'bg-surface-hover text-text hover:bg-surface-alt'}`}
            >
              {t.label}
            </Link>
          ))}
          <Link to={ROUTES.zraAutomaticPurchase} className="rounded-lg bg-surface-hover px-3 py-2 text-sm font-medium text-text hover:bg-surface-alt">
            Imports(ASYCUDA)
          </Link>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-4 px-6 py-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="!p-3 !flex-row items-center justify-between gap-3 !h-auto">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Suppliers</p>
            <p className="text-xl font-bold text-text! mt-1">{summary?.suppliers ?? 0}</p>
            <p className="text-xs text-text-faint mt-0.5">Vendor records</p>
          </div>
          <span className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${ICON_STYLES.blue}`}>
            <Truck size={20} />
          </span>
        </Card>
        <Card className="!p-3 !flex-row items-center justify-between gap-3 !h-auto">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Invoices</p>
            <p className="text-xl font-bold text-text! mt-1">{summary?.invoices ?? 0}</p>
            <p className="text-xs text-text-faint mt-0.5">Purchase invoices</p>
          </div>
          <span className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${ICON_STYLES.indigo}`}>
            <FileText size={20} />
          </span>
        </Card>
        <Card className="!p-3 !flex-row items-center justify-between gap-3 !h-auto">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Automatic Purchases</p>
            <p className="text-xl font-bold text-text! mt-1">{formatMoney(summary?.automaticAmount)} ZMW</p>
            <p className="text-xs text-text-faint mt-0.5">Auto purchase amount</p>
          </div>
          <span className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${ICON_STYLES.amber}`}>
            <Bot size={20} />
          </span>
        </Card>
        <Card className="!p-3 !flex-row items-center justify-between gap-3 !h-auto">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Manual Purchases</p>
            <p className="text-xl font-bold text-text! mt-1">{formatMoney(summary?.manualAmount)} ZMW</p>
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
                    Could not load purchase invoices.
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
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface-hover align-top">
                    <td className="px-4 py-3 text-brand font-medium whitespace-nowrap">{r.ref}</td>
                    <td className="px-4 py-3 text-text-muted">{r.refSupplier || '-'}</td>
                    <td className="px-4 py-3 text-text-muted whitespace-nowrap">{formatDate(r.invoiceDate)}</td>
                    <td className="px-4 py-3 text-brand">{r.thirdPartyName || '-'}</td>
                    <td className="px-4 py-3 text-text-muted">{r.paymentTypeLabel || '-'}</td>
                    <td className="px-4 py-3 text-text!">
                      <div className="font-semibold tabular-nums">{formatMoney(r.amountTtc)}</div>
                      <div className="text-xs text-text-faint tabular-nums">
                        HT: {formatMoney(r.amountHt)} | VAT: {formatMoney(r.amountVat)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-muted">{r.saleTypeCode || '-'}</td>
                    <td className="px-4 py-3 text-text-muted">{r.registrationTypeCode || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusBadgeClasses(r)}`}>{vendorInvoiceStatusLabel(r)}</span>
                    </td>
                    <td className="px-4 py-3 text-text-muted">{r.zraStatus || '-'}</td>
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
