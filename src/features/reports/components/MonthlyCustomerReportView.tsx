import { useDeferredValue, useMemo, useState } from 'react'
import { Briefcase, Eye, FileText, HandCoins, Handshake, Receipt, RefreshCw, Search, ShoppingCart, TrendingUp, X } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ListPagination } from '../../../shared/components/ListPagination'
import {
  customerReportTotals,
  useCustomerDetails,
  useCustomerReport,
  type CustomerDetailRow,
  type CustomerReportRow,
  type DetailKind,
  type ThirdPartyKind,
} from '../monthlyCustomer.data'
import { monthEnd, monthStart, num, usDate } from '../reportFormat'
import { inputCls, KpiCard, primaryBtn, ReportError, ReportLoading, secondaryBtn, SimpleTable } from './ReportWidgets'

// The classic page prints the company currency from the instance configuration; this app shows ZMW everywhere (see fmtZMW in DashboardKit).
const CURRENCY = 'ZMW'
const money = (v: unknown) => `${CURRENCY} ${num(v as number).toFixed(2)}`

interface Applied {
  start: string
  end: string
  kind: ThirdPartyKind
  socid: string
}

const defaults = (): Applied => ({ start: monthStart(), end: monthEnd(), kind: 'customer', socid: '' })

// "Customer Report" of the Reports Center (classic: custom/reports/monthly_customer_report.php), read from monthly_customer_report_ajax.php.
export function MonthlyCustomerReportView() {
  const [applied, setApplied] = useState<Applied>(defaults)
  const [draft, setDraft] = useState<Applied>(defaults)
  const q = useCustomerReport(applied.start, applied.end, applied.kind)
  const [details, setDetails] = useState<{ row: CustomerReportRow; type: DetailKind } | null>(null)

  const rows = useMemo(() => (applied.socid ? (q.data ?? []).filter((r) => String(r.rowid) === applied.socid) : (q.data ?? [])), [q.data, applied.socid])
  const bad = !draft.start || !draft.end || draft.start > draft.end

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <ShoppingCart size={20} className="text-brand" /> Customer Report
      </h2>

      <Card className="!h-auto">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm font-medium text-text">
            <span className="mb-1 block">Date Range</span>
            <span className="flex items-center gap-2">
              <input type="date" value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} className={inputCls} aria-label="From" />
              <span className="text-text-muted">to</span>
              <input type="date" value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} className={inputCls} aria-label="To" />
            </span>
          </label>
          <label className="text-sm font-medium text-text">
            <span className="mb-1 block">Type</span>
            <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as ThirdPartyKind, socid: '' })} className={inputCls} aria-label="Type">
              <option value="customer">Customers</option>
              <option value="vendor">Vendors</option>
            </select>
          </label>
          <label className="text-sm font-medium text-text">
            <span className="mb-1 block">Customer/Vendor</span>
            <select value={draft.socid} onChange={(e) => setDraft({ ...draft, socid: e.target.value })} className={`${inputCls} min-w-52`} aria-label="Customer/Vendor" disabled={draft.kind !== applied.kind}>
              <option value="">{q.data ? 'All' : 'Select a third party'}</option>
              {(q.data ?? []).map((r) => (
                <option key={String(r.rowid)} value={String(r.rowid)}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <button type="button" disabled={bad} onClick={() => setApplied(draft)} className={primaryBtn}>
            <Search size={14} /> Filter
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(defaults())
              setApplied(defaults())
            }}
            className={secondaryBtn}
          >
            <RefreshCw size={14} /> Reset
          </button>
        </div>
        {draft.start > draft.end && draft.end && <p className="mt-2 text-xs text-danger-fg">The start date is after the end date.</p>}
      </Card>

      {q.isLoading && <ReportLoading label="Loading the customer report…" />}
      {q.isError && <ReportError error={q.error} onRetry={() => q.refetch()} />}
      {q.data && (
        <>
          <Summary rows={rows} />
          <ReportTable rows={rows} kind={applied.kind} onDetails={(row, type) => setDetails({ row, type })} />
        </>
      )}
      {details && <DetailsDialog row={details.row} type={details.type} start={applied.start} end={applied.end} onClose={() => setDetails(null)} />}
    </div>
  )
}

function Summary({ rows }: { rows: CustomerReportRow[] }) {
  const t = customerReportTotals(rows)
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <KpiCard label="Proposals" value={money(t.proposalAmount)} sub={`${t.proposalCount} proposals`} tone="blue" icon={FileText} />
      <KpiCard label="Contracts" value={String(t.contractCount)} sub={`${t.contractCount} contracts`} tone="green" icon={Handshake} />
      <KpiCard label="Sales Orders" value={money(t.orderAmount)} sub={`${t.orderCount} orders`} tone="amber" icon={ShoppingCart} />
      <KpiCard label="Total Sales" value={money(t.salesAmount)} sub={`${t.salesCount} sales | Due: ${money(t.dueAmount)} | VAT: ${money(t.vatAmount)}`} tone="rose" icon={TrendingUp} />
      <KpiCard label="Total Expenses" value={money(t.expenseAmount)} sub={`${t.expenseCount} expenses`} tone="teal" icon={Receipt} />
    </div>
  )
}

const PAGE_SIZES = [10, 25, 50, 100]

// The classic list: a search box, a page-size select and one row per third party, with an eye next to every count above 0.
function ReportTable({ rows, kind, onDetails }: { rows: CustomerReportRow[]; kind: ThirdPartyKind; onDetails: (r: CustomerReportRow, t: DetailKind) => void }) {
  const [search, setSearch] = useState('')
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)
  const deferred = useDeferredValue(search)
  const filtered = useMemo(() => {
    const s = deferred.trim().toLowerCase()
    return s ? rows.filter((r) => `${r.name} ${r.code_client ?? ''}`.toLowerCase().includes(s)) : rows
  }, [rows, deferred])
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, pages)
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  const eye = (r: CustomerReportRow, type: DetailKind, label: string) => (
    <button key={type} type="button" onClick={() => onDetails(r, type)} aria-label={`View ${label} of ${r.name}`} title="View Details" className="ml-1.5 inline-flex align-middle text-brand hover:opacity-80">
      <Eye size={14} />
    </button>
  )
  const withCount = (amount: string, count: number, noun: string) => (
    <span>
      {amount}
      <span className="ml-1 block text-[11px] text-text-faint">
        {count} {noun}
      </span>
    </span>
  )

  return (
    <>
      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-3">
          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }} className={inputCls} aria-label="Rows per page">
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <div className="relative ml-auto w-full sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="Search" aria-label="Search" className={`${inputCls} w-full pl-8`} />
          </div>
        </div>
        <SimpleTable
          headers={[kind === 'vendor' ? 'Vendor' : 'Customer', 'Contracts', 'Proposals', 'Sales Orders', 'Last Invoicing', 'Invoices', 'Total Due Amount', 'Total VAT Amount', 'Expenses', 'Products']}
          rows={pageRows.map((r) => [
            r.name,
            <span key="c">
              {num(r.contract_count)}
              {num(r.contract_count) > 0 && eye(r, 'contracts', 'contracts')}
            </span>,
            <span key="p">
              {withCount(money(r.proposal_amount), num(r.proposal_count), 'proposals')}
              {num(r.proposal_count) > 0 && eye(r, 'proposals', 'proposals')}
            </span>,
            <span key="o">
              {withCount(money(r.order_amount), num(r.order_count), 'orders')}
              {num(r.order_count) > 0 && eye(r, 'orders', 'orders')}
            </span>,
            r.invoice_date ? usDate(r.invoice_date.substring(0, 10)) : '-',
            <span key="i">
              {withCount(money(r.invoice_amount), num(r.invoice_count), 'invoices')}
              {num(r.invoice_count) > 0 && eye(r, 'invoices', 'invoices')}
            </span>,
            money(r.total_due),
            money(r.total_vat),
            <span key="e">
              {withCount(money(r.expense_amount), num(r.expense_count), 'expenses')}
              {num(r.expense_count) > 0 && eye(r, 'expenses', 'expenses')}
            </span>,
            <span key="pr">
              {num(r.product_count)}
              {num(r.product_count) > 0 && eye(r, 'products', 'products')}
            </span>,
          ])}
          empty="No data available in table"
          right={[1, 9]}
        />
      </Card>
      <ListPagination page={safePage} perPage={pageSize} total={filtered.length} onPageChange={setPage} />
    </>
  )
}

const TITLE: Record<DetailKind, string> = { contracts: 'Contracts', proposals: 'Proposals', orders: 'Orders', invoices: 'Invoices', expenses: 'Expenses', products: 'Products' }

function DetailsDialog({ row, type, start, end, onClose }: { row: CustomerReportRow; type: DetailKind; start: string; end: string; onClose: () => void }) {
  const q = useCustomerDetails(row.rowid, type, start, end)
  const products = type === 'products'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label={`${TITLE[type]} Details`}>
      <div className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-xl border border-border bg-surface-alt shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="flex items-center gap-2 font-semibold text-text!">
            {type === 'products' ? <Briefcase size={16} /> : <HandCoins size={16} />} {TITLE[type]} Details — {row.name}
          </h3>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 text-text-muted hover:bg-surface-hover">
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-auto p-4">
          {q.isLoading && <p className="py-4 text-center text-sm text-text-faint">Loading…</p>}
          {q.isError && <p className="py-4 text-center text-sm text-danger-fg">Error loading details</p>}
          {q.data && q.data.length === 0 && <p className="text-sm text-text-muted">No records found</p>}
          {q.data && q.data.length > 0 && (
            <SimpleTable
              headers={products ? ['Ref', 'Label', 'Amount', 'Quantity'] : ['Ref', 'Date', 'Amount', 'Sales By', 'Status', 'Tax']}
              rows={q.data.map((d: CustomerDetailRow) => (products ? [d.ref, d.date, money(d.amount), (d.sales_by ?? '').replace(/^Qty:\s*/, '')] : [d.ref, d.date, money(d.amount), d.sales_by || '-', d.status, money(d.tax)]))}
              empty=""
              right={products ? [2, 3] : [2, 5]}
            />
          )}
        </div>
      </div>
    </div>
  )
}
