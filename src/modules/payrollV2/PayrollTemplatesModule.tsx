import { PayrollTemplates } from '../../features/payrollV2/components/PayrollTemplates'
import { PayrollV2Tabs } from '../../features/payrollV2/components/PayrollV2Chrome'

export function PayrollTemplatesModule() {
  return (
    <div className="space-y-4">
      <PayrollV2Tabs />
      <PayrollTemplates />
    </div>
  )
}
