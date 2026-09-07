import { useLocalCollection, nextLocalRef, todayIso } from '../../shared/localCollection'

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
