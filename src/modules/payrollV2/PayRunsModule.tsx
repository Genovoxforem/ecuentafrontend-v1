import { PayRunsList } from '../../features/payrollV2/components/PayRunsList'
import { PayrollV2Tabs } from '../../features/payrollV2/components/PayrollV2Chrome'

export function PayRunsModule() {
  return (
    <div className="space-y-4">
      <PayrollV2Tabs />
      <PayRunsList />
    </div>
  )
}
