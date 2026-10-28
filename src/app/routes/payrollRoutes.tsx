import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { ROUTES } from '../../routes'
import { RouteBoundary } from '../RouteBoundary'
import { PAYROLL_PLACEHOLDERS } from '../../features/payroll/payrollPlaceholders'

const PayrollModule = lazy(() => import('../../modules/payroll/PayrollModule').then((m) => ({ default: m.PayrollModule })))
const DateWiseAttendanceModule = lazy(() => import('../../modules/payroll/DateWiseAttendanceModule').then((m) => ({ default: m.DateWiseAttendanceModule })))
const MarkAttendanceModule = lazy(() => import('../../modules/payroll/MarkAttendanceModule').then((m) => ({ default: m.MarkAttendanceModule })))
const HolidayModule = lazy(() => import('../../modules/payroll/HolidayModule').then((m) => ({ default: m.HolidayModule })))
const HolidayCreateModule = lazy(() => import('../../modules/payroll/HolidayCreateModule').then((m) => ({ default: m.HolidayCreateModule })))
const AwardModule = lazy(() => import('../../modules/payroll/AwardModule').then((m) => ({ default: m.AwardModule })))
const AwardCreateModule = lazy(() => import('../../modules/payroll/AwardCreateModule').then((m) => ({ default: m.AwardCreateModule })))
const TransferModule = lazy(() => import('../../modules/payroll/TransferModule').then((m) => ({ default: m.TransferModule })))
const TransferCreateModule = lazy(() => import('../../modules/payroll/TransferCreateModule').then((m) => ({ default: m.TransferCreateModule })))
const ResignationModule = lazy(() => import('../../modules/payroll/ResignationModule').then((m) => ({ default: m.ResignationModule })))
const ResignationCreateModule = lazy(() => import('../../modules/payroll/ResignationCreateModule').then((m) => ({ default: m.ResignationCreateModule })))
const TravelModule = lazy(() => import('../../modules/payroll/TravelModule').then((m) => ({ default: m.TravelModule })))
const TravelCreateModule = lazy(() => import('../../modules/payroll/TravelCreateModule').then((m) => ({ default: m.TravelCreateModule })))
const ComplaintModule = lazy(() => import('../../modules/payroll/ComplaintModule').then((m) => ({ default: m.ComplaintModule })))
const ComplaintCreateModule = lazy(() => import('../../modules/payroll/ComplaintCreateModule').then((m) => ({ default: m.ComplaintCreateModule })))
const WarningModule = lazy(() => import('../../modules/payroll/WarningModule').then((m) => ({ default: m.WarningModule })))
const WarningCreateModule = lazy(() => import('../../modules/payroll/WarningCreateModule').then((m) => ({ default: m.WarningCreateModule })))
const TerminationModule = lazy(() => import('../../modules/payroll/TerminationModule').then((m) => ({ default: m.TerminationModule })))
const TerminationCreateModule = lazy(() => import('../../modules/payroll/TerminationCreateModule').then((m) => ({ default: m.TerminationCreateModule })))
const IndicatorModule = lazy(() => import('../../modules/payroll/IndicatorModule').then((m) => ({ default: m.IndicatorModule })))
const IndicatorCreateModule = lazy(() => import('../../modules/payroll/IndicatorCreateModule').then((m) => ({ default: m.IndicatorCreateModule })))
const AppraisalModule = lazy(() => import('../../modules/payroll/AppraisalModule').then((m) => ({ default: m.AppraisalModule })))
const AppraisalCreateModule = lazy(() => import('../../modules/payroll/AppraisalCreateModule').then((m) => ({ default: m.AppraisalCreateModule })))
const PayrollLeaveListModule = lazy(() => import('../../modules/payroll/PayrollLeaveListModule').then((m) => ({ default: m.PayrollLeaveListModule })))
const PayrollLeaveRequestModule = lazy(() => import('../../modules/payroll/PayrollLeaveRequestModule').then((m) => ({ default: m.PayrollLeaveRequestModule })))
const MarkSpecialShiftAttendanceModule = lazy(() => import('../../modules/payroll/MarkSpecialShiftAttendanceModule').then((m) => ({ default: m.MarkSpecialShiftAttendanceModule })))
const MarkHolidayAttendanceModule = lazy(() => import('../../modules/payroll/MarkHolidayAttendanceModule').then((m) => ({ default: m.MarkHolidayAttendanceModule })))
const AdvanceSalaryModule = lazy(() => import('../../modules/payroll/AdvanceSalaryModule').then((m) => ({ default: m.AdvanceSalaryModule })))
const AdvanceSalaryCreateModule = lazy(() => import('../../modules/payroll/AdvanceSalaryCreateModule').then((m) => ({ default: m.AdvanceSalaryCreateModule })))
const LoanModule = lazy(() => import('../../modules/payroll/LoanModule').then((m) => ({ default: m.LoanModule })))
const PayrollLoanCreateModule = lazy(() => import('../../modules/payroll/PayrollLoanCreateModule').then((m) => ({ default: m.PayrollLoanCreateModule })))
const ShiftModule = lazy(() => import('../../modules/payroll/ShiftModule').then((m) => ({ default: m.ShiftModule })))
const ShiftCreateModule = lazy(() => import('../../modules/payroll/ShiftCreateModule').then((m) => ({ default: m.ShiftCreateModule })))
const SalaryTemplateModule = lazy(() => import('../../modules/payroll/SalaryTemplateModule').then((m) => ({ default: m.SalaryTemplateModule })))
const SalaryTemplateCreateModule = lazy(() => import('../../modules/payroll/SalaryTemplateCreateModule').then((m) => ({ default: m.SalaryTemplateCreateModule })))
const HourlyTemplateModule = lazy(() => import('../../modules/payroll/HourlyTemplateModule').then((m) => ({ default: m.HourlyTemplateModule })))
const HourlyTemplateCreateModule = lazy(() => import('../../modules/payroll/HourlyTemplateCreateModule').then((m) => ({ default: m.HourlyTemplateCreateModule })))
const ManageSalaryModule = lazy(() => import('../../modules/payroll/ManageSalaryModule').then((m) => ({ default: m.ManageSalaryModule })))
const ManageSalaryListModule = lazy(() => import('../../modules/payroll/ManageSalaryListModule').then((m) => ({ default: m.ManageSalaryListModule })))
const ManageHolidaySalaryModule = lazy(() => import('../../modules/payroll/ManageHolidaySalaryModule').then((m) => ({ default: m.ManageHolidaySalaryModule })))
const ManageSpecialShiftSalaryModule = lazy(() => import('../../modules/payroll/ManageSpecialShiftSalaryModule').then((m) => ({ default: m.ManageSpecialShiftSalaryModule })))
const MakePaymentModule = lazy(() => import('../../modules/payroll/MakePaymentModule').then((m) => ({ default: m.MakePaymentModule })))
const GratuityPaymentModule = lazy(() => import('../../modules/payroll/GratuityPaymentModule').then((m) => ({ default: m.GratuityPaymentModule })))
const GeneratePayslipModule = lazy(() => import('../../modules/payroll/GeneratePayslipModule').then((m) => ({ default: m.GeneratePayslipModule })))
const YtdPayslipModule = lazy(() => import('../../modules/payroll/YtdPayslipModule').then((m) => ({ default: m.YtdPayslipModule })))
const YtdPayrollSummaryModule = lazy(() => import('../../modules/payroll/YtdPayrollSummaryModule').then((m) => ({ default: m.YtdPayrollSummaryModule })))
const YtdEarningsDeductionsModule = lazy(() => import('../../modules/payroll/YtdEarningsDeductionsModule').then((m) => ({ default: m.YtdEarningsDeductionsModule })))
const PayrollSummaryModule = lazy(() => import('../../modules/payroll/PayrollSummaryModule').then((m) => ({ default: m.PayrollSummaryModule })))
const PayDeductionModule = lazy(() => import('../../modules/payroll/PayDeductionModule').then((m) => ({ default: m.PayDeductionModule })))
const OverallAttendanceReportModule = lazy(() => import('../../modules/payroll/OverallAttendanceReportModule').then((m) => ({ default: m.OverallAttendanceReportModule })))
const EmployeeMonthlyReportModule = lazy(() => import('../../modules/payroll/EmployeeMonthlyReportModule').then((m) => ({ default: m.EmployeeMonthlyReportModule })))
const AttendancePeriodReportModule = lazy(() => import('../../modules/payroll/AttendancePeriodReportModule').then((m) => ({ default: m.AttendancePeriodReportModule })))
const EmployeeAbsentListModule = lazy(() => import('../../modules/payroll/EmployeeAbsentListModule').then((m) => ({ default: m.EmployeeAbsentListModule })))
const PayrollSetupModule = lazy(() => import('../../modules/payroll/PayrollSetupModule').then((m) => ({ default: m.PayrollSetupModule })))
const PayrollTypesOfLeaveModule = lazy(() => import('../../modules/payroll/PayrollTypesOfLeaveModule').then((m) => ({ default: m.PayrollTypesOfLeaveModule })))
const PayrollHrmDepartmentListModule = lazy(() => import('../../modules/payroll/PayrollHrmDepartmentListModule').then((m) => ({ default: m.PayrollHrmDepartmentListModule })))
const PayrollHrmJobPositionsModule = lazy(() => import('../../modules/payroll/PayrollHrmJobPositionsModule').then((m) => ({ default: m.PayrollHrmJobPositionsModule })))
const OvertimeDailyReportModule = lazy(() => import('../../modules/payroll/PayrollReportModules').then((m) => ({ default: m.OvertimeDailyReportModule })))
const OvertimeMonthlyReportModule = lazy(() => import('../../modules/payroll/PayrollReportModules').then((m) => ({ default: m.OvertimeMonthlyReportModule })))
const GratuityReportModule = lazy(() => import('../../modules/payroll/PayrollReportModules').then((m) => ({ default: m.GratuityReportModule })))
const SpecialShiftAttendanceReportModule = lazy(() => import('../../modules/payroll/PayrollReportModules').then((m) => ({ default: m.SpecialShiftAttendanceReportModule })))
const HolidayShiftAttendanceReportModule = lazy(() => import('../../modules/payroll/PayrollReportModules').then((m) => ({ default: m.HolidayShiftAttendanceReportModule })))
const SpecialShiftSalaryReportModule = lazy(() => import('../../modules/payroll/PayrollReportModules').then((m) => ({ default: m.SpecialShiftSalaryReportModule })))
const HolidayShiftSalaryReportModule = lazy(() => import('../../modules/payroll/PayrollReportModules').then((m) => ({ default: m.HolidayShiftSalaryReportModule })))
const AllowanceDeductionReportModule = lazy(() => import('../../modules/payroll/PayrollReportModules').then((m) => ({ default: m.AllowanceDeductionReportModule })))
const NapsaReportModule = lazy(() => import('../../modules/payroll/PayrollReportModules').then((m) => ({ default: m.NapsaReportModule })))
const NhimaReportModule = lazy(() => import('../../modules/payroll/PayrollReportModules').then((m) => ({ default: m.NhimaReportModule })))
const EmployerContributionModule = lazy(() => import('../../modules/payroll/PayrollReportModules').then((m) => ({ default: m.EmployerContributionModule })))
const ShiftTimelineReportModule = lazy(() => import('../../modules/payroll/PayrollReportModules').then((m) => ({ default: m.ShiftTimelineReportModule })))
const PayrollPlaceholderModule = lazy(() => import('../../modules/payroll/PayrollPlaceholderModule').then((m) => ({ default: m.PayrollPlaceholderModule })))

// Routes of the payroll area, rendered inside the app layout (see src/App.tsx).
export function payrollRoutes() {
  return (
    <>
      <Route
        path={ROUTES.payrollDashboard}
        element={
          <RouteBoundary>
            <PayrollModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollDateWiseAttendance}
        element={
          <RouteBoundary>
            <DateWiseAttendanceModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollMarkAttendance}
        element={
          <RouteBoundary>
            <MarkAttendanceModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollCalendarHolidays}
        element={
          <RouteBoundary>
            <HolidayModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollCalendarHolidaysCreate}
        element={
          <RouteBoundary>
            <HolidayCreateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollEmployeeAward}
        element={
          <RouteBoundary>
            <AwardModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollEmployeeAwardCreate}
        element={
          <RouteBoundary>
            <AwardCreateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollEmployeeTransfers}
        element={
          <RouteBoundary>
            <TransferModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollEmployeeTransfersCreate}
        element={
          <RouteBoundary>
            <TransferCreateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollEmployeeResignation}
        element={
          <RouteBoundary>
            <ResignationModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollEmployeeResignationCreate}
        element={
          <RouteBoundary>
            <ResignationCreateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollEmployeeTravel}
        element={
          <RouteBoundary>
            <TravelModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollEmployeeTravelCreate}
        element={
          <RouteBoundary>
            <TravelCreateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollEmployeeComplaints}
        element={
          <RouteBoundary>
            <ComplaintModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollEmployeeComplaintsCreate}
        element={
          <RouteBoundary>
            <ComplaintCreateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollEmployeeWarnings}
        element={
          <RouteBoundary>
            <WarningModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollEmployeeWarningsCreate}
        element={
          <RouteBoundary>
            <WarningCreateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollEmployeeTerminations}
        element={
          <RouteBoundary>
            <TerminationModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollEmployeeTerminationsCreate}
        element={
          <RouteBoundary>
            <TerminationCreateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollEmployeeIndicator}
        element={
          <RouteBoundary>
            <IndicatorModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollEmployeeIndicatorCreate}
        element={
          <RouteBoundary>
            <IndicatorCreateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollEmployeeAppraisal}
        element={
          <RouteBoundary>
            <AppraisalModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollEmployeeAppraisalCreate}
        element={
          <RouteBoundary>
            <AppraisalCreateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollAllLeaveRequest}
        element={
          <RouteBoundary>
            <PayrollLeaveListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollLeaveRequest}
        element={
          <RouteBoundary>
            <PayrollLeaveRequestModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollMarkSpecialShiftAttendance}
        element={
          <RouteBoundary>
            <MarkSpecialShiftAttendanceModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollMarkHolidayAttendance}
        element={
          <RouteBoundary>
            <MarkHolidayAttendanceModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollAdvanceSalary}
        element={
          <RouteBoundary>
            <AdvanceSalaryModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollAdvanceSalaryCreate}
        element={
          <RouteBoundary>
            <AdvanceSalaryCreateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollEmployeeLoan}
        element={
          <RouteBoundary>
            <LoanModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollEmployeeLoanCreate}
        element={
          <RouteBoundary>
            <PayrollLoanCreateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollAssignShifts}
        element={
          <RouteBoundary>
            <ShiftModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollAssignShiftsCreate}
        element={
          <RouteBoundary>
            <ShiftCreateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollSalaryTemplate}
        element={
          <RouteBoundary>
            <SalaryTemplateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollSalaryTemplateCreate}
        element={
          <RouteBoundary>
            <SalaryTemplateCreateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollHourlyTemplate}
        element={
          <RouteBoundary>
            <HourlyTemplateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollHourlyTemplateCreate}
        element={
          <RouteBoundary>
            <HourlyTemplateCreateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollManageSalary}
        element={
          <RouteBoundary>
            <ManageSalaryModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollManageSalaryList}
        element={
          <RouteBoundary>
            <ManageSalaryListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollManageHolidaySalary}
        element={
          <RouteBoundary>
            <ManageHolidaySalaryModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollManageSpecialShiftSalary}
        element={
          <RouteBoundary>
            <ManageSpecialShiftSalaryModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollGenerateMakePayment}
        element={
          <RouteBoundary>
            <MakePaymentModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollGratuityPayment}
        element={
          <RouteBoundary>
            <GratuityPaymentModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollGeneratePayslip}
        element={
          <RouteBoundary>
            <GeneratePayslipModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollYtdPayslip}
        element={
          <RouteBoundary>
            <YtdPayslipModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollYtdSummary}
        element={
          <RouteBoundary>
            <YtdPayrollSummaryModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollYtdEarningsDeductions}
        element={
          <RouteBoundary>
            <YtdEarningsDeductionsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollSummary}
        element={
          <RouteBoundary>
            <PayrollSummaryModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollMonthlyAllowanceDeduction}
        element={
          <RouteBoundary>
            <PayDeductionModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollReportMonthlyOverallAttendance}
        element={
          <RouteBoundary>
            <OverallAttendanceReportModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollReportEmployeeWiseMonthlyAttendance}
        element={
          <RouteBoundary>
            <EmployeeMonthlyReportModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollReportAttendancePeriodWise}
        element={
          <RouteBoundary>
            <AttendancePeriodReportModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollReportEmployeeAbsenties}
        element={
          <RouteBoundary>
            <EmployeeAbsentListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollSetup}
        element={
          <RouteBoundary>
            <PayrollSetupModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollTypesOfLeave}
        element={
          <RouteBoundary>
            <PayrollTypesOfLeaveModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollHrmDepartmentList}
        element={
          <RouteBoundary>
            <PayrollHrmDepartmentListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollHrmJobPositions}
        element={
          <RouteBoundary>
            <PayrollHrmJobPositionsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollReportOvertimeDaily}
        element={
          <RouteBoundary>
            <OvertimeDailyReportModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollReportOvertimeMonthly}
        element={
          <RouteBoundary>
            <OvertimeMonthlyReportModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollReportGratuity}
        element={
          <RouteBoundary>
            <GratuityReportModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollReportSpecialShiftAttendance}
        element={
          <RouteBoundary>
            <SpecialShiftAttendanceReportModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollReportHolidayShiftAttendance}
        element={
          <RouteBoundary>
            <HolidayShiftAttendanceReportModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollReportSpecialShiftSalary}
        element={
          <RouteBoundary>
            <SpecialShiftSalaryReportModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollReportHolidayShiftSalary}
        element={
          <RouteBoundary>
            <HolidayShiftSalaryReportModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollReportAllowanceDeduction}
        element={
          <RouteBoundary>
            <AllowanceDeductionReportModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollReportNapsa}
        element={
          <RouteBoundary>
            <NapsaReportModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollReportNhima}
        element={
          <RouteBoundary>
            <NhimaReportModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollReportContribution}
        element={
          <RouteBoundary>
            <EmployerContributionModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.payrollReportShiftTimeline}
        element={
          <RouteBoundary>
            <ShiftTimelineReportModule />
          </RouteBoundary>
        }
      />
      {PAYROLL_PLACEHOLDERS.map((p) => (
        <Route
          key={p.path}
          path={p.path}
          element={
            <RouteBoundary>
              <PayrollPlaceholderModule />
            </RouteBoundary>
          }
        />
      ))}
    </>
  )
}
