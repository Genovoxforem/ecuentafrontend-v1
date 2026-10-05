import { Coins, Landmark, HeartPulse, Sun, Moon, CalendarDays } from 'lucide-react'
import { OvertimeListForm } from '../../features/payroll/components/OvertimeListForm'
import { GratuityReportForm } from '../../features/payroll/components/GratuityReportForm'
import { ShiftPivotReportForm } from '../../features/payroll/components/ShiftPivotReportForm'
import { SearchTypeReportForm } from '../../features/payroll/components/SearchTypeReportForm'
import { EmployerContributionForm } from '../../features/payroll/components/EmployerContributionForm'
import { ShiftTimelineForm } from '../../features/payroll/components/ShiftTimelineForm'
import { ShiftSalaryReportForm } from '../../features/payroll/components/ShiftSalaryReportForm'

// Thin route wrappers for the Payroll > Reports pages that are plain
// server-rendered legacy reports (see each form's own comment for the real
// backend page it reads).

export const OvertimeDailyReportModule = () => <OvertimeListForm />
export const GratuityReportModule = () => <GratuityReportForm />

export const OvertimeMonthlyReportModule = () => (
  <ShiftPivotReportForm
    path="/payroll/overtime_monthly.php"
    monthParam="month"
    title="Payroll - Overtime Monthly Report"
    description="Overtime hours per employee for each day of the selected month."
    icon={CalendarDays}
  />
)
export const SpecialShiftAttendanceReportModule = () => (
  <ShiftPivotReportForm
    path="/payroll/special_shift_report.php"
    monthParam="monthPic"
    title="Payroll - Special Shift Attendance Report (Night /Day Shift)"
    description="Special shift attendance per employee for each day of the selected month."
    icon={Moon}
  />
)
export const HolidayShiftAttendanceReportModule = () => (
  <ShiftPivotReportForm
    path="/payroll/holiday_shift_report.php"
    monthParam="month"
    title="Payroll - Holiday Shift Monthly Report"
    description="Holiday shift attendance per employee for each day of the selected month."
    icon={Sun}
  />
)

export const SpecialShiftSalaryReportModule = () => <ShiftSalaryReportForm shift="manual" title="Special Shift Salary Report" />
export const HolidayShiftSalaryReportModule = () => <ShiftSalaryReportForm shift="holidayshift" title="Holiday Shift Salary Report" />

export const AllowanceDeductionReportModule = () => (
  <SearchTypeReportForm path="/payroll/payroll_deduction.php" title="Allowance/Deduction Report" icon={Coins} withHead />
)
export const NapsaReportModule = () => <SearchTypeReportForm path="/payroll/napsa_report.php" title="NAPSA Report" icon={Landmark} />
export const NhimaReportModule = () => <SearchTypeReportForm path="/payroll/nhima_report.php" title="NHIMA Report" icon={HeartPulse} />

export const EmployerContributionModule = () => <EmployerContributionForm />
export const ShiftTimelineReportModule = () => <ShiftTimelineForm />
