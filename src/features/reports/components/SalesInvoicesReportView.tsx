import { useMemo, useState } from 'react'
import { BarChart3, Calculator, FileText, Receipt, Wallet } from 'lucide-react'
import { LegacyReportTable } from '../../../shared/components/table/LegacyReportTable'
import { useCustomerOptions } from '../../customers/customerOptions'
import { fmt, monthEnd, monthStart } from '../reportFormat'
import {
  INVOICE_STATUS_OPTIONS,
  INVOICE_TYPE_OPTIONS,
  ZRA_STATUS_OPTIONS,
  invoicesTable,
  useClassicInvoices,
  useReportUsers,
  type InvoiceStatusFilter,
  type InvoiceTypeFilter,
  type InvoiceSummary,
  type PaymentSummaryItem,
} from '../classicInvoices.data'
import { KpiCard, RangeBar, ReportError, ReportLoading, SelectField } from './ReportWidgets'
import { RadioPills } from './RadioPills'

// The four cards of the classic page: Total Invoices, Total Amount, Amount (Incl. Tax) and Received / Pending, in the currency of the filter.
function SummaryCards({ s }: { s: InvoiceSummary }) {
  const money = (n: number) => `${fmt(n)} ${s.currency}`
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard label="Total Invoices" value={s.invoiceCount} sub={`Sales: ${s.salesCount} · Credit Notes: ${s.creditNoteCount}`} tone="blue" icon={FileText} />
      <KpiCard label="Total Amount" value={money(s.ttc)} sub={`Sales: ${money(s.salesAmount)} · Credit Notes: ${money(s.creditNoteAmount)}`} tone="green" icon={Wallet} />
      <KpiCard label="Amount (Incl. Tax)" value={money(s.ttc)} sub={`VAT: ${money(s.vat)} · Amount (Excl. Tax): ${money(s.ht)}`} tone="amber" icon={Calculator} />
      <KpiCard
        label="Amount"
        value={money(s.received)}
        sub={`Received${s.overpaid > 0 ? ` (+${fmt(s.overpaid)} overpaid)` : ''} · Pending: ${money(s.pending)}`}
        tone="rose"
        icon={BarChart3}
      />
    </div>
  )
}

// "Payment Summary" of the classic page: one tile per payment mode (amount, number of invoices, share); a tile filters the table to that mode, "Total (All)" clears it.
export function PaymentSummary({ items, selected, onSelect }: { items: PaymentSummaryItem[]; selected: string; onSelect: (mode: string) => void }) {
  if (items.length === 0) return null
  const total = items.reduce((s, i) => s + i.amount, 0)
  const count = items.reduce((s, i) => s + i.invoiceCount, 0)
  const tile = (active: boolean) => `flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm ${active ? 'border-brand bg-brand/10' : 'border-border bg-surface hover:bg-surface-hover'}`
  return (
    <section aria-label="Payment Summary" className="space-y-2">
      <h3 className="text-sm font-semibold text-text!">Payment Summary</h3>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((i) => (
          <button key={i.mode} type="button" onClick={() => onSelect(i.mode)} className={tile(selected === i.mode)} aria-pressed={selected === i.mode}>
            <span className="font-medium text-text">{i.mode}</span>
            <span className="text-right text-text-muted">
              ZMW {fmt(i.amount)} · {i.invoiceCount} · {total > 0 ? Math.round((i.amount / total) * 1000) / 10 : 0}%
            </span>
          </button>
        ))}
        <button type="button" onClick={() => onSelect('')} className={tile(selected === '')} aria-pressed={selected === ''}>
          <span className="font-semibold text-text">Total (All)</span>
          <span className="text-right text-text-muted">
            ZMW {fmt(total)} · {count}
          </span>
        </button>
      </div>
    </section>
  )
}

// "Sales Invoices" of the Reports Center (classic compta/facture/listreport.php). The list is read from the endpoint the classic page posts its own form
// to (compta/facture/listreport_ajax.php, see classicInvoices.data.ts), so the rows, the totals and the status labels are the classic page's:
// Ref. (with the customer reference), Receipt No, Invoice date, Third-party, Payment Type, Amount (excl. tax), Amount (inc. tax), Pending, Received,
// Author and Status, filtered by period, Customer, Author, ZRA Status, Currency, Sales / Returns and All / Due / Partially Paid / Paid / Canceled.
// The classic Select column + "Merge Selected PDFs" post to compta/facture/merge_invoice_pdfs.php and are not built; the table's own export buttons
// export the filtered rows.
export function SalesInvoicesReportView() {
  const [range, setRange] = useState({ start: monthStart(), end: monthEnd() })
  const [type, setType] = useState<InvoiceTypeFilter>('')
  const [status, setStatus] = useState<InvoiceStatusFilter>('')
  const [customer, setCustomer] = useState('')
  const [author, setAuthor] = useState('')
  const [zra, setZra] = useState('')
  const [currency, setCurrency] = useState('')
  const [mode, setMode] = useState('')
  const customers = useCustomerOptions()
  const users = useReportUsers()
  const q = useClassicInvoices({ from: range.start, to: range.end, type, status, userId: author, customerId: customer, zraStatus: zra, currency })
  const rows = useMemo(() => (q.data?.invoices ?? []).filter((i) => !mode || i.paymentMode === mode), [q.data, mode])
  const table = useMemo(() => invoicesTable(rows, 'sales'), [rows])

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Receipt size={20} className="text-brand" /> Sales Invoices
      </h2>
      <RangeBar key={`${range.start}|${range.end}`} start={range.start} end={range.end} label="Report period" buttonLabel="View Report" onApply={(start, end) => setRange({ start, end })}>
        <SelectField label="Customer" value={customer} onChange={setCustomer} blank="" options={(customers.data ?? []).map((c) => ({ value: c.id, label: c.name }))} />
        <RadioPills label="Type" value={type} options={INVOICE_TYPE_OPTIONS} onChange={setType} />
        <RadioPills label="Status" value={status} options={INVOICE_STATUS_OPTIONS} onChange={setStatus} />
        <SelectField label="ZRA Status" value={zra} onChange={setZra} options={ZRA_STATUS_OPTIONS.filter((o) => o.value)} minWidth="min-w-36" />
        <SelectField label="Filter by Currency" value={currency} onChange={setCurrency} blank="All Currencies" options={(q.data?.currencies ?? []).map((c) => ({ value: c, label: c }))} minWidth="min-w-36" />
        <SelectField label="Author" value={author} onChange={setAuthor} options={(users.data ?? []).map((u) => ({ value: u.id, label: u.name }))} minWidth="min-w-36" />
      </RangeBar>
      <p className="text-center text-sm text-text-muted">
        For the period of {range.start} To {range.end}
      </p>

      {q.isLoading && <ReportLoading label="Loading sales invoices…" />}
      {q.isError && <ReportError error={q.error} onRetry={() => q.refetch()} />}
      {q.data && (
        <>
          <SummaryCards s={q.data.summary} />
          <PaymentSummary items={q.data.payments} selected={mode} onSelect={setMode} />
          <LegacyReportTable title="Sales Invoices" table={table} />
        </>
      )}
    </div>
  )
}
