import { fapiGet } from '../../api/fapiEnvelope'
import { formatMoney } from '../../utils/format'
import type { IncomeExpenseByYear } from './incomeExpenseByYearParser'
import type { TurnoverReport } from './turnoverInvoicedParser'
import type { ReportTable } from './legacyTable'

// The ledger reports on compta/resultat/fapi and compta/stats/fapi (22 Oct 2026), rendered in the shapes the report pages already take.
// reporting_area and turnover answers were captured from newecuenta on 22 Oct 2026 (tests/fixtures/accountancy-reporting-area.json,
// accountancy-turnover.json). The two group reports are empty on that server, so their item shapes are the document's own ("Item shape
// from code") and have not been seen with live data.

// ---- Income and expense by year: compta/resultat/fapi/reporting_area.php ---------------------------------------------------------

export interface FapiReportingArea {
  title: string
  mode: string
  period: { start: string; end: string }
  years: number[]
  months: Array<{ month: number; month_label: string; values: Array<{ year: number; expense: number; income: number }> }>
  totals: Array<{ year: number; expense: number; income: number }>
  results: Array<{ year: number; result: number }>
}

export function mapReportingArea(d: FapiReportingArea): IncomeExpenseByYear {
  const at = <T extends { year: number }>(list: T[], year: number) => list.find((x) => x.year === year)
  return {
    title: d.title,
    period: `${d.period.start} - ${d.period.end}`,
    years: d.years.map(String),
    months: d.months.map((m) => ({
      month: m.month_label,
      values: d.years.map((y) => ({ expense: formatMoney(at(m.values, y)?.expense ?? 0), income: formatMoney(at(m.values, y)?.income ?? 0) })),
    })),
    totalLabel: 'Total',
    totals: d.years.map((y) => ({ expense: formatMoney(at(d.totals, y)?.expense ?? 0), income: formatMoney(at(d.totals, y)?.income ?? 0) })),
    resultLabel: 'Accounting result',
    results: d.years.map((y) => formatMoney(at(d.results, y)?.result ?? 0)),
  }
}

export const loadReportingArea = async (lastYear: number | null, basis: string): Promise<IncomeExpenseByYear> =>
  mapReportingArea(await fapiGet<FapiReportingArea>('/compta/resultat/fapi/reporting_area.php', { modecompta: basis, year: lastYear ?? undefined }))

// ---- Turnover invoiced: compta/stats/fapi/turnover.php ---------------------------------------------------------------------------

export interface FapiTurnover {
  title: string
  mode: string
  period: { start: string; end: string }
  years: number[]
  has_amount_ht: boolean
  months: Array<{ month: number; month_label: string; values: Array<{ year: number; amount_ht: number | null; amount_ttc: number; delta_pct: number | null }> }>
  totals: Array<{ year: number; amount_ht: number | null; amount_ttc: number; delta_pct: number | null }>
}

// yyyy-mm-dd -> MM/dd/yyyy, the way the page prints and takes its period.
const usDate = (iso: string) => {
  const [y, m, d] = iso.split('-')
  return y && m && d ? `${m}/${d}/${y}` : ''
}
// A year-over-year change; no value (null) prints as "-".
const delta = (v: number | null) => (v === null ? '-' : `${Number(v.toFixed(2))} %`)

export function mapTurnover(d: FapiTurnover): TurnoverReport {
  // Each year is a block of columns: the amount excl. tax only when the basis has it, the amount incl. tax, and the change.
  const labels = [...(d.has_amount_ht ? ['Amount (excl. tax)'] : []), 'Amount (inc. tax)', 'Delta']
  const cells = (v: { amount_ht: number | null; amount_ttc: number; delta_pct: number | null } | undefined) => [
    ...(d.has_amount_ht ? [v?.amount_ht == null ? '-' : formatMoney(v.amount_ht)] : []),
    formatMoney(v?.amount_ttc ?? 0),
    delta(v?.delta_pct ?? null),
  ]
  return {
    title: d.title,
    period: `${d.period.start} - ${d.period.end}`,
    start: usDate(d.period.start),
    end: usDate(d.period.end),
    basis: d.mode,
    groups: d.years.map((y) => ({ year: String(y), labels })),
    months: d.months.map((m) => ({ month: m.month_label, cells: d.years.flatMap((y) => cells(m.values.find((v) => v.year === y))) })),
    totalLabel: 'Total',
    totals: d.years.flatMap((y) => cells(d.totals.find((t) => t.year === y))),
  }
}

export const loadTurnover = async (filters: { start: string; end: string; basis: string }): Promise<TurnoverReport> => {
  const iso = (us: string) => {
    const m = us.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    return m ? `${m[3]}-${m[1]}-${m[2]}` : undefined
  }
  const start = iso(filters.start)
  const end = iso(filters.end)
  return mapTurnover(await fapiGet<FapiTurnover>('/compta/stats/fapi/turnover.php', { modecompta: filters.basis, start: start && end ? start : undefined, end: start && end ? end : undefined }))
}

// ---- Result by account groups: compta/resultat/fapi/groups.php?mode=predefined | personalized -------------------------------------

export interface FapiPredefinedGroups {
  groups: Array<{ pcg_type: string; label: string; subtotal: number; lines: Array<{ name: string; amount: number }>; accounts?: Array<{ account_number: string; account_label: string; amount: number }> }>
  total: number
}

const section = (cells: string[]) => ({ cells, kind: 'section' as const })
const item = (cells: string[]) => ({ cells, kind: 'item' as const })
const total = (cells: string[]) => ({ cells, kind: 'total' as const })

export function mapPredefinedGroups(d: FapiPredefinedGroups): ReportTable {
  const rows: ReportTable['rows'] = []
  for (const g of d.groups) {
    rows.push(section([g.label, formatMoney(g.subtotal)]))
    for (const l of g.lines) rows.push(item([l.name, formatMoney(l.amount)]))
    for (const a of g.accounts ?? []) rows.push(item([`${a.account_number} - ${a.account_label}`, formatMoney(a.amount)]))
  }
  if (d.groups.length > 0) rows.push(total(['Total', formatMoney(d.total)]))
  return { headers: ['Predefined groups', 'Amount'], rows }
}

export interface FapiPersonalizedGroups {
  month_order: number[]
  groups: Array<{ code: string; label: string; computed: boolean; formula: string | null; previous_period: number; selected_period: number; months: Array<{ month: number; amount: number }> }>
}

const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function mapPersonalizedGroups(d: FapiPersonalizedGroups): ReportTable {
  const order = d.month_order.length ? d.month_order : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  return {
    headers: ['Personalized groups', 'Previous period', 'Selected period', ...order.map((m) => MONTHS[m])],
    rows: d.groups.map((g) => item([g.label, formatMoney(g.previous_period), formatMoney(g.selected_period), ...order.map((m) => formatMoney(g.months.find((x) => x.month === m)?.amount ?? 0))])),
  }
}

export async function loadGroupsReport(mode: 'predefined' | 'personalized', start: string, end: string): Promise<ReportTable> {
  const params = { mode, start, end }
  if (mode === 'predefined') return mapPredefinedGroups(await fapiGet<FapiPredefinedGroups>('/compta/resultat/fapi/groups.php', params))
  return mapPersonalizedGroups(await fapiGet<FapiPersonalizedGroups>('/compta/resultat/fapi/groups.php', params))
}
