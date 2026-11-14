import { useQuery } from '@tanstack/react-query'
import { fapiGet } from '../../api/fapiEnvelope'

// The Monthly statement of leave (classic holiday/month_report.php, reached from the HRM area) on userprofile/fapi/hrm.php?month=&year=
// (26 Oct 2026). The answer holds the totals of the month and the leave by type; it takes the month and the year only: the classic form's
// Employee and Type filters are search_employee / search_type since 11 Nov 2026 (before that a call that carried them got the same answer). No leave request exists on newecuenta, so every total is 0 and by_type is empty: a type row is read under the names a type
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
    // echoed since 11 Nov 2026: the Employee and Type filters the call carried
    filters?: { employee?: number | null; type?: number | null }
    // The leave requests of the month (since 11 Nov 2026), joined to the user for the name
    requests?: Array<{ id: number; employee_id: number; employee: string; type_id: number; type_label: string; date_start: string; date_end: string; days: number }>
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
  requests: Array<{ id: number; employeeId: number; employee: string; type: string; start: string; end: string; days: string }>
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
    requests: (s.requests ?? []).map((r) => ({ id: r.id, employeeId: r.employee_id, employee: r.employee, type: r.type_label, start: r.date_start, end: r.date_end, days: String(r.days) })),
    byType: s.by_type.map((t, i) => ({
      key: str(first(t, 'type_id', 'id', 'code')) || String(i),
      type: str(first(t, 'type_label', 'label', 'name', 'type')),
      requests: str(first(t, 'requests', 'count', 'total_requests')),
      days: str(first(t, 'days', 'total_days', 'duration_days')),
    })),
  }
}

export interface MonthlyStatementFilters {
  employee: string
  type: string
}

// search_employee (a user id) and search_type (a leave type id) are the classic month_report.php filters; the answer echoes them under filters.
export const loadMonthlyStatement = async (month: number, year: number, f?: MonthlyStatementFilters) =>
  mapMonthlyStatement(await fapiGet<FapiHrm>('/userprofile/fapi/hrm.php', { month, year, search_employee: f?.employee || undefined, search_type: f?.type || undefined }))

// The Employee and Type lists of the form: the employees from core/fapi/users.php, the leave types from payroll/fapi/leave_types.php (active ones).
export const useLeaveTypeFilterOptions = () =>
  useQuery({
    queryKey: ['users', 'hrm', 'leaveTypes'],
    queryFn: async () => (await fapiGet<{ items: Array<{ id: number; label: string; active: number }> }>('/payroll/fapi/leave_types.php')).items.filter((t) => t.active === 1).map((t) => ({ value: String(t.id), label: t.label })),
    staleTime: 1000 * 60 * 10,
    retry: false,
  })
export const useEmployeeFilterOptions = () =>
  useQuery({
    queryKey: ['users', 'hrm', 'employees'],
    queryFn: async () => (await fapiGet<{ items: Array<{ id: number; fullname: string; login: string; employee: boolean }> }>('/core/fapi/users.php', { limit: 500 })).items.filter((u) => u.employee).map((u) => ({ value: String(u.id), label: u.fullname || u.login })),
    staleTime: 1000 * 60 * 10,
    retry: false,
  })

export const useMonthlyStatement = (month: number, year: number, f?: MonthlyStatementFilters) =>
  useQuery({ queryKey: ['users', 'hrm', 'monthlyStatement', month, year, f?.employee ?? '', f?.type ?? ''], queryFn: () => loadMonthlyStatement(month, year, f) })
