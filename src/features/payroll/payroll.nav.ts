import { Wallet } from 'lucide-react'
import { ROUTES } from '../../routes'
import type { NavSection } from '../navTypes'

// Mirrors the real app's "Payroll" left menu (llx_menu, mainmenu=payroll).
// These rows don't use the source's tree-relation column (fk_menu=-1, the
// classic flat-list style), so the grouping below is inferred from item
// naming/sequence rather than read directly off an explicit hierarchy field.
// Every item now has a real path — confirmed this session (full module
// audit): Date Wise Attendance and Mark Attendance are genuinely real JSON
// APIs, every other item is a real legacy page with no JSON API, rendered
// as an honest NotBuiltPage placeholder rather than a dead label.
export const nav: NavSection = {
  key: 'payroll',
  label: 'Payroll',
  icon: Wallet,
  items: [
    { label: 'Payroll Dashboard', path: ROUTES.payrollDashboard },
    {
      // Matches the legacy menu: clicking "Human Resource" itself (not
      // just a child) lands on Holiday Management / All Leave Request —
      // its default page.
      label: 'Human Resource',
      path: ROUTES.payrollAllLeaveRequest,
      items: [
        { label: 'Leave Request', path: ROUTES.payrollLeaveRequest },
        { label: 'All Leave Request', path: ROUTES.payrollAllLeaveRequest },
        // "Calender" (not "Calendar") — matches the live backend menu's own
        // real (misspelled) title verbatim; buildNavSections.ts's path
        // lookup matches by exact normalized label text, so this has to
        // mirror the real title, not correct it, or the live sidebar node
        // never resolves a path and becomes unclickable.
        { label: 'Calender Holidays', path: ROUTES.payrollCalendarHolidays },
        { label: 'Employee Award', path: ROUTES.payrollEmployeeAward },
        { label: 'Employee Transfers', path: ROUTES.payrollEmployeeTransfers },
        { label: 'Employee Resignation', path: ROUTES.payrollEmployeeResignation },
        { label: 'Employee Travel', path: ROUTES.payrollEmployeeTravel },
        { label: 'Employee Complaints', path: ROUTES.payrollEmployeeComplaints },
        { label: 'Employee Warnings', path: ROUTES.payrollEmployeeWarnings },
        { label: 'Employee Terminations', path: ROUTES.payrollEmployeeTerminations },
        { label: 'Employee Indicator', path: ROUTES.payrollEmployeeIndicator },
        { label: 'Employee Appraisal', path: ROUTES.payrollEmployeeAppraisal },
      ],
    },
    {
      label: 'Attendance',
      items: [
        { label: 'Mark Attendance', path: ROUTES.payrollMarkAttendance },
        { label: 'Mark Special Shift Attendance', path: ROUTES.payrollMarkSpecialShiftAttendance },
        { label: 'Mark Holiday Attendance', path: ROUTES.payrollMarkHolidayAttendance },
        { label: 'Date Wise Attendance', path: ROUTES.payrollDateWiseAttendance },
      ],
    },
    {
      label: 'Shift & Salary',
      items: [
        { label: 'Employee Advance Salary', path: ROUTES.payrollAdvanceSalary },
        { label: 'Employee Loan', path: ROUTES.payrollEmployeeLoan },
        { label: 'Assign Shifts', path: ROUTES.payrollAssignShifts },
        { label: 'Salary Template', path: ROUTES.payrollSalaryTemplate },
        { label: 'Hourly Template', path: ROUTES.payrollHourlyTemplate },
        { label: 'Manage Salary', path: ROUTES.payrollManageSalary },
        { label: 'Manage Salary List', path: ROUTES.payrollManageSalaryList },
        { label: 'Manage Holiday Salary', path: ROUTES.payrollManageHolidaySalary },
        { label: 'Manage Special Shift Salary', path: ROUTES.payrollManageSpecialShiftSalary },
      ],
    },
    {
      label: 'Salary Payments',
      items: [
        { label: 'Generate And Make Payment', path: ROUTES.payrollGenerateMakePayment },
        { label: 'Gratuity Payment', path: ROUTES.payrollGratuityPayment },
        { label: 'Generate Payslip', path: ROUTES.payrollGeneratePayslip },
        { label: 'YTD Payslip', path: ROUTES.payrollYtdPayslip },
        { label: 'YTD Payroll Summary', path: ROUTES.payrollYtdSummary },
        { label: 'YTD Earnings & Deductions', path: ROUTES.payrollYtdEarningsDeductions },
        { label: 'Payroll Summary', path: ROUTES.payrollSummary },
        { label: 'Create Monthly Allowance/Deduction', path: ROUTES.payrollMonthlyAllowanceDeduction },
      ],
    },
    {
      label: 'Reports',
      items: [
        { label: 'Monthly Over All Attendance Report', path: ROUTES.payrollReportMonthlyOverallAttendance },
        { label: 'Employee Wise Monthly Attendance Report', path: ROUTES.payrollReportEmployeeWiseMonthlyAttendance },
        { label: 'Attendance Period Wise Date Report', path: ROUTES.payrollReportAttendancePeriodWise },
        { label: 'Employee Date Wise Absenties Report', path: ROUTES.payrollReportEmployeeAbsenties },
        { label: 'Employee Over Time Daily Report', path: ROUTES.payrollReportOvertimeDaily },
        { label: 'Employee Over Time Monthly Report', path: ROUTES.payrollReportOvertimeMonthly },
        { label: 'Gratuity Report', path: ROUTES.payrollReportGratuity },
        { label: 'Special Shift Attendance Report', path: ROUTES.payrollReportSpecialShiftAttendance },
        { label: 'Holiday Shift Attendance Report', path: ROUTES.payrollReportHolidayShiftAttendance },
        { label: 'Special Shift Salary Report', path: ROUTES.payrollReportSpecialShiftSalary },
        { label: 'Holiday Shift Salary Report', path: ROUTES.payrollReportHolidayShiftSalary },
        { label: 'Allowance/Deduction Report', path: ROUTES.payrollReportAllowanceDeduction },
        { label: 'NAPSA Report', path: ROUTES.payrollReportNapsa },
        { label: 'NHIMA Report', path: ROUTES.payrollReportNhima },
        { label: 'Contribution Report', path: ROUTES.payrollReportContribution },
        { label: 'Shift Timeline Report', path: ROUTES.payrollReportShiftTimeline },
      ],
    },
    {
      label: 'Settings',
      items: [
        { label: 'Payroll Setup', path: ROUTES.payrollSetup },
        { label: 'Types Of Leave', path: ROUTES.payrollTypesOfLeave },
        { label: 'HRM Department List', path: ROUTES.payrollHrmDepartmentList },
        { label: 'HRM Job Positions', path: ROUTES.payrollHrmJobPositions },
      ],
    },
  ],
}
