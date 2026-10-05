import { useQuery } from '@tanstack/react-query'
import { fetchLegacyDocument, fetchLegacyText } from '../../shared/legacyHtmlFetch'
import { parseAbsentListEmployees, type AbsentListEmployeeOption } from './employeeAbsentListParser'
import { parseReportTable, parseSelectOptions, type ReportSelectOption, type ReportTable } from '../../shared/legacyReportTableParser'

// Real via payroll/payroll_deduction.php, napsa_report.php, nhima_report.php,
// employer_contribution.php and shift_timeline.php — see
// payrollReportTableParser.ts's own top comment.

export type SearchTypeReportPath = '/payroll/payroll_deduction.php' | '/payroll/napsa_report.php' | '/payroll/nhima_report.php'
const TABLE_SELECTOR: Record<SearchTypeReportPath, string> = {
  '/payroll/payroll_deduction.php': 'table#example',
  '/payroll/napsa_report.php': 'table#modified_export_table',
  '/payroll/nhima_report.php': 'table#modified_export_table',
}

// Employee list is the same real #employee_li (grouped by entity) on every
// one of these pages, so any of them can supply it.
export function usePayrollReportEmployees(path: string) {
  return useQuery({
    queryKey: ['payroll', 'report-employees', path],
    queryFn: async (): Promise<AbsentListEmployeeOption[]> => parseAbsentListEmployees(await fetchLegacyDocument(path)),
    staleTime: 1000 * 60 * 10,
  })
}

export function useDeductionHeads() {
  return useQuery({
    queryKey: ['payroll', 'allowance-deduction-report', 'heads'],
    queryFn: async (): Promise<ReportSelectOption[]> => parseSelectOptions(await fetchLegacyDocument('/payroll/payroll_deduction.php'), '#expense_type'),
    staleTime: 1000 * 60 * 10,
  })
}

export interface SearchTypeReportFilters {
  searchType: 'emp' | 'month' | 'year'
  employee: string
  monthLabel: string
  year: string
  expenseType?: string
}

export function useSearchTypeReport(path: SearchTypeReportPath, filters: SearchTypeReportFilters | null) {
  return useQuery({
    queryKey: ['payroll', 'search-type-report', path, filters],
    queryFn: async (): Promise<ReportTable> => {
      const f = filters!
      const params = new URLSearchParams({ search_type: f.searchType, submitt: '1' })
      if (f.expenseType) params.set('expense_type', f.expenseType)
      if (f.searchType === 'emp') params.set('employee_li', f.employee)
      if (f.searchType === 'month') params.set('monthPic', f.monthLabel)
      if (f.searchType === 'year') params.set('y_calnd', f.year)
      return parseReportTable(await fetchLegacyText(`${path}?${params.toString()}`), TABLE_SELECTOR[path])
    },
    enabled: !!filters,
  })
}

export function useEmployerContribution(filters: { year: string; employee: string } | null) {
  return useQuery({
    queryKey: ['payroll', 'employer-contribution', filters],
    queryFn: async (): Promise<ReportTable> => {
      const params = new URLSearchParams({ y_calnd: filters!.year, employee_li: filters!.employee, submitt: '1' })
      return parseReportTable(await fetchLegacyText(`/payroll/employer_contribution.php?${params.toString()}`), 'table#example')
    },
    enabled: !!filters,
  })
}

export function useShiftTimelineFilters() {
  return useQuery({
    queryKey: ['payroll', 'shift-timeline', 'filters'],
    queryFn: async () => {
      const doc = await fetchLegacyDocument('/payroll/shift_timeline.php')
      return {
        shifts: parseSelectOptions(doc, '#shift_filter', false),
        employees: parseSelectOptions(doc, '#emp_filter', false),
      }
    },
    staleTime: 1000 * 60 * 10,
  })
}

export function useShiftTimeline(filters: { shifts: string[]; employee: string; start: string; end: string }) {
  return useQuery({
    queryKey: ['payroll', 'shift-timeline', filters],
    queryFn: async (): Promise<ReportTable> => {
      const params = new URLSearchParams({ emp_filter: filters.employee || '0', start_filter: filters.start, end_filter: filters.end })
      filters.shifts.forEach((s) => params.append('shift_filter[]', s))
      return parseReportTable(await fetchLegacyText(`/payroll/shift_timeline.php?${params.toString()}`), 'table#shiftTimelineTable')
    },
    enabled: !!filters.start && !!filters.end,
  })
}
