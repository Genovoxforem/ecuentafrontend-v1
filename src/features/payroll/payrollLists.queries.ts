import { useQuery } from '@tanstack/react-query'
import { fetchLegacyDocument, fetchLegacyText } from '../../shared/legacyHtmlFetch'
import { parsePayrollTable, type PayrollLegacyTable } from './payrollLegacyTable'
import { parseSalaryFeeTypes, type SalaryFeeType } from './salaryTemplateParser'
import { parseYtdEarningsDeductions, type YtdEarningsDeductionsReport } from './ytdEarningsDeductionsParser'
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

// Real via payroll/salary_temp.php's own Allowances/Deductions fee-type
// dropdowns — see salaryTemplateParser.ts's own top comment. Genuine
// llx_c_type_fees rows (not fabricated placeholders), even though the
// Save flow above them stays session-local (see SalaryTemplateForm.tsx's
// own comment on why the write itself can't be wired safely).
export function useSalaryFeeTypes() {
  return useQuery({
    queryKey: ['payroll', 'salary-template', 'fee-types'],
    queryFn: async (): Promise<SalaryFeeType[]> => {
      const doc = await fetchLegacyDocument('/payroll/salary_temp.php')
      return parseSalaryFeeTypes(doc)
    },
    staleTime: 1000 * 60 * 10,
  })
}

// Real via payroll/earn_dedu.php — confirmed live to be a plain GET-able
// classic report (its own <form> is POST-only and CSRF-blocked when called
// from this app's origin, but the same search_type/monthPic/y_calnd params
// work fine as a GET) — see ytdEarningsDeductionsParser.ts's own top
// comment for the full real behavior of each search type. searchType/value
// blank means "default" (today's month), matching the real page's own
// no-params load.
export type YtdEarningsDeductionsSearchType = '' | 'month' | 'year'
export function useYtdEarningsDeductions(searchType: YtdEarningsDeductionsSearchType, value: string) {
  return useQuery({
    queryKey: ['payroll', 'ytd-earnings-deductions', searchType, value],
    queryFn: async (): Promise<YtdEarningsDeductionsReport> => {
      const params = new URLSearchParams()
      if (searchType === 'month') params.set('monthPic', value)
      if (searchType === 'year') params.set('y_calnd', value)
      if (searchType) params.set('search_type', searchType)
      const qs = params.toString()
      const html = await fetchLegacyText(`/payroll/earn_dedu.php${qs ? `?${qs}` : ''}`)
      return parseYtdEarningsDeductions(html)
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

// Real via payroll/atten_emp_rip.php — confirmed live to be a plain
// GET-able classic report page (its own <form> is POST-only and
// CSRF-blocked cross-origin, same as earn_dedu.php's own form, but the
// same params work fine as a GET) — see employeeMonthlyReportParser.ts's
// own top comment. Employee options are this same page's own #employee_li
// select, so no separate request is needed to populate that dropdown.
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
