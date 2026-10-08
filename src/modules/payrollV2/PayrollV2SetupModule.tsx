import { PayrollSetup } from '../../features/payrollV2/components/PayrollSetup'
import { PayrollV2Tabs } from '../../features/payrollV2/components/PayrollV2Chrome'

export function PayrollV2SetupModule() {
  return (
    <div className="space-y-4">
      <PayrollV2Tabs />
      <PayrollSetup />
    </div>
  )
}
