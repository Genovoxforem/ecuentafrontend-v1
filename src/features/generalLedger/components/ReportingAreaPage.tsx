import { useState } from 'react'
import { FileSpreadsheet, Loader2, Printer, Scale } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { BASIS_OPTIONS, useIncomeExpenseByYear, type Basis } from '../incomeExpenseByYear.queries'
import type { IncomeExpenseByYear } from '../incomeExpenseByYearParser'

const selectCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30'
const btn = 'flex items-center justify-center h-9 w-9 rounded-md bg-brand text-white hover:bg-brand-hover'
const cell = 'px-3 py-2 text-right tabular-nums border-l border-border'

function toCsv(d: IncomeExpenseByYear): string {
  const q = (s: string) => `"${s.replace(/"/g, '""')}"`
  const rows: string[][] = [
    ['', ...d.years.flatMap((y) => [y, ''])],
    ['Month', ...d.years.flatMap(() => ['Expense', 'Income'])],
    ...d.months.map((m) => [m.month, ...m.values.flatMap((v) => [v.expense, v.income])]),
    [d.totalLabel, ...d.totals.flatMap((v) => [v.expense, v.income])],
    [d.resultLabel, ...d.results.flatMap((r) => [r, ''])],
  ]
  return rows.map((r) => r.map(q).join(',')).join('\r\n')
}

function exportCsv(d: IncomeExpenseByYear) {
  const url = URL.createObjectURL(new Blob([toCsv(d)], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'income-expense-by-year.csv'
  a.click()
  URL.revokeObjectURL(url)
}

// compta/resultat/index.php — the real "Balance of income and expenses, by
// year" report (see incomeExpenseByYearParser.ts). Read-only: the year picker
// sets the last of the four years shown and the basis picker switches the
// backend's own accounting basis.
export function ReportingAreaPage() {
  const [lastYear, setLastYear] = useState<number | null>(null)
  const [basis, setBasis] = useState<Basis>('BOOKKEEPING')
  const { data, isLoading, isFetching, isError, error, refetch } = useIncomeExpenseByYear(lastYear, basis)

  if (isLoading) return <LegacyLoadingCard label="Loading report…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load the report" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  const shownLast = Number(data.years[data.years.length - 1]) || new Date().getFullYear()
  const thisYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 12 }, (_, i) => thisYear + 1 - i)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
            <Scale size={20} className="text-brand" /> General Ledger Area
          </h2>
          <p className="mt-2 text-base font-bold uppercase tracking-wide text-text!">{data.title}</p>
          {data.period && <p className="text-sm text-text-muted">For the years ending {data.period}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {isFetching && <Loader2 size={16} className="animate-spin text-text-faint" />}
          <select value={basis} onChange={(e) => setBasis(e.target.value as Basis)} className={selectCls} title="Accounting basis">
            {BASIS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select value={shownLast} onChange={(e) => setLastYear(Number(e.target.value))} className={selectCls} title="Last year shown">
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                Up to {y}
              </option>
            ))}
          </select>
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
                {data.years.map((y) => (
                  <th key={y} colSpan={2} className="border-l border-border px-3 py-2 text-center font-semibold text-brand">
                    {y}
                  </th>
                ))}
              </tr>
              <tr className="border-b border-border bg-surface text-xs uppercase tracking-wide text-text-faint">
                <th className="px-3 py-2 text-left font-medium">Month</th>
                {data.years.flatMap((y) => [
                  <th key={`${y}e`} className="border-l border-border px-3 py-2 text-right font-medium">
                    Expense
                  </th>,
                  <th key={`${y}i`} className="px-3 py-2 text-right font-medium">
                    Income
                  </th>,
                ])}
              </tr>
            </thead>
            <tbody>
              {data.months.map((m) => (
                <tr key={m.month} className="border-b border-border">
                  <td className="px-3 py-2 text-text">{m.month}</td>
                  {m.values.flatMap((v, i) => [
                    <td key={`${i}e`} className={cell}>
                      {v.expense}
                    </td>,
                    <td key={`${i}i`} className="px-3 py-2 text-right tabular-nums">
                      {v.income}
                    </td>,
                  ])}
                </tr>
              ))}
              <tr className="border-b border-border bg-surface font-semibold text-text!">
                <td className="px-3 py-2">{data.totalLabel}</td>
                {data.totals.flatMap((v, i) => [
                  <td key={`${i}e`} className={cell}>
                    {v.expense}
                  </td>,
                  <td key={`${i}i`} className="px-3 py-2 text-right tabular-nums">
                    {v.income}
                  </td>,
                ])}
              </tr>
              <tr className="bg-surface font-bold text-text!">
                <td className="px-3 py-2">{data.resultLabel}</td>
                {data.results.map((r, i) => (
                  <td key={i} colSpan={2} className={`${cell} text-right`}>
                    {r}
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
