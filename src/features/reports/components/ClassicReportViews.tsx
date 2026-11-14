import { useState } from 'react'
import { FileBarChart } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { choices } from '../receivablesClassic.data'
import { TableExportButtons } from '../../../shared/components/TableExportButtons'
import { initialPeriod, STATEMENTS, useBalanceSheet, type BalanceSide, TABLE_REPORTS, useStatement, useTableReport, type ReportPeriod, type StatementDef, type StatementTable, type TableReportDef } from '../classicReports.data'
import { isoDate, monthEnd, monthStart } from '../reportFormat'
import { inputCls, primaryBtn, RangeBar, SelectField } from './ReportWidgets'
import { Status, TableWithTotals, Title } from './ReceivablesReportViews'

// Reports Center pages laid out as the classic page is (title, period and filters, heading, table) and filled from the classic page itself
// (classicReports.data.ts). Nothing here is computed: the rows, totals and statement lines are the classic page's.

function Heading({ text, period }: { text: string; period: ReportPeriod | null }) {
  return (
    <div className="text-center">
      <p className="text-base font-bold uppercase text-text!">{text}</p>
      {period && (
        <p className="text-sm text-text-muted">
          For the period of {period.start} To {period.end}
        </p>
      )}
    </div>
  )
}

// One day, for the "Stocks at date" page.
function DateBar({ value, onApply, children }: { value: string; onApply: (v: string) => void; children?: React.ReactNode }) {
  const [draft, setDraft] = useState(value)
  return (
    <Card className="!h-auto">
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          onApply(draft)
        }}
      >
        <label className="text-sm font-medium text-text">
          <span className="mb-1 block">Date</span>
          <input type="date" value={draft} onChange={(e) => setDraft(e.target.value)} className={inputCls} />
        </label>
        {children}
        <button type="submit" className={primaryBtn}>
          Refresh
        </button>
      </form>
    </Card>
  )
}

export function ClassicTableReportView({ reportKey }: { reportKey: string }) {
  const def: TableReportDef = TABLE_REPORTS[reportKey]
  const [period, setPeriod] = useState<ReportPeriod | null>(() => initialPeriod(def))
  const [filters, setFilters] = useState<Record<string, string>>({})
  const q = useTableReport(def, period, filters)
  // a page that opens on its own default shows the month in its date box, like the classic page
  const fallback = period ?? (def.initial === 'page' ? { start: monthStart(), end: monthEnd() } : { start: isoDate(new Date()), end: isoDate(new Date()) })
  const filterFields = (def.filters ?? []).map((f) => (
    <SelectField key={f.name} label={f.label} value={filters[f.name] ?? ''} onChange={(v) => setFilters((cur) => ({ ...cur, [f.name]: v }))} options={choices(q.data?.options[f.name], f.skip)} blank={f.blank} />
  ))
  return (
    <div className="space-y-4">
      <Title icon={FileBarChart}>{def.title}</Title>
      {def.period === 'single' ? (
        <DateBar value={fallback.start} onApply={(v) => setPeriod({ start: v, end: v })}>
          {filterFields}
        </DateBar>
      ) : def.period !== 'none' ? (
        <RangeBar key={`${fallback.start}|${fallback.end}`} start={fallback.start} end={fallback.end} label={def.period === 'daterange' ? 'Date range' : 'Report period'} buttonLabel={def.key === 'stock-movement' || def.key === 'warehouse-summary' ? 'Refresh' : 'View Report'} onApply={(start, end) => setPeriod({ start, end })}>
          {filterFields}
        </RangeBar>
      ) : null}
      <Heading text={def.heading} period={def.period === 'none' || def.period === 'single' ? null : period} />
      <Status q={q} label={`Loading ${def.title.toLowerCase()}…`} />
      {q.data && <TableWithTotals title={def.title} table={q.data.table} />}
    </div>
  )
}

// ---- Balance sheets ------------------------------------------------------------------------------------------------------------------------------

function BalanceSideBlock({ side, tone }: { side: BalanceSide; tone: 'liab' | 'asset' }) {
  const band = tone === 'liab' ? 'border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300' : 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300'
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-alt">
      <div className={`flex items-center justify-between border-b px-4 py-2 text-xs font-bold uppercase tracking-wide ${band}`}>
        <span>{side.title}</span>
        <span>{side.amountLabel}</span>
      </div>
      <table className="w-full text-sm">
        <tbody>
          {side.lines.map((line, i) => {
            const [code, label, ...rest] = line.cells
            const amount = rest.filter(Boolean).at(-1) ?? ''
            return (
              <tr key={i} className={`border-t border-border first:border-t-0 ${line.kind === 'subtotal' ? 'bg-surface font-semibold text-text!' : line.kind === 'section' ? 'font-semibold text-text!' : 'text-text'}`}>
                <td className="w-14 px-3 py-1.5 align-top text-xs text-text-faint">{code}</td>
                <td className="px-2 py-1.5" style={{ paddingLeft: `${line.indent * 1.25 + 0.5}rem` }}>
                  {label}
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums">{amount}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// Horizontal: the liabilities and the assets side by side; Vertical: the same two blocks one under the other, as the classic pages lay them out.
export function BalanceSheetView({ vertical, title }: { vertical: boolean; title: string }) {
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [draftYear, setDraftYear] = useState(year)
  const q = useBalanceSheet(vertical, year)
  const sheet = q.data
  function getExportData() {
    return {
      headers: ['Code', 'Particulars', 'Amount'],
      rows: (sheet?.sides ?? []).flatMap((s) => [[s.title.toUpperCase(), '', s.amountLabel], ...s.lines.map((l) => [l.cells[0] ?? '', l.cells[1] ?? '', l.cells.slice(2).filter(Boolean).at(-1) ?? ''])]),
    }
  }
  return (
    <div className="space-y-4">
      <Title icon={FileBarChart}>{title}</Title>
      <Card className="!h-auto">
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            setYear(draftYear)
          }}
        >
          <label className="text-sm font-medium text-text">
            <span className="mb-1 block">Financial Year</span>
            <input type="number" value={draftYear} onChange={(e) => setDraftYear(e.target.value)} className={`${inputCls} w-28`} />
          </label>
          <button type="submit" className={primaryBtn}>
            View
          </button>
          {sheet && <TableExportButtons title={sheet.title} getExportData={getExportData} />}
        </form>
      </Card>
      <Status q={q} label="Loading the balance sheet…" />
      {sheet && (
        <>
          <div className="text-center">
            <p className="text-base font-bold uppercase text-text!">{sheet.title}</p>
            {sheet.subtitles.map((s) => (
              <p key={s} className="text-sm text-text-muted">
                {s}
              </p>
            ))}
          </div>
          <div className={`grid grid-cols-1 gap-4 ${vertical ? '' : 'xl:grid-cols-2'}`}>
            {sheet.sides.map((side, i) => (
              <BalanceSideBlock key={i} side={side} tone={i === 0 ? 'liab' : 'asset'} />
            ))}
          </div>
          {sheet.cards.length > 0 && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              {sheet.cards.map((c) => (
                <Card key={c.label} className="!h-auto !p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{c.label}</p>
                  <p className="mt-1 text-lg font-bold text-text!">{c.value}</p>
                </Card>
              ))}
            </div>
          )}
          {sheet.footer && <p className="text-center text-xs text-text-faint">{sheet.footer}</p>}
        </>
      )}
    </div>
  )
}

// ---- Statements ---------------------------------------------------------------------------------------------------------------------------------

const NUMBER = /^-?[\d,]+(\.\d+)?%?$/

function StatementBlock({ table }: { table: StatementTable }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface-alt">
      <table className="w-full text-sm">
        <tbody>
          {table.map((row, ri) => (
            <tr key={ri} className="border-t border-border first:border-t-0">
              {row.map((c, ci) => {
                const cls = `px-3 py-1.5 ${c.head ? 'font-semibold text-text!' : 'text-text'} ${NUMBER.test(c.text) ? 'text-right tabular-nums' : ''}`
                return c.head ? (
                  <th key={ci} colSpan={c.colSpan} rowSpan={c.rowSpan} className={`${cls} text-left`}>
                    {c.text}
                  </th>
                ) : (
                  <td key={ci} colSpan={c.colSpan} rowSpan={c.rowSpan} className={cls}>
                    {c.text}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ClassicStatementView({ reportKey }: { reportKey: string }) {
  const def: StatementDef = STATEMENTS[reportKey]
  const now = new Date()
  const [period, setPeriod] = useState<ReportPeriod | null>(def.period === 'profitLoss' ? { start: isoDate(new Date(now.getFullYear(), now.getMonth(), 1)), end: isoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)) } : null)
  const [year, setYear] = useState(String(now.getFullYear()))
  const [draftYear, setDraftYear] = useState(year)
  const q = useStatement(def, period, year)
  return (
    <div className="space-y-4">
      <Title icon={FileBarChart}>{def.title}</Title>
      {(def.period === 'profitLoss' || def.period === 'post') && (
        <RangeBar key={`${period?.start}|${period?.end}`} start={period?.start ?? isoDate(new Date(now.getFullYear(), 0, 1))} end={period?.end ?? isoDate(new Date(now.getFullYear(), 11, 31))} label="Date Range" buttonLabel="View Report" onApply={(start, end) => setPeriod({ start, end })}>
          {def.period === 'profitLoss' && (
            <label className="text-sm font-medium text-text">
              <span className="mb-1 block">Financial Year</span>
              <input type="number" value={draftYear} onChange={(e) => setDraftYear(e.target.value)} onBlur={() => setYear(draftYear)} className={`${inputCls} w-28`} />
            </label>
          )}
        </RangeBar>
      )}
      {def.period === 'year' && (
        <Card className="!h-auto">
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              setYear(draftYear)
            }}
          >
            <label className="text-sm font-medium text-text">
              <span className="mb-1 block">Financial Year</span>
              <input type="number" value={draftYear} onChange={(e) => setDraftYear(e.target.value)} className={`${inputCls} w-28`} />
            </label>
            <button type="submit" className={primaryBtn}>
              View
            </button>
          </form>
        </Card>
      )}
      <Heading text={def.heading} period={def.period === 'profitLoss' || def.period === 'post' ? period : null} />
      <Status q={q} label={`Loading ${def.title.toLowerCase()}…`} />
      {q.data && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {q.data.map((t, i) => (
            <StatementBlock key={i} table={t} />
          ))}
        </div>
      )}
    </div>
  )
}
