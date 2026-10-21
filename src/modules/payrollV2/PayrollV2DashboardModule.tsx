import { PayrollV2Dashboard } from '../../features/payrollV2/components/PayrollV2Dashboard'
import { PayrollV2Tabs } from '../../features/payrollV2/components/PayrollV2Chrome'

export function PayrollV2DashboardModule() {
  return (
    <div className="space-y-4">
      <PayrollV2Tabs />
      <PayrollV2Dashboard />
    </div>
  )
}
