import { ShiftSalarySearchForm } from '../../features/payroll/components/ShiftSalarySearchForm'

export function ManageHolidaySalaryModule() {
  return (
    <ShiftSalarySearchForm
      title="Payroll - Holidayshift"
      sourcePath="payroll/shiftsmanual_amount.php?shift=holidayshift"
      shiftId={4}
      unitLabel="Per Hour"
    />
  )
}
