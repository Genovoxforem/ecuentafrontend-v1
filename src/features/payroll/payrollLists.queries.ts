import { useQuery } from '@tanstack/react-query'
import { useLocalCollection, nextLocalRef, todayIso } from '../../shared/localCollection'
import { fetchLegacyDocument, fetchLegacyText } from '../../shared/legacyHtmlFetch'
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

// Session-local lists for the 8 Payroll HR entities that have a real write
// endpoint (payroll/ajax.php — see payrollActions.queries.ts) but no
// matching JSON read endpoint. Same pattern as users/leave.queries.ts:
// records created via the real forms are also pushed in here so the list
// page reflects them immediately — this never claims to be, or read from,
// real backend state (see PayrollRecordList's localOnlyNote banner).

export interface HolidayRecord {
  ref: string
  leaveName: string
  startDate: string
  endDate: string
  entity: string
  note: string
  createdBy: string
}
const HOLIDAY_KEY = ['local', 'payroll', 'holidays'] as const
export function useHolidayRecords() {
  const [rows] = useLocalCollection<HolidayRecord[]>(HOLIDAY_KEY, [])
  return rows
}
export function useRecordHoliday() {
  const [, update] = useLocalCollection<HolidayRecord[]>(HOLIDAY_KEY, [])
  return {
    add: (input: Omit<HolidayRecord, 'ref'>) => update((cur) => [{ ...input, ref: nextLocalRef('HOL') }, ...cur]),
    remove: (ref: string) => update((cur) => cur.filter((r) => r.ref !== ref)),
  }
}

export interface AwardRecord {
  ref: string
  createdBy: string
  employeeName: string
  award: string
  giftItem: string
  cashPrice: string
  month: string
  awardDate: string
  comments: string
}
const AWARD_KEY = ['local', 'payroll', 'awards'] as const
export function useAwardRecords() {
  const [rows] = useLocalCollection<AwardRecord[]>(AWARD_KEY, [])
  return rows
}
export function useRecordAward() {
  const [, update] = useLocalCollection<AwardRecord[]>(AWARD_KEY, [])
  return {
    add: (input: Omit<AwardRecord, 'ref'>) => update((cur) => [{ ...input, ref: nextLocalRef('AWD') }, ...cur]),
    remove: (ref: string) => update((cur) => cur.filter((r) => r.ref !== ref)),
  }
}

export interface TransferRecord {
  ref: string
  employeeName: string
  transferDate: string
  description: string
  createdBy: string
}
const TRANSFER_KEY = ['local', 'payroll', 'transfers'] as const
export function useTransferRecords() {
  const [rows] = useLocalCollection<TransferRecord[]>(TRANSFER_KEY, [])
  return rows
}
export function useRecordTransfer() {
  const [, update] = useLocalCollection<TransferRecord[]>(TRANSFER_KEY, [])
  return {
    add: (input: Omit<TransferRecord, 'ref'>) => update((cur) => [{ ...input, ref: nextLocalRef('TRF') }, ...cur]),
    remove: (ref: string) => update((cur) => cur.filter((r) => r.ref !== ref)),
  }
}

export interface ResignationRecord {
  ref: string
  employeeName: string
  resignationDate: string
  lastWorkingDay: string
  reason: string
  createdBy: string
}
const RESIGNATION_KEY = ['local', 'payroll', 'resignations'] as const
export function useResignationRecords() {
  const [rows] = useLocalCollection<ResignationRecord[]>(RESIGNATION_KEY, [])
  return rows
}
export function useRecordResignation() {
  const [, update] = useLocalCollection<ResignationRecord[]>(RESIGNATION_KEY, [])
  return {
    add: (input: Omit<ResignationRecord, 'ref'>) => update((cur) => [{ ...input, ref: nextLocalRef('RES') }, ...cur]),
    remove: (ref: string) => update((cur) => cur.filter((r) => r.ref !== ref)),
  }
}

export interface TravelRecord {
  ref: string
  employeeName: string
  startDate: string
  endDate: string
  purpose: string
  country: string
  description: string
  createdBy: string
}
const TRAVEL_KEY = ['local', 'payroll', 'travel'] as const
export function useTravelRecords() {
  const [rows] = useLocalCollection<TravelRecord[]>(TRAVEL_KEY, [])
  return rows
}
export function useRecordTravel() {
  const [, update] = useLocalCollection<TravelRecord[]>(TRAVEL_KEY, [])
  return {
    add: (input: Omit<TravelRecord, 'ref'>) => update((cur) => [{ ...input, ref: nextLocalRef('TRV') }, ...cur]),
    remove: (ref: string) => update((cur) => cur.filter((r) => r.ref !== ref)),
  }
}

export interface ComplaintRecord {
  ref: string
  createdBy: string
  complaintFromName: string
  complaintAgainstName: string
  title: string
  complaintDate: string
  description: string
}
const COMPLAINT_KEY = ['local', 'payroll', 'complaints'] as const
export function useComplaintRecords() {
  const [rows] = useLocalCollection<ComplaintRecord[]>(COMPLAINT_KEY, [])
  return rows
}
export function useRecordComplaint() {
  const [, update] = useLocalCollection<ComplaintRecord[]>(COMPLAINT_KEY, [])
  return {
    add: (input: Omit<ComplaintRecord, 'ref'>) => update((cur) => [{ ...input, ref: nextLocalRef('CMP') }, ...cur]),
    remove: (ref: string) => update((cur) => cur.filter((r) => r.ref !== ref)),
  }
}

export interface WarningRecord {
  ref: string
  createdBy: string
  warningByName: string
  warningToName: string
  subject: string
  warningDate: string
  description: string
}
const WARNING_KEY = ['local', 'payroll', 'warnings'] as const
export function useWarningRecords() {
  const [rows] = useLocalCollection<WarningRecord[]>(WARNING_KEY, [])
  return rows
}
export function useRecordWarning() {
  const [, update] = useLocalCollection<WarningRecord[]>(WARNING_KEY, [])
  return {
    add: (input: Omit<WarningRecord, 'ref'>) => update((cur) => [{ ...input, ref: nextLocalRef('WRN') }, ...cur]),
    remove: (ref: string) => update((cur) => cur.filter((r) => r.ref !== ref)),
  }
}

export interface TerminationRecord {
  ref: string
  createdBy: string
  employeeName: string
  terminationType: string
  noticeDate: string
  terminationDate: string
  description: string
}
const TERMINATION_KEY = ['local', 'payroll', 'terminations'] as const
export function useTerminationRecords() {
  const [rows] = useLocalCollection<TerminationRecord[]>(TERMINATION_KEY, [])
  return rows
}
export function useRecordTermination() {
  const [, update] = useLocalCollection<TerminationRecord[]>(TERMINATION_KEY, [])
  return {
    add: (input: Omit<TerminationRecord, 'ref'>) => update((cur) => [{ ...input, ref: nextLocalRef('TRM') }, ...cur]),
    remove: (ref: string) => update((cur) => cur.filter((r) => r.ref !== ref)),
  }
}

export interface ShiftRecord {
  ref: string
  name: string
  shiftType: string
  createdBy: string
}
const SHIFT_KEY = ['local', 'payroll', 'shifts'] as const
export function useShiftRecords() {
  const [rows] = useLocalCollection<ShiftRecord[]>(SHIFT_KEY, [])
  return rows
}
export function useRecordShift() {
  const [, update] = useLocalCollection<ShiftRecord[]>(SHIFT_KEY, [])
  return {
    add: (input: Omit<ShiftRecord, 'ref'>) => update((cur) => [{ ...input, ref: nextLocalRef('SFT') }, ...cur]),
    remove: (ref: string) => update((cur) => cur.filter((r) => r.ref !== ref)),
  }
}

export interface AdvanceSalaryRecord {
  ref: string
  createdBy: string
  employeeName: string
  amount: string
  deductMonth: string // YYYY-MM
  requestDate: string // YYYY-MM-DD
  status: 'Waiting' | 'Accepted' | 'Rejected' | 'Amount Deducted'
}
const ADVANCE_SALARY_KEY = ['local', 'payroll', 'advance-salary'] as const
export function useAdvanceSalaryRecords() {
  const [rows] = useLocalCollection<AdvanceSalaryRecord[]>(ADVANCE_SALARY_KEY, [])
  return rows
}
export function useRecordAdvanceSalary() {
  const [, update] = useLocalCollection<AdvanceSalaryRecord[]>(ADVANCE_SALARY_KEY, [])
  return {
    add: (input: Omit<AdvanceSalaryRecord, 'ref' | 'status'>) => update((cur) => [{ ...input, ref: nextLocalRef('ADV'), status: 'Waiting' }, ...cur]),
    remove: (ref: string) => update((cur) => cur.filter((r) => r.ref !== ref)),
  }
}

export interface LoanRecord {
  ref: string
  createdBy: string
  employeeName: string
  loanAmount: string
  periodMonths: string
  installment: string
  deductFrom: string // YYYY-MM-DD
  requestDate: string // YYYY-MM-DD
  status: 'Waiting' | 'Loan Accepted' | 'Rejected'
}
const LOAN_KEY = ['local', 'payroll', 'loans'] as const
export function useLoanRecords() {
  const [rows] = useLocalCollection<LoanRecord[]>(LOAN_KEY, [])
  return rows
}
export function useRecordLoan() {
  const [, update] = useLocalCollection<LoanRecord[]>(LOAN_KEY, [])
  return {
    add: (input: Omit<LoanRecord, 'ref' | 'status'>) => update((cur) => [{ ...input, ref: nextLocalRef('LOAN'), status: 'Waiting' }, ...cur]),
    remove: (ref: string) => update((cur) => cur.filter((r) => r.ref !== ref)),
  }
}

export interface SalaryTemplateRecord {
  ref: string
  createdBy: string
  salaryGrade: string
  currency: string
  grossSalary: number
  basicSalary: number
  overtimeValue: number
  payeTaxEnabled: boolean
  netSalary: number
}
const SALARY_TEMPLATE_KEY = ['local', 'payroll', 'salary-templates'] as const
export function useSalaryTemplateRecords() {
  const [rows] = useLocalCollection<SalaryTemplateRecord[]>(SALARY_TEMPLATE_KEY, [])
  return rows
}
export function useRecordSalaryTemplate() {
  const [, update] = useLocalCollection<SalaryTemplateRecord[]>(SALARY_TEMPLATE_KEY, [])
  return {
    add: (input: Omit<SalaryTemplateRecord, 'ref'>) => update((cur) => [{ ...input, ref: nextLocalRef('SAL') }, ...cur]),
    remove: (ref: string) => update((cur) => cur.filter((r) => r.ref !== ref)),
  }
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

export interface HourlyTemplateRecord {
  ref: string
  createdBy: string
  hourlyGrade: string
  hourlyRate: string
}
const HOURLY_TEMPLATE_KEY = ['local', 'payroll', 'hourly-templates'] as const
export function useHourlyTemplateRecords() {
  const [rows] = useLocalCollection<HourlyTemplateRecord[]>(HOURLY_TEMPLATE_KEY, [])
  return rows
}
export function useRecordHourlyTemplate() {
  const [, update] = useLocalCollection<HourlyTemplateRecord[]>(HOURLY_TEMPLATE_KEY, [])
  return {
    add: (input: Omit<HourlyTemplateRecord, 'ref'>) => update((cur) => [{ ...input, ref: nextLocalRef('HRT') }, ...cur]),
    remove: (ref: string) => update((cur) => cur.filter((r) => r.ref !== ref)),
  }
}

export interface SalaryAssignmentRecord {
  ref: string
  employeeId: number
  employeeName: string
  employeeRole: string
  salaryType: string
  basicSalary: number
  overtimePerHour: number
}
const SALARY_ASSIGNMENT_KEY = ['local', 'payroll', 'salary-assignments'] as const
export function useSalaryAssignmentRecords() {
  const [rows] = useLocalCollection<SalaryAssignmentRecord[]>(SALARY_ASSIGNMENT_KEY, [])
  return rows
}
export function useRecordSalaryAssignment() {
  const [, update] = useLocalCollection<SalaryAssignmentRecord[]>(SALARY_ASSIGNMENT_KEY, [])
  return {
    add: (input: Omit<SalaryAssignmentRecord, 'ref'>) => update((cur) => [{ ...input, ref: nextLocalRef('ASG') }, ...cur]),
    remove: (ref: string) => update((cur) => cur.filter((r) => r.ref !== ref)),
  }
}

export { todayIso }
