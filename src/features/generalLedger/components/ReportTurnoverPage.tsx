import { useState } from 'react'
import { FileSpreadsheet, Loader2, Printer, TrendingUp } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { TURNOVER_BASIS_OPTIONS, useTurnoverInvoiced, type TurnoverFilters } from '../turnoverInvoiced.queries'
import type { TurnoverReport } from '../turnoverInvoicedParser'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const btn = 'flex items-center justify-center h-9 w-9 rounded-md bg-brand text-white hover:bg-brand-hover'

// MM/dd/yyyy (the report's own format) <-> yyyy-MM-dd (native date input).
const toIso = (us: string) => {
  const m = us.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  return m ? `${m[3]}-${m[1]}-${m[2]}` : ''
}
const toUs = (iso: string) => {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? `${m[2]}/${m[3]}/${m[1]}` : ''
}

function toCsv(d: TurnoverReport): string {
  const q = (s: string) => `"${s.replace(/"/g, '""')}"`
  const rows: string[][] = [
    ['', ...d.groups.flatMap((g) => g.labels.map((_, i) => (i === 0 ? g.year : '')))],
    ['Month', ...d.groups.flatMap((g) => g.labels)],
    ...d.months.map((m) => [m.month, ...m.cells]),
    [d.totalLabel, ...d.totals],
  ]
  return rows.map((r) => r.map(q).join(',')).join('\r\n')
}

function exportCsv(d: TurnoverReport) {
  const url = URL.createObjectURL(new Blob([toCsv(d)], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'turnover-invoiced.csv'
  a.click()
  URL.revokeObjectURL(url)
}

// compta/stats/index.php — the real "Turnover invoiced" report (see
// turnoverInvoicedParser.ts). Read-only: period and accounting basis are the
// backend page's own parameters.
export function ReportTurnoverPage() {
  const [applied, setApplied] = useState<TurnoverFilters>({ start: '', end: '', basis: 'BOOKKEEPING' })
  const [draft, setDraft] = useState<TurnoverFilters | null>(null)
  const { data, isLoading, isFetching, isError, error, refetch } = useTurnoverInvoiced(applied)

  if (isLoading) return <LegacyLoadingCard label="Loading report…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load the report" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  const form = draft ?? { start: data.start, end: data.end, basis: applied.basis }
  const patch = (p: Partial<TurnoverFilters>) => setDraft({ ...form, ...p })
  const cols = data.groups.reduce((n, g) => n + g.labels.length, 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
            <TrendingUp size={20} className="text-brand" /> General Ledger Area
          </h2>
          <p className="mt-2 text-base font-bold uppercase tracking-wide text-text!">{data.title}</p>
          {data.period && <p className="text-sm text-text-muted">For the years ending {data.period}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <select value={form.basis} onChange={(e) => patch({ basis: e.target.value })} className={inputCls} title="Accounting basis">
            {TURNOVER_BASIS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <input type="date" value={toIso(form.start)} onChange={(e) => patch({ start: toUs(e.target.value) })} className={`${inputCls} w-40`} title="From" />
          <input type="date" value={toIso(form.end)} onChange={(e) => patch({ end: toUs(e.target.value) })} className={`${inputCls} w-40`} title="To" />
          <button
            type="button"
            onClick={() => setApplied(form)}
            disabled={isFetching}
            className="flex items-center gap-1.5 h-9 rounded-md bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {isFetching && <Loader2 size={14} className="animate-spin" />} View
          </button>
          <button type="button" onClick={() => window.print()} title="Print" className={btn}>
            <Printer size={16} />
          </button>
          <button type="button" onClick={() => exportCsv(data)} title="Export to CSV" className={btn}>
            <FileSpreadsheet size={16} />
          </button>
        </div>
      </div>

      <Card className="!h-auto !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface">
                <th />
                {data.groups.map((g) => (
                  <th key={g.year} colSpan={g.labels.length} className="border-l border-border px-3 py-2 text-center font-semibold text-brand">
                    {g.year}
                  </th>
                ))}
              </tr>
              <tr className="border-b border-border bg-surface text-xs uppercase tracking-wide text-text-faint">
                <th className="px-3 py-2 text-left font-medium">Month</th>
                {data.groups.flatMap((g) =>
                  g.labels.map((l, i) => (
                    <th key={`${g.year}${l}`} className={`px-3 py-2 text-right font-medium ${i === 0 ? 'border-l border-border' : ''}`}>
                      {l}
                    </th>
                  )),
                )}
              </tr>
            </thead>
            <tbody>
              {data.months.length === 0 && (
                <tr>
                  <td colSpan={cols + 1} className="px-3 py-6 text-center italic text-text-faint">
                    No data for this period.
                  </td>
                </tr>
              )}
              {data.months.map((m) => (
                <tr key={m.month} className="border-b border-border">
                  <td className="px-3 py-2 text-text">{m.month}</td>
                  {m.cells.map((c, i) => (
                    <td key={i} className={`px-3 py-2 text-right tabular-nums ${startsGroup(data, i) ? 'border-l border-border' : ''}`}>
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="bg-surface font-bold text-text!">
                <td className="px-3 py-2">{data.totalLabel}</td>
                {data.totals.map((c, i) => (
                  <td key={i} className={`px-3 py-2 text-right tabular-nums ${startsGroup(data, i) ? 'border-l border-border' : ''}`}>
                    {c}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

// True when flat column `i` is the first column of a year block.
function startsGroup(d: TurnoverReport, i: number): boolean {
  let n = 0
  for (const g of d.groups) {
    if (i === n) return true
    n += g.labels.length
  }
  return false
}
