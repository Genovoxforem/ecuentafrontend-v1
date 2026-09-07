import { ShiftSalarySearchForm } from '../../features/payroll/components/ShiftSalarySearchForm'

export function ManageSpecialShiftSalaryModule() {
  return (
    <ShiftSalarySearchForm
      title="Payroll - Manual"
      sourcePath="payroll/shiftsmanual_amount.php?shift=manual"
      shiftId={3}
      unitLabel="Per Day"
    />
  )
}
