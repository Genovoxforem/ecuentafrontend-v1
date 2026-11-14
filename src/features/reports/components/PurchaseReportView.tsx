import { useMemo, useState } from 'react'
import { FileBarChart } from 'lucide-react'
import { LegacyReportTable } from '../../../shared/components/table/LegacyReportTable'
import { fmt, isoDate } from '../reportFormat'
import { PURCHASE_SOURCE_OPTIONS, PURCHASE_TYPE_OPTIONS, purchaseTable, usePurchaseReport, type PurchaseSourceFilter, type PurchaseTypeFilter } from '../purchaseInvoices.data'
import { Badge, RangeBar, ReportError, ReportLoading } from './ReportWidgets'
import { RadioPills } from './RadioPills'

// "Purchase Invoices" of the Reports Center (classic compta/resultat/purchase_report.php): the period (it opens on today), the Type (All / Purchases /
// Returns) and the Source (All Sources / Manual / Automatic / Asycuda), the summary badges and the 18-column table with its totals row.
export function PurchaseReportView() {
  const today = isoDate(new Date())
  const [range, setRange] = useState({ start: today, end: today })
  const [type, setType] = useState<PurchaseTypeFilter>('-1')
  const [source, setSource] = useState<PurchaseSourceFilter>('')
  const q = usePurchaseReport(range.start, range.end, type, source)
  const table = useMemo(() => purchaseTable(q.data?.invoices ?? []), [q.data])
  const s = q.data?.summary

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <FileBarChart size={20} className="text-brand" /> Purchase Invoices
      </h2>
      <RangeBar key={`${range.start}|${range.end}`} start={range.start} end={range.end} label="Report period" buttonLabel="View Report" onApply={(start, end) => setRange({ start, end })}>
        <RadioPills label="Type" value={type} options={PURCHASE_TYPE_OPTIONS} onChange={setType} />
        <RadioPills label="Source" value={source} options={PURCHASE_SOURCE_OPTIONS} onChange={setSource} />
      </RangeBar>

      {q.isLoading && <ReportLoading label="Generating report…" />}
      {q.isError && <ReportError error={q.error} onRetry={() => q.refetch()} />}
      {q.data && s && (
        <>
          <p className="text-sm text-text-muted">For the period of {q.data.periodLabel}</p>
          <div className="flex flex-wrap gap-2" aria-label="Summary">
            <Badge tone="info">Invoices: {s.invoiceCount}</Badge>
            <Badge tone="neutral">Purchase Total: {fmt(s.totalPurchase)}</Badge>
            <Badge tone="success">Paid: {fmt(s.totalPaid)}</Badge>
            <Badge tone="danger">Unpaid: {fmt(s.totalUnpaid)}</Badge>
            <Badge tone="info">Manual: {s.manual}</Badge>
            <Badge tone="warning">Automatic: {s.automatic}</Badge>
            <Badge tone="neutral">Asycuda: {s.asycuda}</Badge>
          </div>
          <LegacyReportTable title="Purchase Invoices" table={table} />
        </>
      )}
    </div>
  )
}
