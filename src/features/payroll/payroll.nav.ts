import { Wallet } from 'lucide-react'
import { ROUTES } from '../../routes'
import type { NavSection } from '../navTypes'

// Mirrors the real app's "Payroll" left menu (llx_menu, mainmenu=payroll).
// These rows don't use the source's tree-relation column (fk_menu=-1, the
// classic flat-list style), so the grouping below is inferred from item
// naming/sequence rather than read directly off an explicit hierarchy field.
export const nav: NavSection = {
  key: 'payroll',
  label: 'Payroll',
  icon: Wallet,
  items: [
    { label: 'Payroll Dashboard', path: ROUTES.payrollDashboard },
    {
      label: 'Human Resource',
      items: [
        { label: 'Leave Request' },
        { label: 'All Leave Request' },
        { label: 'Calendar Holidays' },
        { label: 'Employee Award' },
        { label: 'Employee Transfers' },
        { label: 'Employee Resignation' },
        { label: 'Employee Travel' },
        { label: 'Employee Complaints' },
        { label: 'Employee Warnings' },
        { label: 'Employee Terminations' },
        { label: 'Employee Indicator' },
        { label: 'Employee Appraisal' },
      ],
    },
    {
      label: 'Attendance',
      items: [{ label: 'Mark Attendance' }, { label: 'Mark Special Shift Attendance' }, { label: 'Mark Holiday Attendance' }, { label: 'Date Wise Attendance' }],
    },
    {
      label: 'Shift & Salary',
      items: [
        { label: 'Employee Advance Salary' },
        { label: 'Employee Loan' },
        { label: 'Assign Shifts' },
        { label: 'Salary Template' },
        { label: 'Hourly Template' },
        { label: 'Manage Salary' },
        { label: 'Manage Salary List' },
        { label: 'Manage Holiday Salary' },
        { label: 'Manage Special Shift Salary' },
      ],
    },
    {
      label: 'Salary Payments',
      items: [
        { label: 'Generate And Make Payment' },
        { label: 'Gratuity Payment' },
        { label: 'Generate Payslip' },
        { label: 'YTD Payslip' },
        { label: 'YTD Payroll Summary' },
        { label: 'YTD Earnings & Deductions' },
        { label: 'Payroll Summary' },
        { label: 'Create Monthly Allowance/Deduction' },
      ],
    },
    {
      label: 'Reports',
      items: [
        { label: 'Monthly Over All Attendance Report' },
        { label: 'Employee Wise Monthly Attendance Report' },
        { label: 'Attendance Period Wise Date Report' },
        { label: 'Employee Date Wise Absenties Report' },
        { label: 'Employee Over Time Daily Report' },
        { label: 'Employee Over Time Monthly Report' },
        { label: 'Gratuity Report' },
        { label: 'Special Shift Attendance Report' },
        { label: 'Holiday Shift Attendance Report' },
        { label: 'Special Shift Salary Report' },
        { label: 'Holiday Shift Salary Report' },
        { label: 'Allowance/Deduction Report' },
        { label: 'NAPSA Report' },
        { label: 'NHIMA Report' },
        { label: 'Contribution Report' },
        { label: 'Shift Timeline Report' },
      ],
    },
    {
      label: 'Settings',
      items: [{ label: 'Payroll Setup' }, { label: 'Types Of Leave' }, { label: 'HRM Department List' }, { label: 'HRM Job Positions' }],
    },
  ],
}
