import { PayrollLeave } from '../../features/payrollV2/components/PayrollLeave'
import { PayrollV2Tabs } from '../../features/payrollV2/components/PayrollV2Chrome'

export function PayrollLeaveModule() {
  return (
    <div className="space-y-4">
      <PayrollV2Tabs />
      <PayrollLeave />
    </div>
  )
}
