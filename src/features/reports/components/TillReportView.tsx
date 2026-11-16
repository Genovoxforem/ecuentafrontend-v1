import { useMemo, useState } from 'react'
import { Receipt } from 'lucide-react'
import { LegacyReportTable } from '../../../shared/components/table/LegacyReportTable'
import { monthEnd, monthStart } from '../reportFormat'
import { INVOICE_STATUS_OPTIONS, INVOICE_TYPE_OPTIONS, invoicesTable, useClassicInvoices, useReportUsers, type InvoiceStatusFilter, type InvoiceTypeFilter } from '../classicInvoices.data'
import { inputCls, RangeBar, ReportError, ReportLoading } from './ReportWidgets'
import { RadioPills } from './RadioPills'
import { PaymentSummary } from './SalesInvoicesReportView'

// "Till Report" of the Reports Center (classic compta/facture/tillreport.php, titled "Sales Invoices"): the invoice list of the period with a Till and an
// Employee filter. "All Tills" lists every invoice, as the classic page does (on newecuenta 91 invoices, 49,641.79 for 2026); a till lists the POS invoices
// of that terminal (the invoice's pos_source: Terminal 1 = 19 invoices, 1,559.15, the same as the classic page). Employee is the invoice author.
// The 13 columns are the classic ones, read from the same endpoint as Sales Invoices (classicInvoices.data.ts).
export function TillReportView() {
  const [range, setRange] = useState({ start: monthStart(), end: monthEnd() })
  const [till, setTill] = useState('')
  const [employee, setEmployee] = useState('')
  const [type, setType] = useState<InvoiceTypeFilter>('')
  const [status, setStatus] = useState<InvoiceStatusFilter>('')
  const [mode, setMode] = useState('')
  const users = useReportUsers()
  const q = useClassicInvoices({ from: range.start, to: range.end, type, status, userId: employee })

  const tills = useMemo(() => [...new Set((q.data?.invoices ?? []).map((i) => i.posSource).filter((x): x is string => !!x))].sort((a, b) => Number(a) - Number(b)), [q.data])
  const rows = useMemo(() => (q.data?.invoices ?? []).filter((i) => (!till || i.posSource === till) && (!mode || i.paymentMode === mode)), [q.data, till, mode])
  const table = useMemo(() => invoicesTable(rows, 'till'), [rows])

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Receipt size={20} className="text-brand" /> Sales Invoices
      </h2>
      <RangeBar key={`${range.start}|${range.end}`} start={range.start} end={range.end} label="Report period" buttonLabel="View Report" onApply={(start, end) => setRange({ start, end })}>
        <label className="text-sm font-medium text-text">
          <span className="mb-1 block">Till</span>
          <select value={till} onChange={(e) => setTill(e.target.value)} className={`${inputCls} min-w-36`} aria-label="Till">
            <option value="">All Tills</option>
            {tills.map((t) => (
              <option key={t} value={t}>
                Terminal{t}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-text">
          <span className="mb-1 block">Employee</span>
          <select value={employee} onChange={(e) => setEmployee(e.target.value)} className={`${inputCls} min-w-36`} aria-label="Employee">
            <option value="">All Employee</option>
            {(users.data ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
        <RadioPills label="Type" value={type} options={INVOICE_TYPE_OPTIONS} onChange={setType} />
        <RadioPills label="Status" value={status} options={INVOICE_STATUS_OPTIONS} onChange={setStatus} />
      </RangeBar>
      <p className="text-center text-sm text-text-muted">
        For the period of {range.start} To {range.end}
      </p>

      {q.isLoading && <ReportLoading label="Loading the till report…" />}
      {q.isError && <ReportError error={q.error} onRetry={() => q.refetch()} />}
      {q.data && (
        <>
          {/* the classic page prints the Payment Summary of the period; it is the server's figure for every till, so it is not shown for one till */}
          {!till && <PaymentSummary items={q.data.payments} selected={mode} onSelect={setMode} />}
          <LegacyReportTable title="Till Report" table={table} />
        </>
      )}
    </div>
  )
}
