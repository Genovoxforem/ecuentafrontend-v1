import { useQuery } from '@tanstack/react-query'
import { fetchLegacyDocument, fetchLegacyText } from '../../shared/legacyHtmlFetch'
import { hrmGet } from './hrm.api'
import { parsePayrollTable, type PayrollLegacyTable } from './payrollLegacyTable'
import type { YtdEarningsDeductionsReport } from './ytdEarningsDeductions.types'
import {
  parseOverallAttendanceGroupOptions,
  parseOverallAttendanceEmployeeOptions,
  type OverallAttendanceOption,
  type OverallAttendanceEmployeeOptions,
} from './overallAttendanceReportParser'
import {
  parseEmployeeMonthlyReportEmployees,
  parseEmployeeMonthlyReport,
  type EmployeeMonthlyReportOption,
  type EmployeeMonthlyReportResult,
} from './employeeMonthlyReportParser'
import {
  parseAttendancePeriodEmployees,
  parseAttendancePeriodReport,
  type AttendancePeriodEmployeeOption,
  type AttendancePeriodReportResult,
} from './attendancePeriodReportParser'
import { parseAbsentListEmployees, parseEmployeeAbsentList, type AbsentListEmployeeOption, type AbsentListResult } from './employeeAbsentListParser'
import { parseOvertimeList, type OvertimeListRow } from './overtimeListParser'
import { parseGratuityEmployees, parseGratuityReport, type GratuityEmployeeOption, type GratuityReportResult } from './gratuityReportParser'
import { parseShiftReportEntities, parseShiftPivotReport, type ShiftPivotEntityOption, type ShiftPivotReportResult } from './shiftPivotReportParser'
import {
  parseShiftSalaryEntities,
  parseShiftSalaryEmployees,
  parseShiftSalaryReport,
  type ShiftSalaryEntityOption,
  type ShiftSalaryEmployeeOption,
  type ShiftSalaryRow,
} from './shiftSalaryReportParser'

// The Payroll HR / shift / salary list pages. Each legacy page renders its
// records into a server-side `table#example` (see payrollLegacyTable.ts), and its
// own delete button POSTs `payroll/ajax.php?<deleteParam>=<id>`. `deleteParam` is
// omitted for the read-only pages (Manage Salary List).
export const PAYROLL_LIST_PAGES = {
  holiday: { path: '/payroll/holiday.php', deleteParam: 'deletHoliday' },
  award: { path: '/payroll/award.php', deleteParam: 'deleteAward' },
  transfers: { path: '/payroll/transfers.php', deleteParam: 'deltrans' },
  resignations: { path: '/payroll/resignations.php', deleteParam: 'deleteresign' },
  travel: { path: '/payroll/travel.php', deleteParam: 'deltravel' },
  complaints: { path: '/payroll/complaints.php', deleteParam: 'delcomplaint' },
  warnings: { path: '/payroll/warnings.php', deleteParam: 'delwarn' },
  terminations: { path: '/payroll/terminations.php', deleteParam: 'deltermi' },
  shifts: { path: '/payroll/shifts.php', deleteParam: 'deleteshifts' },
  advance: { path: '/payroll/advance.php', deleteParam: 'deleteadvance' },
  loan: { path: '/payroll/loan.php', deleteParam: 'delete_loan' },
  salaryTemplate: { path: '/payroll/salary_temp.php', deleteParam: 'deletesal_temp' },
  hourlyTemplate: { path: '/payroll/hour_temp.php', deleteParam: 'delete_hourTemp' },
  indicator: { path: '/payroll/indicator.php', deleteParam: 'delindi' },
  appraisal: { path: '/payroll/appraisal.php', deleteParam: 'delapprisal' },
  manageSalaryList: { path: '/payroll/manage_salary_list.php', deleteParam: null },
} as const

export type PayrollListKey = keyof typeof PAYROLL_LIST_PAGES

export function payrollListQueryKey(key: PayrollListKey) {
  return ['payroll', 'list', key] as const
}

export function usePayrollLegacyList(key: PayrollListKey) {
  return useQuery({
    queryKey: payrollListQueryKey(key),
    queryFn: async (): Promise<PayrollLegacyTable> => parsePayrollTable(await fetchLegacyDocument(PAYROLL_LIST_PAGES[key].path)),
    staleTime: 1000 * 30,
  })
}

// Via payroll/earn_dedu.php — a plain GET-able classic report (its own
// <form> is POST-only and CSRF-blocked when called from this app's origin,
// but the same search_type/monthPic/y_calnd params work as a GET) — see
// ytdEarningsDeductions.types.ts's own top comment for the behavior of each
// search type. searchType/value blank means "default" (today's month),
// matching the classic page's own no-params load.
export type YtdEarningsDeductionsSearchType = '' | 'month' | 'year'
export function useYtdEarningsDeductions(searchType: YtdEarningsDeductionsSearchType, value: string) {
  return useQuery({
    queryKey: ['payroll', 'ytd-earnings-deductions', searchType, value],
    // payroll/fapi/ytd_earnings_deductions.php: the same heading, header groups, columns and one row per employee as the
    // classic report (heading and employee rows checked live on newecuenta; no employee has figures there, so the values
    // are not checked). For the fiscal-year view it answers the right report, where the classic GET returned the month one.
    queryFn: async (): Promise<YtdEarningsDeductionsReport> => {
      const params: Record<string, string> = {}
      if (searchType === 'month') params.monthPic = value
      if (searchType === 'year') params.y_calnd = value
      if (searchType) params.search_type = searchType
      const d = await hrmGet<{ heading: string; groups: YtdEarningsDeductionsReport['groups']; columns: string[]; rows: Array<{ employee_name: string; values: string[] }> }>('ytd_earnings_deductions', params)
      return { heading: d.heading, groups: d.groups, columns: d.columns, rows: d.rows.map((r) => ({ employeeName: r.employee_name, values: r.values })) }
    },
  })
}

// Real via payroll/ajax.php's two cascading-select actions behind Overall
// Attendance Report's Entity → Groups → Employee filters — see
// overallAttendanceReportParser.ts's own top comment. The report grid
// itself (payroll/ajax_get_attendance_rows.php) is a separate, genuinely
// CSRF-blocked endpoint — see OverallAttendanceReportForm.tsx.
export function useOverallAttendanceGroups(entity: string) {
  return useQuery({
    queryKey: ['payroll', 'overall-attendance', 'groups', entity],
    queryFn: async (): Promise<OverallAttendanceOption[]> => {
      const html = await fetchLegacyText(`/payroll/ajax.php?overallreport=${encodeURIComponent(entity)}`, { method: 'POST' })
      return parseOverallAttendanceGroupOptions(html)
    },
    enabled: !!entity,
  })
}
export function useOverallAttendanceEmployees(entity: string, group: string) {
  return useQuery({
    queryKey: ['payroll', 'overall-attendance', 'employees', entity, group],
    queryFn: async (): Promise<OverallAttendanceEmployeeOptions> => {
      const params = new URLSearchParams({ oallreport: '1', entt: entity, grup: group })
      const html = await fetchLegacyText(`/payroll/ajax.php?${params.toString()}`, { method: 'POST' })
      return parseOverallAttendanceEmployeeOptions(html)
    },
    enabled: !!entity && !!group,
  })
}

// Via payroll/atten_emp_rip.php — a plain GET-able classic report page (its
// own <form> is POST-only and CSRF-blocked cross-origin, same as
// earn_dedu.php's own form, but the same params work as a GET) — see
// employeeMonthlyReportParser.ts's own top comment. Employee options are
// this same page's own #employee_li select, so no separate request is
// needed to populate that dropdown.
export function useEmployeeMonthlyReportEmployees() {
  return useQuery({
    queryKey: ['payroll', 'employee-monthly-report', 'employees'],
    queryFn: async (): Promise<EmployeeMonthlyReportOption[]> => {
      const doc = await fetchLegacyDocument('/payroll/atten_emp_rip.php')
      return parseEmployeeMonthlyReportEmployees(doc)
    },
    staleTime: 1000 * 60 * 10,
  })
}
export function useEmployeeMonthlyReport(monthLabel: string, employeeValue: string) {
  return useQuery({
    queryKey: ['payroll', 'employee-monthly-report', monthLabel, employeeValue],
    queryFn: async (): Promise<EmployeeMonthlyReportResult> => {
      const params = new URLSearchParams({ monthPic: monthLabel, employee_li: employeeValue, submitt: 'Go' })
      const html = await fetchLegacyText(`/payroll/atten_emp_rip.php?${params.toString()}`)
      return parseEmployeeMonthlyReport(html)
    },
    enabled: !!monthLabel && !!employeeValue,
  })
}

// Real via payroll/atten_period_rip.php — see attendancePeriodReportParser.ts's
// own top comment for the real stdate/enddate format quirk (MM/DD/YYYY here,
// unlike absent_list.php's YYYY-MM-DD).
export function useAttendancePeriodEmployees() {
  return useQuery({
    queryKey: ['payroll', 'attendance-period-report', 'employees'],
    queryFn: async (): Promise<AttendancePeriodEmployeeOption[]> => {
      const doc = await fetchLegacyDocument('/payroll/atten_period_rip.php')
      return parseAttendancePeriodEmployees(doc)
    },
    staleTime: 1000 * 60 * 10,
  })
}
export function useAttendancePeriodReport(employeeId: string, startDateMDY: string, endDateMDY: string) {
  return useQuery({
    queryKey: ['payroll', 'attendance-period-report', employeeId, startDateMDY, endDateMDY],
    queryFn: async (): Promise<AttendancePeriodReportResult> => {
      const params = new URLSearchParams({ employee_li: employeeId, stdate: startDateMDY, enddate: endDateMDY, searchBydate: '1' })
      const html = await fetchLegacyText(`/payroll/atten_period_rip.php?${params.toString()}`)
      return parseAttendancePeriodReport(html)
    },
    enabled: !!employeeId && !!startDateMDY && !!endDateMDY,
  })
}

// Real via payroll/absent_list.php — see employeeAbsentListParser.ts's own
// top comment for the real stdate/enddate format quirk (YYYY-MM-DD here,
// unlike atten_period_rip.php's MM/DD/YYYY).
export function useAbsentListEmployees() {
  return useQuery({
    queryKey: ['payroll', 'employee-absent-list', 'employees'],
    queryFn: async (): Promise<AbsentListEmployeeOption[]> => {
      const doc = await fetchLegacyDocument('/payroll/absent_list.php')
      return parseAbsentListEmployees(doc)
    },
    staleTime: 1000 * 60 * 10,
  })
}
export function useEmployeeAbsentList(employeeId: string, startDateIso: string, endDateIso: string) {
  return useQuery({
    queryKey: ['payroll', 'employee-absent-list', employeeId, startDateIso, endDateIso],
    queryFn: async (): Promise<AbsentListResult> => {
      const params = new URLSearchParams({ employee_li: employeeId, stdate: startDateIso, enddate: endDateIso, searchBydate: '1' })
      const html = await fetchLegacyText(`/payroll/absent_list.php?${params.toString()}`)
      return parseEmployeeAbsentList(html)
    },
    enabled: !!employeeId && !!startDateIso && !!endDateIso,
  })
}

// Real via payroll/over_time.php — see overtimeListParser.ts's own top
// comment. `date` is YYYY-MM-DD, the same format <input type="date"> gives
// natively — no conversion needed.
export function useOvertimeList(date: string) {
  return useQuery({
    queryKey: ['payroll', 'overtime-list', date],
    queryFn: async (): Promise<OvertimeListRow[]> => {
      const params = new URLSearchParams({ nameIN: date, searchBydate: '1' })
      const html = await fetchLegacyText(`/payroll/over_time.php?${params.toString()}`)
      return parseOvertimeList(html)
    },
    enabled: !!date,
  })
}

// Real via payroll/gratuity_report.php — see gratuityReportParser.ts's own
// top comment.
export function useGratuityEmployees() {
  return useQuery({
    queryKey: ['payroll', 'gratuity-report', 'employees'],
    queryFn: async (): Promise<GratuityEmployeeOption[]> => {
      const doc = await fetchLegacyDocument('/payroll/gratuity_report.php')
      return parseGratuityEmployees(doc)
    },
    staleTime: 1000 * 60 * 10,
  })
}
export function useGratuityReport(employeeId: string) {
  return useQuery({
    queryKey: ['payroll', 'gratuity-report', employeeId],
    queryFn: async (): Promise<GratuityReportResult> => {
      const params = new URLSearchParams({ employee_li: employeeId, submitt: '1' })
      const html = await fetchLegacyText(`/payroll/gratuity_report.php?${params.toString()}`)
      return parseGratuityReport(html)
    },
    enabled: !!employeeId,
  })
}

// Real via payroll/overtime_monthly.php, special_shift_report.php and
// holiday_shift_report.php — see shiftPivotReportParser.ts's own top
// comment. Groups/Employee reuse the same real payroll/ajax.php cascading
// endpoints as Monthly Over All Attendance Report (useOverallAttendanceGroups/
// Employees above); Entity is scraped fresh per page instead of reusing that
// form's own hardcoded single-entity assumption, since this backend really
// does have more than one real entity (Lusaka, Manda hill).
export type ShiftPivotReportPath = '/payroll/overtime_monthly.php' | '/payroll/special_shift_report.php' | '/payroll/holiday_shift_report.php'
export function useShiftPivotEntities(path: ShiftPivotReportPath) {
  return useQuery({
    queryKey: ['payroll', 'shift-pivot-report', path, 'entities'],
    queryFn: async (): Promise<ShiftPivotEntityOption[]> => {
      const doc = await fetchLegacyDocument(path)
      return parseShiftReportEntities(doc)
    },
    staleTime: 1000 * 60 * 10,
  })
}
export function useShiftPivotReport(
  path: ShiftPivotReportPath,
  monthParam: 'month' | 'monthPic',
  entity: string,
  group: string,
  employee: string,
  monthIso: string
) {
  return useQuery({
    queryKey: ['payroll', 'shift-pivot-report', path, entity, group, employee, monthIso],
    queryFn: async (): Promise<ShiftPivotReportResult> => {
      const params = new URLSearchParams({ entity_li: entity, empGroup: group, ListofEmployee: employee, [monthParam]: monthIso, searchBydate: '1' })
      const html = await fetchLegacyText(`${path}?${params.toString()}`)
      return parseShiftPivotReport(html)
    },
    enabled: !!entity && !!group && !!employee && !!monthIso,
  })
}

// Real via payroll/special_shift_salary_report.php?shift=manual|holidayshift
// — see shiftSalaryReportParser.ts's own top comment.
export type ShiftSalaryType = 'manual' | 'holidayshift'
export function useShiftSalaryEntities(shift: ShiftSalaryType) {
  return useQuery({
    queryKey: ['payroll', 'shift-salary-report', shift, 'entities'],
    queryFn: async (): Promise<ShiftSalaryEntityOption[]> => {
      const doc = await fetchLegacyDocument('/payroll/special_shift_salary_report.php', new URLSearchParams({ shift }))
      return parseShiftSalaryEntities(doc)
    },
    staleTime: 1000 * 60 * 10,
  })
}
export function useShiftSalaryEmployees(shift: ShiftSalaryType) {
  return useQuery({
    queryKey: ['payroll', 'shift-salary-report', shift, 'employees'],
    queryFn: async (): Promise<ShiftSalaryEmployeeOption[]> => {
      const doc = await fetchLegacyDocument('/payroll/special_shift_salary_report.php', new URLSearchParams({ shift }))
      return parseShiftSalaryEmployees(doc)
    },
    staleTime: 1000 * 60 * 10,
  })
}
export function useShiftSalaryReport(shift: ShiftSalaryType, monthLabel: string, entity: string, employee: string) {
  return useQuery({
    queryKey: ['payroll', 'shift-salary-report', shift, monthLabel, entity, employee],
    queryFn: async (): Promise<ShiftSalaryRow[]> => {
      const params = new URLSearchParams({ shift, monthPic: monthLabel, TypesOfEntity: entity, employee_li: employee, submitt: '1' })
      const html = await fetchLegacyText(`/payroll/special_shift_salary_report.php?${params.toString()}`)
      return parseShiftSalaryReport(html)
    },
    enabled: !!monthLabel && !!entity && !!employee,
  })
}

// payroll/fapi/ytd_summary.php: one row per active employee with the net salary and the amount paid over the period
// (null where nothing was paid). Month takes monthPic=YYYY-MM (default: the current month); a fiscal year needs y_calnd
// (checked live on newecuenta: without it the call answers "y_calnd is required").
export interface YtdSummaryRow {
  employeeId: number
  employeeName: string
  netSalary: number | null
  paidAmount: number | null
}
export type YtdSummaryPeriod = { type: 'month'; month: string } | { type: 'year'; year: string } | null

export function useYtdSummary(period: YtdSummaryPeriod) {
  return useQuery({
    queryKey: ['payroll', 'ytd-summary', period],
    queryFn: async (): Promise<YtdSummaryRow[]> => {
      const params: Record<string, string> = {}
      if (period?.type === 'month') Object.assign(params, { search_type: 'month', monthPic: period.month })
      if (period?.type === 'year') Object.assign(params, { search_type: 'year', y_calnd: period.year })
      const d = await hrmGet<{ items: Array<{ employee_id: number; employee_name: string; net_salary: number | string | null; paid_amount: number | string | null }> }>('ytd_summary', params)
      const amount = (v: number | string | null) => (v === null || v === undefined ? null : Number(v))
      return d.items.map((r) => ({ employeeId: r.employee_id, employeeName: r.employee_name, netSalary: amount(r.net_salary), paidAmount: amount(r.paid_amount) }))
    },
  })
}
