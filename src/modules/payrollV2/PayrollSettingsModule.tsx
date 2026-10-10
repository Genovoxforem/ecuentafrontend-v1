import { PayrollSettings } from '../../features/payrollV2/components/PayrollSettings'
import { PayrollV2Tabs } from '../../features/payrollV2/components/PayrollV2Chrome'

export function PayrollSettingsModule() {
  return (
    <div className="space-y-4">
      <PayrollV2Tabs />
      <PayrollSettings />
    </div>
  )
}
