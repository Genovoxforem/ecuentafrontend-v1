import { useQuery } from '@tanstack/react-query'
import { fapiGet } from '../../api/fapiEnvelope'

// The Monthly statement of leave (classic holiday/month_report.php, reached from the HRM area) on userprofile/fapi/hrm.php?month=&year=
// (26 Oct 2026). The answer holds the totals of the month and the leave by type; it takes the month and the year only: the classic form's
// Employee and Type filters are not parameters of the endpoint (a call that carries them gets the same answer), so the page has no such
// filters. No leave request exists on newecuenta, so every total is 0 and by_type is empty: a type row is read under the names a type
// row carries elsewhere (label, count, days) and has not been seen with a live row.

type Row = Record<string, unknown>
export interface FapiHrm {
  monthly_statement: {
    month: number
    year: number
    period: { start: string; end: string }
    total_requests: number
    employees_on_leave: number
    total_days_in_month: number
    by_type: Row[]
  }
}
export interface MonthlyStatement {
  month: number
  year: number
  start: string
  end: string
  totalRequests: number
  employeesOnLeave: number
  totalDays: number
  byType: Array<{ key: string; type: string; requests: string; days: string }>
}

const str = (v: unknown) => (v === null || v === undefined ? '' : String(v))
const first = (r: Row, ...keys: string[]) => {
  for (const k of keys) if (r[k] !== undefined && r[k] !== null && r[k] !== '') return r[k]
  return undefined
}

export function mapMonthlyStatement(d: FapiHrm): MonthlyStatement {
  const s = d.monthly_statement
  return {
    month: s.month,
    year: s.year,
    start: s.period.start,
    end: s.period.end,
    totalRequests: s.total_requests,
    employeesOnLeave: s.employees_on_leave,
    totalDays: s.total_days_in_month,
    byType: s.by_type.map((t, i) => ({
      key: str(first(t, 'type_id', 'id', 'code')) || String(i),
      type: str(first(t, 'type_label', 'label', 'name', 'type')),
      requests: str(first(t, 'requests', 'count', 'total_requests')),
      days: str(first(t, 'days', 'total_days', 'duration_days')),
    })),
  }
}

export const loadMonthlyStatement = async (month: number, year: number) => mapMonthlyStatement(await fapiGet<FapiHrm>('/userprofile/fapi/hrm.php', { month, year }))

export const useMonthlyStatement = (month: number, year: number) =>
  useQuery({ queryKey: ['users', 'hrm', 'monthlyStatement', month, year], queryFn: () => loadMonthlyStatement(month, year) })
