import { PayrollAdvances } from '../../features/payrollV2/components/PayrollAdvances'
import { PayrollV2Tabs } from '../../features/payrollV2/components/PayrollV2Chrome'

export function PayrollAdvancesModule() {
  return (
    <div className="space-y-4">
      <PayrollV2Tabs />
      <PayrollAdvances />
    </div>
  )
}
