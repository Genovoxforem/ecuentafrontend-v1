import { ManualShiftAttendanceForm } from '../../features/payroll/components/ManualShiftAttendanceForm'

export function MarkSpecialShiftAttendanceModule() {
  return <ManualShiftAttendanceForm shiftId={3} title="Special Shift - Attendance" sourcePath="payroll/shiftsmanual_attendance.php?shift=manual" />
}
