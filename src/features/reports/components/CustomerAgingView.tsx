import { useState, type ReactNode } from 'react'
import { Hourglass } from 'lucide-react'
import type { UseQueryResult } from '@tanstack/react-query'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyReportTable } from '../../../shared/components/table/LegacyReportTable'
import type { ReportTable } from '../../../shared/legacyReportTableParser'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import {
  AGING_BUCKETS,
  mapAgingByCustomer,
  mapAgingByInvoice,
  useAgingByCustomer,
  useAgingByInvoice,
  usDateFromEpoch,
  type AgingDetailRow,
  type AgingParty,
  type AgingReport,
  type AgingSummaryRow,
} from '../customerAging.data'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const money = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function Figures({ report }: { report: AgingReport<unknown> }) {
  const t = report.totals
  const asOf = report.asOf ? usDateFromEpoch(Date.parse(`${report.asOf}T00:00:00Z`) / 1000) : ''
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
      <Card className="!h-auto">
        <p className="text-xs text-text-faint">As of</p>
        <p className="font-semibold text-text!">{asOf}</p>
      </Card>
      <Card className="!h-auto">
        <p className="text-xs text-text-faint">Open invoices</p>
        <p className="font-semibold text-text!">{t.invoice_count}</p>
      </Card>
      {AGING_BUCKETS.map((b) => (
        <Card key={b.key} className="!h-auto">
          <p className="text-xs text-text-faint">{b.label}</p>
          <p className="font-semibold text-text!">{money(t[b.key])}</p>
        </Card>
      ))}
      <Card className="!h-auto">
        <p className="text-xs text-text-faint">Total outstanding</p>
        <p className="font-semibold text-danger-fg">{money(t.total_outstanding)}</p>
      </Card>
    </div>
  )
}

// Title, the "as of" date (the day the ages are counted to; today when empty), the figures and the table of one aging report.
function AgingFrame<T>({
  title,
  asOf,
  setAsOf,
  query,
  toTable,
  children,
}: {
  title: string
  asOf: string
  setAsOf: (v: string) => void
  query: UseQueryResult<AgingReport<T>>
  toTable: (r: AgingReport<T>) => ReportTable
  children?: ReactNode
}) {
  const report = query.data
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Hourglass size={20} className="text-brand" /> {title}
      </h2>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-text-muted">
          As of
          <input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className={inputCls} />
        </label>
        {asOf && (
          <button type="button" onClick={() => setAsOf('')} className="h-9 rounded-md border border-border px-3 text-sm text-text hover:bg-surface-hover">
            Today
          </button>
        )}
        {children}
      </div>
      {query.isLoading && <LegacyLoadingCard label={`Loading ${title.toLowerCase()}…`} />}
      {query.isError && <LegacyErrorCard title="Couldn't load the report" message={query.error instanceof Error ? query.error.message : 'Unknown error.'} onRetry={() => query.refetch()} />}
      {report && (
        <>
          <Figures report={report} />
          <LegacyReportTable title={title} table={toTable(report)} />
        </>
      )}
    </div>
  )
}

// "Aging Summary" of the Reports Center: the open invoices one by one (compta/resultat/fapi/aging.php?type=details, see customerAging.data.ts).
export function AgingByInvoiceView({ title, party = 'Customer' }: { title: string; party?: AgingParty }) {
  const [asOf, setAsOf] = useState('')
  const query = useAgingByInvoice(asOf, party)
  return <AgingFrame<AgingDetailRow> title={title} asOf={asOf} setAsOf={setAsOf} query={query} toTable={(r) => mapAgingByInvoice(r, party)} />
}

// "Aging Details" of the Reports Center: one row per customer with the aging buckets (compta/resultat/fapi/aging.php?type=summary).
export function AgingByCustomerView({ title, party = 'Customer' }: { title: string; party?: AgingParty }) {
  const [asOf, setAsOf] = useState('')
  const query = useAgingByCustomer(asOf, party)
  return <AgingFrame<AgingSummaryRow> title={title} asOf={asOf} setAsOf={setAsOf} query={query} toTable={(r) => mapAgingByCustomer(r, party)} />
}
