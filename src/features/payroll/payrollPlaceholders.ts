import type { ComponentType } from 'react'

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
  // Payslip, YTD Payslip, YTD Payroll Summary, YTD Earnings & Deductions,
  // Payroll Summary, and Create Monthly Allowance/Deduction now have their
  // own layout-matched components (MakePaymentForm.tsx, GratuityPaymentForm.tsx,
  // GeneratePayslipForm.tsx, YtdPayslipForm.tsx, YtdPayrollSummaryForm.tsx,
  // YtdEarningsDeductionsForm.tsx, PayrollSummaryForm.tsx, PayDeductionForm.tsx)
  // instead of this generic placeholder — see each one's own comment for why
  // their write/detail actions stay disabled (or, for Payroll Summary/Pay
  // Deduction, why their rows/writes are real instead).
  // Reports: Monthly Over All Attendance Report, Employee Wise Monthly
  // Attendance Report, Attendance Period Wise Date Report, and Employee
  // Date Wise Absenties Report now have their own layout-matched components
  // (OverallAttendanceReportForm.tsx, EmployeeMonthlyReportForm.tsx,
  // AttendancePeriodReportForm.tsx, EmployeeAbsentListForm.tsx) instead of
  // this generic placeholder — all genuinely real, fetched live via a GET
  // (each page's own <form> POST is CSRF-blocked, same gap as YTD Earnings
  // & Deductions — see its own comment).
  // Settings: Payroll Setup now has its own inert, layout-matched component
  // (PayrollSetupForm.tsx, Settings tab only) instead of this generic
  // placeholder. Types Of Leave / HRM Department List / HRM Job Positions
  // (admin/dict.php?id=28/33/34) are now real pages too — see
  // PayrollTypesOfLeaveList.tsx / PayrollHrmDepartmentList.tsx /
  // PayrollHrmJobPositionsList.tsx, reusing the same generic Dolibarr
  // dictionary template already proven on General Ledger's Tax/VAT/Expense
  // account pages (DictionaryPage.tsx) — confirmed live that dict.php's
  // content is identical regardless of the `from`/`mainmenu` context param.
]
