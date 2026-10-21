import { PayrollAnalytics } from '../../features/payrollV2/components/PayrollAnalytics'
import { PayrollV2Tabs } from '../../features/payrollV2/components/PayrollV2Chrome'

export function PayrollAnalyticsModule() {
  return (
    <div className="space-y-4">
      <PayrollV2Tabs />
      <PayrollAnalytics />
    </div>
  )
}
