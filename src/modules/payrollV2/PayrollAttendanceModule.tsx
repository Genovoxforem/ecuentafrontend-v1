import { PayrollAttendance } from '../../features/payrollV2/components/PayrollAttendance'
import { PayrollV2Tabs } from '../../features/payrollV2/components/PayrollV2Chrome'

export function PayrollAttendanceModule() {
  return (
    <div className="space-y-4">
      <PayrollV2Tabs />
      <PayrollAttendance />
    </div>
  )
}
