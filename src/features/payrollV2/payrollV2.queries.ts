import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { pv2Get, pv2Post, pv2PostResult, type PostParams } from './payrollV2.api'

// Every row below is a MySQL row as the API prints it: numbers and dates arrive
// as strings, and columns a LEFT JOIN did not fill arrive as null.
export interface PayRunRow {
  id: string
  ref: string
  period_month: string
  period_year: string
  status: 'draft' | 'submitted' | 'approved' | 'posted' | 'locked' | 'rejected'
  pay_date: string | null
  submitted_at: string | null
  approved_at: string | null
  posted_at: string | null
  locked_at: string | null
  notes: string | null
  created_at: string | null
}

export interface EmployeeRow {
  employee_id: string
  firstname: string | null
  lastname: string | null
  email: string | null
  assignment_id: string | null
  template_id: string | null
  shift_id: string | null
  grade: string | null
  basic_salary: string | null
  effective_date: string | null
  assignment_active: string | null
  template_name: string | null
  shift_name: string | null
}

export interface AuditLogRow {
  id: string
  entity_type: string
  entity_id: string
  action: string
  performed_at: string | null
  firstname: string | null
  lastname: string | null
}

export const payrollV2Keys = {
  payRuns: ['payroll-v2', 'pay-runs'] as const,
  employees: ['payroll-v2', 'employees'] as const,
  auditLog: ['payroll-v2', 'audit-log'] as const,
}

export function usePayRuns() {
  return useQuery({
    queryKey: payrollV2Keys.payRuns,
    queryFn: () => pv2Get<PayRunRow[]>('payrun.php', 'list'),
  })
}

export function usePayrollEmployees() {
  return useQuery({
    queryKey: payrollV2Keys.employees,
    queryFn: () => pv2Get<EmployeeRow[]>('employee.php', 'list'),
  })
}

export function usePayrollAuditLog() {
  return useQuery({
    queryKey: payrollV2Keys.auditLog,
    queryFn: () => pv2Get<AuditLogRow[]>('reports.php', 'audit_log'),
  })
}

export const employeeName = (row: EmployeeRow) => `${row.firstname ?? ''} ${row.lastname ?? ''}`.trim() || `#${row.employee_id}`


export interface PayslipLine {
  id: string
  payrun_id: string
  employee_id: string
  firstname: string | null
  lastname: string | null
  basic_salary: string
  gross_salary: string
  napsa_employee: string
  nhima_employee: string
  paye_tax: string
  net_salary: string
  amount_paid: string | null
  payment_status: 'pending' | 'partial' | 'paid' | null
}

export interface PaymentStatus {
  total: string
  paid: string
  partial: string
  pending: string
  total_amount: string
  paid_amount: string
}

export function usePayRunLines(payrunId: string | undefined) {
  return useQuery({
    queryKey: ['payroll-v2', 'pay-run-lines', payrunId],
    queryFn: () => pv2Get<PayslipLine[]>('payrun.php', 'get_lines', { payrun_id: payrunId }),
    enabled: Boolean(payrunId),
  })
}

export function usePayRunPaymentStatus(payrunId: string | undefined) {
  return useQuery({
    queryKey: ['payroll-v2', 'pay-run-payment', payrunId],
    queryFn: () => pv2Get<PaymentStatus>('payrun.php', 'get_payment_status', { payrun_id: payrunId }),
    enabled: Boolean(payrunId),
  })
}

// Everything that moves a pay run along its lifecycle posts to the same endpoint,
// so one mutation covers create, calculate, submit, approve, reject, post and lock.
export function usePayRunAction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ action, params, endpoint = 'payrun.php' }: { action: string; params?: PostParams; endpoint?: string }) =>
      pv2Post<{ id?: string } | null>(endpoint, action, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-v2'] })
    },
  })
}

export interface AttendanceRow {
  id: string
  employee_id: string
  firstname: string | null
  lastname: string | null
  work_date: string | null
  clock_in: string | null
  clock_out: string | null
  status: string | null
  ot_hours: string | null
  night_hours: string | null
  source: string | null
}

export interface LeaveRequestRow {
  id: string
  employee_id: string
  firstname: string | null
  lastname: string | null
  leave_type_id: string
  leave_type_name: string | null
  date_start: string
  date_end: string
  days_requested: string
  reason: string | null
  status: string
}

export interface LeaveTypeRow {
  id: string
  code: string
  label: string
  affect: string
}

export interface AdvanceRow {
  id: string
  employee_id: string
  firstname: string | null
  lastname: string | null
  type: string | null
  amount: string
  requested_at: string | null
  created_at: string | null
  status: string
}

// attendance.php list reads start_date/end_date (both, or it falls back to the current month).
export function useAttendance(params: { start_date?: string; end_date?: string; status?: string; source?: string; employee_id?: string } = {}) {
  return useQuery({
    queryKey: ['payroll-v2', 'attendance', params],
    queryFn: () => pv2Get<AttendanceRow[]>('attendance.php', 'list', params),
  })
}

export function useLeaveRequests() {
  return useQuery({
    queryKey: ['payroll-v2', 'leave', 'list'],
    queryFn: () => pv2Get<LeaveRequestRow[]>('leave.php', 'list'),
  })
}

export function useLeavePendingApprovals() {
  return useQuery({
    queryKey: ['payroll-v2', 'leave', 'pending'],
    queryFn: () => pv2Get<LeaveRequestRow[]>('leave.php', 'pending_approvals'),
  })
}

export function useLeaveTypes() {
  return useQuery({
    queryKey: ['payroll-v2', 'leave', 'types'],
    queryFn: () => pv2Get<LeaveTypeRow[]>('leave.php', 'leave_types'),
    staleTime: 1000 * 60 * 10,
  })
}

export function useAdvances() {
  return useQuery({
    queryKey: ['payroll-v2', 'advances'],
    queryFn: () => pv2Get<AdvanceRow[]>('advance.php', 'list'),
  })
}

export function useAdvancePendingApprovals() {
  return useQuery({
    queryKey: ['payroll-v2', 'advances', 'pending'],
    queryFn: () => pv2Get<AdvanceRow[]>('advance.php', 'pending_approvals'),
  })
}
// ---- Employee Self-Service (ess.php) — the signed-in user's own records.

export interface MyPayslipRow {
  id: string
  net_salary: string
  gross_salary: string
  verify_ref: string | null
  payrun_id: string
  period_month: string
  period_year: string
  status: string
}

export interface LeaveBalanceRow {
  leave_type_id: string
  leave_type_name: string | null
  days_entitled: number
  days_applied: number
  days_approved: number
  days_pending: number
  days_carried: number
  days_balance: number
}

// payslip.php list: posted/locked runs only, newest 24 — what ess.php shows.
export function useMyPayslips() {
  return useQuery({
    queryKey: ['payroll-v2', 'ess', 'payslips'],
    queryFn: () => pv2Get<MyPayslipRow[]>('payslip.php', 'list'),
  })
}

export function useMyLeaveBalance(fiscalYear: number) {
  return useQuery({
    queryKey: ['payroll-v2', 'ess', 'leave-balance', fiscalYear],
    queryFn: () => pv2Get<LeaveBalanceRow[]>('leave.php', 'balance', { fiscal_year: fiscalYear }),
  })
}

export function useMyAttendanceToday() {
  return useQuery({
    queryKey: ['payroll-v2', 'ess', 'attendance-today'],
    queryFn: () => pv2Get<AttendanceRow | null>('attendance.php', 'today'),
  })
}

// ---- Salary templates (template.php)

export interface TemplateRow {
  id: string
  template_name: string
  template_type: string
  grade_min: string | null
  grade_max: string | null
  gratuity_rate: string | null
}

export interface TemplateComponentRow {
  id: string
  component_code: string
  component_name: string
  component_type: 'earning' | 'deduction' | string
  calc_method: 'fixed' | 'percent_basic' | string
  amount: string | null
  rate_pct: string | null
  is_napsa_eligible: string
  is_nhima_eligible: string
  is_paye_taxable: string
  is_employer_cost: string
  gl_account_code: string | null
}

export function usePayrollTemplates() {
  return useQuery({
    queryKey: ['payroll-v2', 'templates'],
    queryFn: () => pv2Get<TemplateRow[]>('template.php', 'list'),
  })
}

export function usePayrollTemplate(id: string | null) {
  return useQuery({
    queryKey: ['payroll-v2', 'templates', id],
    queryFn: () => pv2Get<{ template: TemplateRow; components: TemplateComponentRow[] }>('template.php', 'get', { id }),
    enabled: Boolean(id),
  })
}

export function useTemplateGlAccounts(enabled: boolean) {
  return useQuery({
    queryKey: ['payroll-v2', 'templates', 'gl-accounts'],
    queryFn: () => pv2Get<Array<{ account_number: string; label: string }>>('template.php', 'accounting_accounts'),
    enabled,
    staleTime: 1000 * 60 * 10,
  })
}

// ---- Settings (settings.php): calculation constants + holiday calendar

export function usePayrollSettings() {
  return useQuery({
    queryKey: ['payroll-v2', 'settings'],
    queryFn: () => pv2Get<Record<string, string | number>>('settings.php', 'get'),
  })
}

export interface HolidayRow {
  id: string
  holiday_date: string
  name: string
  is_recurring: string
  is_paid: string
}

export function usePayrollHolidays(year: number) {
  return useQuery({
    queryKey: ['payroll-v2', 'settings', 'holidays', year],
    queryFn: () => pv2Get<HolidayRow[]>('settings.php', 'holidays_list', { year }),
  })
}

// ---- Shifts & rotations (shift.php)

export interface ShiftRow {
  id: string
  shift_name: string
  start_time: string
  end_time: string
  is_night_shift: string
}

export interface RotationRow {
  id: string
  rotation_name: string
  pattern_weeks: string
}

export interface ShiftEmployee {
  employee_id: string
  firstname: string | null
  lastname: string | null
  department: string | null
}

export interface TimetableDay {
  date: string
  shift_name: string | null
  start_time: string | null
  end_time: string | null
  is_night_shift: number | string | null
  is_off: number | string | boolean | null
  is_holiday: number | string | boolean | null
}

// Single date for everyone → one row per employee; a month or one employee →
// a per-employee list of days (the classic page draws a calendar from it).
export type TimetableResult =
  | Array<Omit<ShiftEmployee, 'employee_id'> & TimetableDay & { employee_id: number | string; shift_id: number | string | null }>
  | { mode: 'month' | 'employee'; start_date: string; end_date: string; employees: Array<Omit<ShiftEmployee, 'employee_id'> & { employee_id: number | string; days: TimetableDay[] }> }

export interface ShiftOverrideRow {
  id: string
  shift_name: string | null
  start_date: string
  end_date: string
  reason: string | null
}

export interface ShiftAuditRow {
  id: string
  action: string
  old_value: string | null
  new_value: string | null
  performed_at: string | null
  firstname: string | null
  lastname: string | null
}

export function useShifts() {
  return useQuery({ queryKey: ['payroll-v2', 'shifts'], queryFn: () => pv2Get<ShiftRow[]>('shift.php', 'list') })
}

export function useRotations() {
  return useQuery({ queryKey: ['payroll-v2', 'shifts', 'rotations'], queryFn: () => pv2Get<RotationRow[]>('shift.php', 'rotation_list') })
}

export function useShiftDepartmentEmployees() {
  return useQuery({
    queryKey: ['payroll-v2', 'shifts', 'department-employees'],
    queryFn: () => pv2Get<ShiftEmployee[]>('shift.php', 'get_department_employees'),
    staleTime: 1000 * 60 * 5,
  })
}

export function useShiftUserGroups(enabled: boolean) {
  return useQuery({
    queryKey: ['payroll-v2', 'shifts', 'user-groups'],
    queryFn: () => pv2Get<Array<{ rowid: string; name: string }>>('shift.php', 'get_user_groups'),
    enabled,
    staleTime: 1000 * 60 * 10,
  })
}

// get_group_employees joins usergroup_user, so someone in two groups comes back twice.
export function useShiftGroupEmployees(groupId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['payroll-v2', 'shifts', 'group-employees', groupId],
    queryFn: async () => {
      const rows = await pv2Get<ShiftEmployee[]>('shift.php', 'get_group_employees', { group_id: groupId || undefined })
      return rows.filter((row, i) => rows.findIndex((r) => r.employee_id === row.employee_id) === i)
    },
    enabled,
  })
}

export function useShiftTimetable(params: Record<string, string> | null) {
  return useQuery({
    queryKey: ['payroll-v2', 'shifts', 'timetable', params],
    queryFn: () => pv2Get<TimetableResult>('shift.php', 'timetable', params ?? {}),
    enabled: params !== null,
  })
}

export function useShiftOverrides(employeeId: string | null) {
  return useQuery({
    queryKey: ['payroll-v2', 'shifts', 'overrides', employeeId],
    queryFn: () => pv2Get<ShiftOverrideRow[]>('shift.php', 'list_overrides', { employee_id: employeeId }),
    enabled: Boolean(employeeId),
  })
}

export function useShiftAuditLog(employeeId: string | null) {
  return useQuery({
    queryKey: ['payroll-v2', 'shifts', 'audit', employeeId],
    queryFn: () => pv2Get<ShiftAuditRow[]>('shift.php', 'shift_audit_log', { employee_id: employeeId }),
    enabled: Boolean(employeeId),
  })
}

// Like usePayRunAction, resolving to the API's message instead of its data.
export function usePayrollCommand() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ action, params, endpoint = 'payrun.php' }: { action: string; params?: PostParams; endpoint?: string }) =>
      (await pv2PostResult<unknown>(endpoint, action, params)).message,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payroll-v2'] }),
  })
}

// ---- Pay run extras

export interface PostingLogRow {
  id: string
  posted_at: string | null
  status: string
  fk_expensereport: string | null
  total_amount: string | null
  note: string | null
  firstname: string | null
  lastname: string | null
}

export function usePostingLog(payrunId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['payroll-v2', 'posting-log', payrunId],
    queryFn: () => pv2Get<PostingLogRow[]>('payrun.php', 'get_posting_log', { payrun_id: payrunId }),
    enabled: enabled && Boolean(payrunId),
  })
}

export interface LinePaymentRow {
  id: string
  amount: string
  payment_method: string | null
  reference: string | null
  payment_date: string | null
}

export function useLinePayments(lineId: string | null) {
  return useQuery({
    queryKey: ['payroll-v2', 'line-payments', lineId],
    queryFn: () => pv2Get<LinePaymentRow[]>('payrun.php', 'get_line_payments', { line_id: lineId }),
    enabled: Boolean(lineId),
  })
}

// ---- Employee assignment (employee.php get / grade_history, leave.php employee leave types)

export interface EmployeeDetail extends EmployeeRow {
  morning_shift_id: string | null
  night_shift_id: string | null
  morning_weeks: string | null
  night_weeks: string | null
  work_days_mask: string | null
  off_days_mask: string | null
  off_days_paid_holiday: string | null
  rotation_anchor_date: string | null
  contract_start: string | null
  contract_end: string | null
  morning_shift_name: string | null
  night_shift_name: string | null
}

export interface EmployeeLeaveTypeRow {
  id: string
  leave_type_id: string
  leave_type_name: string | null
  days_entitled: string | null
}

export interface GradeHistoryRow {
  id: string
  old_grade: string | null
  new_grade: string | null
  old_basic: string | null
  new_basic: string | null
  effective_date?: string | null
  effective_dt?: string | null
  reason: string | null
  firstname: string | null
  lastname: string | null
}

export function useEmployeeDetail(employeeId: string | null) {
  return useQuery({
    queryKey: ['payroll-v2', 'employee', employeeId],
    queryFn: () => pv2Get<EmployeeDetail>('employee.php', 'get', { employee_id: employeeId }),
    enabled: Boolean(employeeId),
  })
}

export function useEmployeeLeaveTypes(employeeId: string | null) {
  return useQuery({
    queryKey: ['payroll-v2', 'employee', employeeId, 'leave-types'],
    queryFn: () => pv2Get<EmployeeLeaveTypeRow[]>('leave.php', 'list_employee_leave_types', { employee_id: employeeId }),
    enabled: Boolean(employeeId),
  })
}

export function useGradeHistory(employeeId: string | null) {
  return useQuery({
    queryKey: ['payroll-v2', 'employee', employeeId, 'grade-history'],
    queryFn: () => pv2Get<GradeHistoryRow[]>('employee.php', 'grade_history', { employee_id: employeeId }),
    enabled: Boolean(employeeId),
  })
}

// ---- Attendance management (manager tools on the classic attendance page)

export interface AttendanceSheetRow {
  employee_id: string
  firstname: string | null
  lastname: string | null
  department: string | null
  shift_name: string | null
  start_time: string | null
  end_time: string | null
  attendance_id: string | null
  clock_in: string | null
  clock_out: string | null
  attendance_status: string | null
  ot_hours: string | null
  night_hours: string | null
  source: string | null
}

// Every payroll employee with their assigned shift and any attendance already
// recorded on the date — what the bulk marking sheet starts from. (attendance.php
// has an employees_with_shifts action for this, but it returns nothing on the
// dev backends, and the classic page doesn't use it either.)
export function useAttendanceSheet(date: string | null) {
  return useQuery({
    queryKey: ['payroll-v2', 'attendance', 'sheet', date],
    queryFn: async (): Promise<AttendanceSheetRow[]> => {
      const [employees, records, shifts] = await Promise.all([
        pv2Get<EmployeeRow[]>('employee.php', 'list'),
        pv2Get<AttendanceRow[]>('attendance.php', 'list', { start_date: date, end_date: date }),
        pv2Get<ShiftRow[]>('shift.php', 'list'),
      ])
      return employees.map((e) => {
        const rec = records.find((r) => r.employee_id === e.employee_id)
        const shift = shifts.find((s) => s.id === e.shift_id)
        return {
          employee_id: e.employee_id,
          firstname: e.firstname,
          lastname: e.lastname,
          department: null,
          shift_name: e.shift_name,
          start_time: shift?.start_time ?? null,
          end_time: shift?.end_time ?? null,
          attendance_id: rec?.id ?? null,
          clock_in: rec?.clock_in ?? null,
          clock_out: rec?.clock_out ?? null,
          attendance_status: rec?.status ?? null,
          ot_hours: rec?.ot_hours ?? null,
          night_hours: rec?.night_hours ?? null,
          source: rec?.source ?? null,
        }
      })
    },
    enabled: Boolean(date),
  })
}

export function useAttendanceEmployees() {
  return useQuery({
    queryKey: ['payroll-v2', 'attendance', 'employees'],
    queryFn: async () => (await pv2Get<{ results: Array<{ id: string; text: string }> }>('attendance.php', 'employees')).results,
    staleTime: 1000 * 60 * 5,
  })
}

// leave.php employee_leave_details: an employee's balance per assigned type,
// plus their taken and pending requests — shown beside the manual leave form.
export function useEmployeeLeaveDetails(employeeId: string) {
  return useQuery({
    queryKey: ['payroll-v2', 'leave', 'employee-details', employeeId],
    queryFn: () =>
      pv2Get<{ balance: Array<{ leave_type_id: string; leave_type_name: string | null; days_entitled: number; days_taken: number; days_balance: number }>; taken: LeaveRequestRow[]; pending: LeaveRequestRow[] }>(
        'leave.php',
        'employee_leave_details',
        { employee_id: employeeId },
      ),
    enabled: Boolean(employeeId),
  })
}

// zktecho.php show_device_logs: the device's last 50 pushed log batches (ADMS).
export interface DeviceLogRow {
  rowid: string
  table_name: string | null
  data: string | null
  created_at: string | null
}

export function useDeviceLogs(deviceSerial: string | null) {
  return useQuery({
    queryKey: ['payroll-v2', 'device-logs', deviceSerial],
    queryFn: () => pv2Get<DeviceLogRow[]>('zktecho.php', 'show_device_logs', { device_name: deviceSerial }),
    enabled: Boolean(deviceSerial),
  })
}
