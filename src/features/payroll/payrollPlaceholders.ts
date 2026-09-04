import type { ComponentType } from 'react'
import {
  BarChart,
  Plus,
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
  // Human Resource: Leave Request / All Leave Request now reuse the real
  // users/leave.queries.ts + LeaveList/LeaveRequestForm implementation (see
  // modules/payroll/PayrollLeaveListModule.tsx / PayrollLeaveRequestModule.tsx).
  // Calendar Holidays, Employee Award/Transfers/Resignation/Travel/
  // Complaints/Warnings/Terminations now have real wired forms — see
  // payrollActions.queries.ts (payroll/ajax.php is a real write endpoint
  // for all 8, confirmed by reading it directly). Employee Indicator and
  // Employee Appraisal got their own inert DisabledFormPage-style
  // components instead — their dynamic reveal depends on
  // payroll/ajax_search.php, which returns HTML fragments, not JSON.
  // Attendance: Mark/Date-Wise Attendance are real JSON APIs; Mark Special
  // Shift/Holiday Attendance now have real wired forms too (see
  // useMarkManualShiftAttendance in payrollAttendance.queries.ts —
  // payroll/shiftsmanual_ajax.php's saveAttendance action is genuinely
  // JSON, even though that same page's own read side isn't).
  // Shift & Salary: Advance Salary, Loan, Assign Shifts, and Hourly
  // Template now have real wired forms — see payrollActions.queries.ts
  // (payroll/ajax.php is a real write endpoint for all 4, confirmed by
  // reading it directly). Salary Template, Manage Salary, Manage Salary
  // List, and Manage Holiday/Special Shift Salary got their own inert
  // components instead — each depends on an HTML-fragment-only endpoint
  // (payroll/loadcalculation.php, payroll/ajax_search.php, or a plain
  // server-rendered report with no API at all) — see each component's own
  // comment for specifics.
  // Salary Payments: Generate And Make Payment, Gratuity Payment, Generate
  // Payslip, and YTD Payslip now have their own layout-matched components
  // (MakePaymentForm.tsx, GratuityPaymentForm.tsx, GeneratePayslipForm.tsx,
  // YtdPayslipForm.tsx) instead of this generic placeholder — see each
  // one's own comment for why their write/detail actions stay disabled.
  { path: ROUTES.payrollYtdSummary, icon: BarChart, title: 'YTD Payroll Summary', description: 'Real page: payroll/ytd_summary.php — classic report page, no JSON API.' },
  { path: ROUTES.payrollYtdEarningsDeductions, icon: BarChart, title: 'YTD Earnings & Deductions', description: 'Real page: payroll/earn_dedu.php — classic report page, no JSON API.' },
  { path: ROUTES.payrollSummary, icon: BarChart, title: 'Payroll Summary', description: 'Real page: payroll/payroll_summary.php — classic report page, no JSON API.' },
  { path: ROUTES.payrollMonthlyAllowanceDeduction, icon: Plus, title: 'Create Monthly Allowance/Deduction', description: 'Real page: payroll/pay_deduction.php — classic form-POST, no JSON API.' },
  // Reports: Monthly Over All Attendance Report now has its own inert,
  // layout-matched component (OverallAttendanceReportForm.tsx) instead of
  // this generic placeholder.
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
  // Settings: Payroll Setup now has its own inert, layout-matched component
  // (PayrollSetupForm.tsx, Settings tab only) instead of this generic
  // placeholder.
  { path: ROUTES.payrollTypesOfLeave, icon: BookUser, title: 'Types Of Leave', description: 'Real page: admin/dict.php?id=28 (Dolibarr generic dictionary editor) — classic form-POST, no JSON API.' },
  { path: ROUTES.payrollHrmDepartmentList, icon: Briefcase, title: 'HRM Department List', description: 'Real page: admin/dict.php?id=33 — classic form-POST, no JSON API.' },
  { path: ROUTES.payrollHrmJobPositions, icon: Briefcase, title: 'HRM Job Positions', description: 'Real page: admin/dict.php?id=34 — classic form-POST, no JSON API.' },
]
