import type { ComponentType } from 'react'
import {
  CalendarClock,
  CalendarDays,
  Award,
  ArrowRightLeft,
  LogOut,
  Plane,
  MessageSquareWarning,
  AlertTriangle,
  UserX,
  Gauge,
  Star,
  Clock,
  Banknote,
  HandCoins,
  CalendarRange,
  FileSpreadsheet,
  Clock3,
  Wallet,
  List,
  CreditCard,
  Gift,
  FileText,
  BarChart,
  Plus,
  Settings2,
  BookUser,
  Briefcase,
} from 'lucide-react'
import { ROUTES } from '../../routes'

// Every one of these 51 pages was confirmed this session (full Payroll
// module audit) to have a real, live legacy PHP page — just no JSON API,
// only classic form-POST/HTML (see the audit's per-item classification).
// The only 2 real JSON endpoints in the whole module (Date Wise Attendance,
// Mark Attendance) got their own real components instead of this
// placeholder. "Payroll Dashboard" already had its own pre-existing page.
export interface PayrollPlaceholder {
  path: string
  icon: ComponentType<{ size?: number; className?: string }>
  title: string
  description: string
}

export const PAYROLL_PLACEHOLDERS: PayrollPlaceholder[] = [
  // Human Resource
  { path: ROUTES.payrollLeaveRequest, icon: CalendarClock, title: 'Leave Request', description: 'Real page: holiday/card.php (Dolibarr core Leave/CP module, reused) — classic form-POST, no JSON API.' },
  { path: ROUTES.payrollAllLeaveRequest, icon: CalendarClock, title: 'All Leave Request', description: 'Real page: holiday/list.php — classic list page, no JSON API.' },
  { path: ROUTES.payrollCalendarHolidays, icon: CalendarDays, title: 'Calendar Holidays', description: 'Real page: payroll/holiday.php — classic form-POST, no JSON API.' },
  { path: ROUTES.payrollEmployeeAward, icon: Award, title: 'Employee Award', description: 'Real page: payroll/award.php — classic form-POST, no JSON API.' },
  { path: ROUTES.payrollEmployeeTransfers, icon: ArrowRightLeft, title: 'Employee Transfers', description: 'Real page: payroll/transfers.php — classic form-POST, no JSON API.' },
  { path: ROUTES.payrollEmployeeResignation, icon: LogOut, title: 'Employee Resignation', description: 'Real page: payroll/resignations.php — classic form-POST, no JSON API.' },
  { path: ROUTES.payrollEmployeeTravel, icon: Plane, title: 'Employee Travel', description: 'Real page: payroll/travel.php — classic form-POST, no JSON API.' },
  { path: ROUTES.payrollEmployeeComplaints, icon: MessageSquareWarning, title: 'Employee Complaints', description: 'Real page: payroll/complaints.php — classic form-POST, no JSON API.' },
  { path: ROUTES.payrollEmployeeWarnings, icon: AlertTriangle, title: 'Employee Warnings', description: 'Real page: payroll/warnings.php — classic form-POST, no JSON API.' },
  { path: ROUTES.payrollEmployeeTerminations, icon: UserX, title: 'Employee Terminations', description: 'Real page: payroll/terminations.php — classic form-POST, no JSON API.' },
  { path: ROUTES.payrollEmployeeIndicator, icon: Gauge, title: 'Employee Indicator', description: 'Real page: payroll/indicator.php — classic form-POST, no JSON API.' },
  { path: ROUTES.payrollEmployeeAppraisal, icon: Star, title: 'Employee Appraisal', description: 'Real page: payroll/appraisal.php — classic form-POST, no JSON API.' },
  // Attendance (remaining 2 — Mark/Date-Wise are the module's only real APIs)
  { path: ROUTES.payrollMarkSpecialShiftAttendance, icon: Clock, title: 'Mark Special Shift Attendance', description: 'Real page: payroll/shiftsmanual_attendance.php?shift=manual — its ajax helper returns raw HTML fragments, not JSON.' },
  { path: ROUTES.payrollMarkHolidayAttendance, icon: Clock, title: 'Mark Holiday Attendance', description: 'Real page: payroll/shiftsmanual_attendance.php?shift=holidayshift — same non-JSON ajax helper.' },
  // Shift & Salary
  { path: ROUTES.payrollAdvanceSalary, icon: Banknote, title: 'Employee Advance Salary', description: 'Real page: payroll/advance.php — classic form-POST, no JSON API.' },
  { path: ROUTES.payrollEmployeeLoan, icon: HandCoins, title: 'Employee Loan', description: 'Real page: payroll/loan.php — classic form-POST, no JSON API.' },
  { path: ROUTES.payrollAssignShifts, icon: CalendarRange, title: 'Assign Shifts', description: 'Real page: payroll/shifts.php — uses ajax_search.php, which returns HTML fragments, not JSON.' },
  { path: ROUTES.payrollSalaryTemplate, icon: FileSpreadsheet, title: 'Salary Template', description: 'Real page: payroll/salary_temp.php (the largest file in the module) — classic form-POST, no JSON API.' },
  { path: ROUTES.payrollHourlyTemplate, icon: Clock3, title: 'Hourly Template', description: 'Real page: payroll/hour_temp.php — classic form-POST, no JSON API.' },
  { path: ROUTES.payrollManageSalary, icon: Wallet, title: 'Manage Salary', description: 'Real page: payroll/manage_salary.php — classic form-POST, no JSON API.' },
  { path: ROUTES.payrollManageSalaryList, icon: List, title: 'Manage Salary List', description: 'Real page: payroll/manage_salary_list.php — classic list page, no JSON API.' },
  { path: ROUTES.payrollManageHolidaySalary, icon: Wallet, title: 'Manage Holiday Salary', description: 'Real page: payroll/shiftsmanual_amount.php?shift=holidayshift — no JSON API.' },
  { path: ROUTES.payrollManageSpecialShiftSalary, icon: Wallet, title: 'Manage Special Shift Salary', description: 'Real page: payroll/shiftsmanual_amount.php?shift=manual — no JSON API.' },
  // Salary Payments
  { path: ROUTES.payrollGenerateMakePayment, icon: CreditCard, title: 'Generate And Make Payment', description: 'Real page: payroll/payment.php — classic form-POST, no JSON API.' },
  { path: ROUTES.payrollGratuityPayment, icon: Gift, title: 'Gratuity Payment', description: 'Real page: payroll/gratuity_payment.php — classic form-POST, no JSON API.' },
  { path: ROUTES.payrollGeneratePayslip, icon: FileText, title: 'Generate Payslip', description: 'Real page: payroll/payslip.php + payslip_pdf.php — classic form-POST, no JSON API.' },
  { path: ROUTES.payrollYtdPayslip, icon: FileText, title: 'YTD Payslip', description: 'Real page: payroll/ytd_payslip.php — classic report page, no JSON API.' },
  { path: ROUTES.payrollYtdSummary, icon: BarChart, title: 'YTD Payroll Summary', description: 'Real page: payroll/ytd_summary.php — classic report page, no JSON API.' },
  { path: ROUTES.payrollYtdEarningsDeductions, icon: BarChart, title: 'YTD Earnings & Deductions', description: 'Real page: payroll/earn_dedu.php — classic report page, no JSON API.' },
  { path: ROUTES.payrollSummary, icon: BarChart, title: 'Payroll Summary', description: 'Real page: payroll/payroll_summary.php — classic report page, no JSON API.' },
  { path: ROUTES.payrollMonthlyAllowanceDeduction, icon: Plus, title: 'Create Monthly Allowance/Deduction', description: 'Real page: payroll/pay_deduction.php — classic form-POST, no JSON API.' },
  // Reports
  { path: ROUTES.payrollReportMonthlyOverallAttendance, icon: BarChart, title: 'Monthly Over All Attendance Report', description: 'Real page: payroll/atten_overall_rip.php — classic report page, no JSON API.' },
  { path: ROUTES.payrollReportEmployeeWiseMonthlyAttendance, icon: BarChart, title: 'Employee Wise Monthly Attendance Report', description: 'Real page: payroll/atten_emp_rip.php — classic report page, no JSON API.' },
  { path: ROUTES.payrollReportAttendancePeriodWise, icon: BarChart, title: 'Attendance Period Wise Date Report', description: 'Real page: payroll/atten_period_rip.php — classic report page, no JSON API.' },
  { path: ROUTES.payrollReportEmployeeAbsenties, icon: BarChart, title: 'Employee Date Wise Absenties Report', description: 'Real page: payroll/absent_list.php — classic report page, no JSON API.' },
  { path: ROUTES.payrollReportOvertimeDaily, icon: BarChart, title: 'Employee Over Time Daily Report', description: 'Real page: payroll/over_time.php — classic report page, no JSON API.' },
  { path: ROUTES.payrollReportOvertimeMonthly, icon: BarChart, title: 'Employee Over Time Monthly Report', description: 'Real page: payroll/overtime_monthly.php — classic report page, no JSON API.' },
  { path: ROUTES.payrollReportGratuity, icon: BarChart, title: 'Gratuity Report', description: 'Real page: payroll/gratuity_report.php — classic report page, no JSON API.' },
  { path: ROUTES.payrollReportSpecialShiftAttendance, icon: BarChart, title: 'Special Shift Attendance Report', description: 'Real page: payroll/special_shift_report.php — classic report page, no JSON API.' },
  { path: ROUTES.payrollReportHolidayShiftAttendance, icon: BarChart, title: 'Holiday Shift Attendance Report', description: 'Real page: payroll/holiday_shift_report.php — classic report page, no JSON API.' },
  { path: ROUTES.payrollReportSpecialShiftSalary, icon: BarChart, title: 'Special Shift Salary Report', description: 'Real page: payroll/special_shift_salary_report.php?shift=manual — classic report page, no JSON API.' },
  { path: ROUTES.payrollReportHolidayShiftSalary, icon: BarChart, title: 'Holiday Shift Salary Report', description: 'Real page: payroll/special_shift_salary_report.php?shift=holidayshift — classic report page, no JSON API.' },
  { path: ROUTES.payrollReportAllowanceDeduction, icon: BarChart, title: 'Allowance/Deduction Report', description: 'Real page: payroll/payroll_deduction.php — classic report page, no JSON API.' },
  { path: ROUTES.payrollReportNapsa, icon: BarChart, title: 'NAPSA Report', description: 'Real page: payroll/napsa_report.php — classic report page, no JSON API.' },
  { path: ROUTES.payrollReportNhima, icon: BarChart, title: 'NHIMA Report', description: 'Real page: payroll/nhima_report.php — classic report page, no JSON API.' },
  { path: ROUTES.payrollReportContribution, icon: BarChart, title: 'Contribution Report', description: 'Real page: payroll/employer_contribution.php — classic report page, no JSON API.' },
  { path: ROUTES.payrollReportShiftTimeline, icon: BarChart, title: 'Shift Timeline Report', description: 'Real page: payroll/shift_timeline.php — classic report page, no JSON API.' },
  // Settings
  { path: ROUTES.payrollSetup, icon: Settings2, title: 'Payroll Setup', description: 'Real page: custom/payroll/admin/setup.php — classic form-POST, no JSON API.' },
  { path: ROUTES.payrollTypesOfLeave, icon: BookUser, title: 'Types Of Leave', description: 'Real page: admin/dict.php?id=28 (Dolibarr generic dictionary editor) — classic form-POST, no JSON API.' },
  { path: ROUTES.payrollHrmDepartmentList, icon: Briefcase, title: 'HRM Department List', description: 'Real page: admin/dict.php?id=33 — classic form-POST, no JSON API.' },
  { path: ROUTES.payrollHrmJobPositions, icon: Briefcase, title: 'HRM Job Positions', description: 'Real page: admin/dict.php?id=34 — classic form-POST, no JSON API.' },
]
