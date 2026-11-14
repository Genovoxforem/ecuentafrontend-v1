import { useMemo, useState } from 'react'
import { HandCoins } from 'lucide-react'
import { LegacyReportTable } from '../../../shared/components/table/LegacyReportTable'
import { LegacyLoadingCard } from '../../products/components/LegacyReportStates'
import { mapLoansReport, useLoansReport } from '../loansReport.data'
import { isoDate } from '../reportFormat'
import { RangeBar, ReportError } from './ReportWidgets'

// "Loans Reports" of the Reports Center (classic loan/listreport.php), read from loan/fapi/list.php (see loansReport.data.ts).
export function LoansReportView() {
  const today = isoDate(new Date())
  const [range, setRange] = useState({ start: today, end: today })
  const q = useLoansReport(range.start, range.end)
  const table = useMemo(() => mapLoansReport(q.data ?? { items: [], currency: '' }), [q.data])

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <HandCoins size={20} className="text-brand" /> Loans Report
      </h2>
      <RangeBar key={`${range.start}|${range.end}`} start={range.start} end={range.end} label="Report period" buttonLabel="View Report" onApply={(start, end) => setRange({ start, end })} />
      <div className="text-center">
        <p className="text-base font-bold uppercase tracking-wide text-text!">Loans Report</p>
        <p className="text-sm text-text-muted">
          For the period of {range.start} To {range.end}
        </p>
      </div>
      {q.isLoading && <LegacyLoadingCard label="Loading the loans…" />}
      {q.isError && <ReportError error={q.error} onRetry={() => q.refetch()} />}
      {!q.isLoading && !q.isError && <LegacyReportTable title="Loans Report" table={table} />}
    </div>
  )
}
