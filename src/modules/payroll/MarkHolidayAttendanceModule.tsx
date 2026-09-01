import { ManualShiftAttendanceForm } from '../../features/payroll/components/ManualShiftAttendanceForm'

export function MarkHolidayAttendanceModule() {
  return <ManualShiftAttendanceForm shiftId={4} title="Holiday Shift - Attendance" sourcePath="payroll/shiftsmanual_attendance.php?shift=holidayshift" />
}
