import { PayrollShifts } from '../../features/payrollV2/components/PayrollShifts'
import { PayrollV2Tabs } from '../../features/payrollV2/components/PayrollV2Chrome'

export function PayrollShiftsModule() {
  return (
    <div className="space-y-4">
      <PayrollV2Tabs />
      <PayrollShifts />
    </div>
  )
}
